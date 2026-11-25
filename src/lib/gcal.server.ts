// Server-only Google Calendar helpers. Uses GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET secrets
// and the refresh token stored in the private google_calendar_auth table.
import { createHmac } from "crypto";
import { fromGoogle, locationOf, toGoogle, TZ, type EngagementFields, type GoogleEvent } from "./gcal-map";

export const gcalConfigured = () => !!process.env["GOOGLE_CLIENT_ID"] && !!process.env["GOOGLE_CLIENT_SECRET"];

export function signState(userId: string) {
  const sig = createHmac("sha256", process.env["GOOGLE_CLIENT_SECRET"]!).update(userId).digest("hex").slice(0, 32);
  return `${userId}.${sig}`;
}
export function verifyState(state: string) {
  const [uid, sig] = state.split(".");
  if (!uid || !sig) return null;
  return signState(uid) === state ? uid : null;
}

export function redirectUri(origin: string) {
  return `${origin}/api/public/google/callback`;
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

type Auth = { token: string; calendarId: string };

/** Fresh access token plus the calendar engagements sync with (the Engagements calendar unless "use main" is set). */
async function accessToken(): Promise<Auth | null> {
  if (!gcalConfigured()) return null;
  const sb = await admin();
  const { data } = await sb.from("google_calendar_auth").select("refresh_token, use_main, engagements_calendar_id").eq("id", 1).maybeSingle();
  if (!data?.refresh_token) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env["GOOGLE_CLIENT_ID"]!,
      client_secret: process.env["GOOGLE_CLIENT_SECRET"]!,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    console.error(`Google token refresh failed [${res.status}]: ${await res.text()}`);
    return null;
  }
  const j = (await res.json()) as { access_token: string };
  let calendarId = data.use_main ? "primary" : data.engagements_calendar_id;
  if (!calendarId) calendarId = await createEngagementsCalendar(j.access_token);
  return { token: j.access_token, calendarId };
}

/** Creates the separate "Engagements" calendar in the connected account (once) and remembers it. */
async function createEngagementsCalendar(token: string) {
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ summary: "Engagements", description: "Synced with Dr. Ghimire's Hub (Events and Story Map).", timeZone: TZ }),
  });
  if (!res.ok) throw new Error(`Could not create the Engagements calendar [${res.status}]: ${await res.text()}`);
  const cal = (await res.json()) as { id: string };
  const sb = await admin();
  await sb.from("google_calendar_auth").update({ engagements_calendar_id: cal.id, sync_token: null }).eq("id", 1);
  return cal.id;
}

