import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: import("@supabase/supabase-js").SupabaseClient; userId: string };
async function assertAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

/** Downloads a remote image/video server-side and attaches it to a story. */
export const importMediaFromUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ storyId: z.string().uuid(), url: z.string().url().max(4000), caption: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const sb = context.supabase;
    const { data: dup } = await sb.from("story_media").select("id").eq("story_id", data.storyId).eq("source_url", data.url).maybeSingle();
    if (dup) return { ok: true, skipped: true };
    const res = await fetch(data.url);
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/") && !type.startsWith("video/")) throw new Error(`Not an image or video (${type})`);
    const isVideo = type.startsWith("video/");
    const { data: last } = await sb.from("story_media").select("sort_order").eq("story_id", data.storyId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const n = (last?.sort_order ?? 0) + 1;
    const path = `stories/${data.storyId}/${n}-${Date.now()}.${isVideo ? "mp4" : "jpg"}`;
    const { error: upErr } = await sb.storage.from("story-media").upload(path, await res.arrayBuffer(), { contentType: type });
    if (upErr) throw new Error(upErr.message);
    const { error } = await sb.from("story_media").insert({ story_id: data.storyId, storage_path: path, media_type: isVideo ? "video" : "image", sort_order: n, source_url: data.url, caption: data.caption ?? null });
    if (error) throw new Error(error.message);
    return { ok: true, skipped: false };
  });

export const getImportInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("app_secrets").select("value").eq("key", "import_token").maybeSingle();
    return { token: data?.value ?? "" };
  });

export const getGcalStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { gcalConfigured } = await import("./gcal.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("google_calendar_auth").select("refresh_token, connected_email, use_main, last_pulled_at").eq("id", 1).maybeSingle();
    const { count } = await supabaseAdmin.from("stories").select("id", { count: "exact", head: true }).not("google_event_id", "is", null);
    return {
      configured: gcalConfigured(), connected: !!data?.refresh_token, email: data?.connected_email ?? null,
      useMain: data?.use_main ?? false, lastSync: data?.last_pulled_at ?? null, linked: count ?? 0,
    };
  });

export const getGcalAuthUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { gcalConfigured, signState, redirectUri } = await import("./gcal.server");
    if (!gcalConfigured()) throw new Error("Google credentials are not configured yet");
    const origin = new URL(getRequest().url).origin;
    const p = new URLSearchParams({
      client_id: process.env["GOOGLE_CLIENT_ID"]!,
      redirect_uri: redirectUri(origin),
      response_type: "code",
      // calendar.events: read/write events (and read Nepal holidays); calendar.app.created: create the Engagements calendar.
      scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.app.created openid email",
      access_type: "offline",
      prompt: "consent",
      state: signState(context.userId),
    });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${p}` };
  });

export const disconnectGcal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { forgetGoogle } = await import("./gcal.server");
    await forgetGoogle();
    return { ok: true };
  });

/** Two-way sync now (Settings button). */
export const syncGoogleNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { syncAll } = await import("./gcal.server");
    return syncAll(new URL(getRequest().url).origin);
  });

/** Quiet background sync when admin pages open; skipped if the last one ran in the past 2 minutes. */
export const syncGoogleIfStale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { syncIfStale } = await import("./gcal.server");
    try {
      return await syncIfStale(2 * 60_000, new URL(getRequest().url).origin);
    } catch (e) {
      console.error("background Google sync failed", e);
      return null;
    }
  });

export const chooseGcalCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ useMain: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { chooseCalendar, syncAll } = await import("./gcal.server");
    await chooseCalendar(data.useMain);
    return syncAll(new URL(getRequest().url).origin);
  });

/** Sends one engagement to Google after it is created or edited on the site. */
export const pushEngagement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { pushStory } = await import("./gcal.server");
    try {
      return { synced: await pushStory(data.id) };
    } catch (e) {
      console.error("Google push failed", e);
      return { synced: false };
    }
  });

/** Removes an engagement's Google event. Call before deleting the engagement on the site. */
export const removeEngagementFromGoogle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { data: s } = await context.supabase.from("stories").select("google_event_id").eq("id", data.id).maybeSingle();
    if (!s?.google_event_id) return { removed: false };
    const { deleteGoogleEvent } = await import("./gcal.server");
    try {
      return { removed: !!(await deleteGoogleEvent(s.google_event_id)) };
    } catch (e) {
      console.error("Google delete failed", e);
      return { removed: false };
    }
  });