const eventsUrl = (a: Auth, id?: string) =>
  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(a.calendarId)}/events${id ? `/${encodeURIComponent(id)}` : ""}`;

const STORY_COLS =
  "id, title, organizer, description, event_date, end_date, start_time, end_time, venue_mode, venue_name, city, country, online_link, google_event_id, google_sync, google_synced_at, updated_at, source, event_types(name), roles(name)";
type StoryRow = EngagementFields & {
  google_event_id: string | null; google_sync: boolean; google_synced_at: string | null; updated_at: string; source: string;
  event_types: { name: string } | null; roles: { name: string } | null;
};

/** Local edits not yet in Google (10 s slack for the updated_at trigger on our own writes). */
const isDirty = (s: Pick<StoryRow, "updated_at" | "google_synced_at" | "google_event_id">) =>
  !s.google_event_id || !s.google_synced_at || Date.parse(s.updated_at) > Date.parse(s.google_synced_at) + 10_000;

async function pushRow(a: Auth, s: StoryRow) {
  const sb = await admin();
  const body = JSON.stringify(toGoogle({ ...s, role: s.roles?.name ?? null, event_type: s.event_types?.name ?? null }));
  const headers = { Authorization: `Bearer ${a.token}`, "Content-Type": "application/json" };
  let res = s.google_event_id ? await fetch(eventsUrl(a, s.google_event_id), { method: "PUT", headers, body }) : null;
  if (!res || res.status === 404 || res.status === 410) res = await fetch(eventsUrl(a), { method: "POST", headers, body });
  if (!res.ok) {
    console.error(`Google event save failed [${res.status}]: ${await res.text()}`);
    return false;
  }
  const ev = (await res.json()) as GoogleEvent;
  await sb.from("stories").update({ google_event_id: ev.id, google_synced_at: new Date().toISOString() }).eq("id", s.id);
  return true;
}

/** Creates or updates the Google event for one engagement. Null when Google is not connected. */
export async function pushStory(id: string) {
  const a = await accessToken();
  if (!a) return null;
  const sb = await admin();
  const { data } = await sb.from("stories").select(STORY_COLS).eq("id", id).maybeSingle();
  if (!data || !data.google_sync) return false;
  return pushRow(a, data as unknown as StoryRow);
}

/** Deletes a Google event (used before an engagement is deleted on the site). */
export async function deleteGoogleEvent(googleEventId: string) {
  const a = await accessToken();
  if (!a) return null;
  const res = await fetch(eventsUrl(a, googleEventId), { method: "DELETE", headers: { Authorization: `Bearer ${a.token}` } });
  if (!res.ok && res.status !== 404 && res.status !== 410) console.error(`Google delete failed [${res.status}]: ${await res.text()}`);
  return true;
}

/**
 * Reads what changed in Google since the last run (incremental sync token) and applies it:
 * new Google events become private engagements, edited ones update their engagement, deleted ones
 * delete it (or, when it has photos, keep it and stop syncing it). Site edits that have not reached
 * Google yet win and are pushed afterwards.
 */
async function pull(a: Auth) {
  const sb = await admin();
  const { data: st } = await sb.from("google_calendar_auth").select("sync_token, use_main").eq("id", 1).single();
  let token = st?.sync_token ?? null;
  const full = !token;
  const items: GoogleEvent[] = [];
  let next: string | undefined;
  let nextSync: string | undefined;
  for (let page = 0; page < 20; page++) {
    const q = new URLSearchParams({ singleEvents: "true", showDeleted: "true", maxResults: "250" });
    if (token) q.set("syncToken", token);
    if (next) q.set("pageToken", next);
    const res = await fetch(`${eventsUrl(a)}?${q}`, { headers: { Authorization: `Bearer ${a.token}` } });
    if (res.status === 410 && token) {
      // Token expired: start over with a full read.
      token = null; next = undefined; items.length = 0; page = -1;
      continue;
    }
    if (!res.ok) throw new Error(`Google read failed [${res.status}]: ${await res.text()}`);
    const j = (await res.json()) as { items?: GoogleEvent[]; nextPageToken?: string; nextSyncToken?: string };
    items.push(...(j.items ?? []));
    next = j.nextPageToken;
    nextSync = j.nextSyncToken;
    if (!next) break;
  }
  // On the main calendar only bring in events from the last 30 days onward, not years of history.
  const since = st?.use_main ? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10) : "0000";
  let added = 0, updated = 0, removed = 0;
  for (const ev of items) {
    const hubId = ev.extendedProperties?.private?.["hubStoryId"];
    const { data: byEvent } = await sb.from("stories").select("id, updated_at, google_synced_at, google_event_id, source, story_media!story_media_story_id_fkey(id)").eq("google_event_id", ev.id).maybeSingle();
    const story = byEvent ?? (hubId ? (await sb.from("stories").select("id, updated_at, google_synced_at, google_event_id, source, story_media!story_media_story_id_fkey(id)").eq("id", hubId).maybeSingle()).data : null);
    if (ev.status === "cancelled") {
      if (!story || story.google_event_id !== ev.id) continue;
      if (story.source === "google" && story.story_media.length === 0) await sb.from("stories").delete().eq("id", story.id);
      else await sb.from("stories").update({ google_event_id: null, google_synced_at: null, google_sync: false }).eq("id", story.id);
      removed++;
      continue;
    }
    if (!story && hubId) {
      // Made by the Hub, but the engagement was deleted here: remove the leftover Google copy.
      await fetch(eventsUrl(a, ev.id), { method: "DELETE", headers: { Authorization: `Bearer ${a.token}` } });
      continue;
    }
    const g = fromGoogle(ev);
    if (story) {
      if (isDirty(story) && story.google_event_id === ev.id) continue; // site edit wins; pushed below
      if (story.google_synced_at && ev.updated && Date.parse(ev.updated) <= Date.parse(story.google_synced_at)) continue;
      const { data: cur } = await sb.from("stories").select("venue_name, city, country, online_link").eq("id", story.id).single();
      const moved = cur && g.location && g.location !== locationOf(cur);
      await sb.from("stories").update({
        title: g.title, description: g.description, event_date: g.event_date, end_date: g.end_date, start_time: g.start_time, end_time: g.end_time,
        ...(moved ? { venue_name: g.location, location_needs_review: true } : {}),
        google_event_id: ev.id, google_synced_at: new Date().toISOString(),
      }).eq("id", story.id);
      updated++;
    } else {
      if ((g.end_date ?? g.event_date) < since) continue;
      await sb.from("stories").insert({
        title: g.title, description: g.description, event_date: g.event_date, end_date: g.end_date, start_time: g.start_time, end_time: g.end_time,
        venue_name: g.location || null, is_public: false, location_needs_review: true, latitude: null, longitude: null,
        source: "google", google_event_id: ev.id, google_synced_at: new Date().toISOString(),
      });
      added++;
    }
  }
  await sb.from("google_calendar_auth").update({ sync_token: nextSync ?? token, last_pulled_at: new Date().toISOString() }).eq("id", 1);
  return { added, updated, removed, full };
}

/** Pushes engagements that are new or edited on the site. At most `limit` per run; the rest go next time. */
async function pushPending(a: Auth, limit = 60) {
  const sb = await admin();
  const { data } = await sb.from("stories").select(STORY_COLS).eq("google_sync", true).order("event_date", { ascending: false });
  const todo = ((data ?? []) as unknown as StoryRow[]).filter(isDirty);
  let pushed = 0;
  for (const s of todo.slice(0, limit)) if (await pushRow(a, s)) pushed++;
  return { pushed, waiting: Math.max(0, todo.length - limit) };
}

/** Full two-way sync: read Google changes, then send site changes. Null when not connected. */
export async function syncAll(origin?: string) {
  const a = await accessToken();
  if (!a) return null;
  const p = await pull(a);
  const q = await pushPending(a);
  if (origin) await ensureWatch(a, origin).catch((e) => console.error("Google watch failed", e));
  return { ...p, ...q };
}

/** Runs syncAll when the last read is older than `maxAgeMs`. */
export async function syncIfStale(maxAgeMs: number, origin?: string) {
  const sb = await admin();
  const { data } = await sb.from("google_calendar_auth").select("refresh_token, last_pulled_at").eq("id", 1).maybeSingle();
  if (!data?.refresh_token) return null;
  if (data.last_pulled_at && Date.now() - Date.parse(data.last_pulled_at) < maxAgeMs) return { skipped: true };
  return syncAll(origin);
}

export const watchToken = () => createHmac("sha256", process.env["GOOGLE_CLIENT_SECRET"]!).update("gcal-watch").digest("hex").slice(0, 40);

/**
 * Asks Google to call /api/public/google/webhook whenever the calendar changes, so edits made in
 * Google show up on the site within seconds. Google channels last up to 7 days; this renews them.
 */
async function ensureWatch(a: Auth, origin: string) {
  if (!origin.startsWith("https://")) return;
  const sb = await admin();
  const { data } = await sb.from("google_calendar_auth").select("watch_channel_id, watch_resource_id, watch_expires_at").eq("id", 1).single();
  if (data?.watch_expires_at && Date.parse(data.watch_expires_at) - Date.now() > 86_400_000) return;
  await stopWatch(a.token, data);
  const id = crypto.randomUUID();
  const res = await fetch(`${eventsUrl(a)}/watch`, {
    method: "POST",
    headers: { Authorization: `Bearer ${a.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id, type: "web_hook", address: `${origin}/api/public/google/webhook`, token: watchToken(), params: { ttl: "604800" } }),
  });
  if (!res.ok) throw new Error(`[${res.status}] ${await res.text()}`);
  const j = (await res.json()) as { resourceId: string; expiration?: string };
  await sb.from("google_calendar_auth").update({
    watch_channel_id: id, watch_resource_id: j.resourceId,
    watch_expires_at: new Date(j.expiration ? Number(j.expiration) : Date.now() + 6 * 86_400_000).toISOString(),
  }).eq("id", 1);
}

async function stopWatch(token: string, w: { watch_channel_id: string | null; watch_resource_id: string | null } | null) {
  if (!w?.watch_channel_id || !w.watch_resource_id) return;
  await fetch("https://www.googleapis.com/calendar/v3/channels/stop", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id: w.watch_channel_id, resourceId: w.watch_resource_id }),
  }).catch(() => undefined);
}

/** Switches between the Engagements calendar and the main calendar. Links are reset and everything is sent again. */
export async function chooseCalendar(useMain: boolean) {
  const sb = await admin();
  const a = await accessToken();
  const { data } = await sb.from("google_calendar_auth").select("watch_channel_id, watch_resource_id").eq("id", 1).maybeSingle();
  if (a) await stopWatch(a.token, data ?? null);
  await sb.from("google_calendar_auth").update({ use_main: useMain, sync_token: null, watch_channel_id: null, watch_resource_id: null, watch_expires_at: null }).eq("id", 1);
  await sb.from("stories").update({ google_event_id: null, google_synced_at: null }).not("google_event_id", "is", null);
}

/** Forgets sync state when Google is disconnected; engagements stay as they are. */
export async function forgetGoogle() {
  const sb = await admin();
  const a = await accessToken().catch(() => null);
  const { data } = await sb.from("google_calendar_auth").select("watch_channel_id, watch_resource_id").eq("id", 1).maybeSingle();
  if (a) await stopWatch(a.token, data ?? null);
  await sb.from("google_calendar_auth").delete().eq("id", 1);
  await sb.from("stories").update({ google_event_id: null, google_synced_at: null }).not("google_event_id", "is", null);
}

const HOLIDAY_CAL = "en.np#holiday@group.v.calendar.google.com";

/** Reads Google's public "Holidays in Nepal" calendar with the connected account. Null when not connected. */
export async function listNepalHolidays(from: string, to: string) {
  const auth = await accessToken();
  if (!auth) return null;
  const q = new URLSearchParams({ timeMin: `${from}T00:00:00Z`, timeMax: `${to}T23:59:59Z`, singleEvents: "true", maxResults: "250", orderBy: "startTime" });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(HOLIDAY_CAL)}/events?${q}`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });
  if (!res.ok) {
    console.error(`Nepal holidays fetch failed [${res.status}]: ${await res.text()}`);
    return null;
  }
  const j = (await res.json()) as { items?: { summary?: string; description?: string; start?: { date?: string } }[] };
  return (j.items ?? [])
    .filter((e) => e.start?.date && e.summary)
    .map((e) => ({ date: e.start!.date!, name: e.summary!, p: (e.description ?? "").startsWith("Public holiday") }));
}
