/**
 * Pure mapping between an engagement (a `stories` row) and a Google Calendar event.
 * Kept free of server imports so it can be unit tested.
 */
export const TZ = "Asia/Kathmandu";
/** Everything after this line in a Google description is written by the Hub and ignored when reading back. */
export const FOOTER_MARK = "\n\n— Dr. Ghimire's Hub —";

export type EngagementFields = {
  id: string;
  title: string;
  organizer: string | null;
  description: string | null;
  event_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue_mode: string;
  venue_name: string | null;
  city: string | null;
  country: string | null;
  online_link: string | null;
  role?: string | null;
  event_type?: string | null;
};

export type GoogleEvent = {
  id: string;
  status?: string;
  updated?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  extendedProperties?: { private?: Record<string, string> };
};

const addDay = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const hms = (t: string) => (t.length === 5 ? `${t}:00` : t.slice(0, 8));

export function locationOf(e: Pick<EngagementFields, "venue_name" | "city" | "country" | "online_link">) {
  return [e.venue_name, e.city, e.country].filter(Boolean).join(", ") || e.online_link || "";
}

/** Body for an events insert/update call. All-day when start_time is empty. */
export function toGoogle(e: EngagementFields) {
  const last = e.end_date && e.end_date > e.event_date ? e.end_date : e.event_date;
  const footer = [
    e.organizer && `Organizer: ${e.organizer}`,
    e.event_type && `Type: ${e.event_type}`,
    e.role && `Role: ${e.role}`,
    e.online_link && `Link: ${e.online_link}`,
  ].filter(Boolean);
  let start: GoogleEvent["start"];
  let end: GoogleEvent["end"];
  if (e.start_time) {
    const st = hms(e.start_time);
    let et = e.end_time ? hms(e.end_time) : null;
    if (!et || (last === e.event_date && et <= st)) {
      const [h, m] = st.split(":").map(Number);
      et = `${String(Math.min(23, h! + 1)).padStart(2, "0")}:${String(h! >= 23 ? 59 : m!).padStart(2, "0")}:00`;
    }
    start = { dateTime: `${e.event_date}T${st}`, timeZone: TZ };
    end = { dateTime: `${last}T${et}`, timeZone: TZ };
  } else {
    start = { date: e.event_date };
    end = { date: addDay(last, 1) };
  }
  return {
    summary: e.title,
    description: (e.description ?? "") + (footer.length ? `${FOOTER_MARK}\n${footer.join("\n")}` : ""),
    location: locationOf(e),
    start,
    end,
    transparency: "opaque",
    extendedProperties: { private: { hubStoryId: e.id } },
  };
}

/** Local date and HH:MM:SS in Kathmandu for an RFC 3339 timestamp. */
export function localParts(dateTime: string) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(dateTime));
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return { date: `${g("year")}-${g("month")}-${g("day")}`, time: `${g("hour")}:${g("minute")}:${g("second")}` };
}

/** Fields read back from Google. Only fields a person edits in Google are returned. */
export function fromGoogle(ev: GoogleEvent) {
  const desc = ev.description ?? "";
  const cut = desc.indexOf(FOOTER_MARK);
  const description = (cut >= 0 ? desc.slice(0, cut) : desc).trim() || null;
  let event_date: string;
  let end_date: string | null;
  let start_time: string | null = null;
  let end_time: string | null = null;
  if (ev.start?.dateTime) {
    const s = localParts(ev.start.dateTime);
    const e = localParts(ev.end?.dateTime ?? ev.start.dateTime);
    event_date = s.date;
    start_time = s.time;
    end_time = e.time;
    end_date = e.date > s.date ? e.date : null;
  } else {
    event_date = ev.start?.date ?? new Date().toISOString().slice(0, 10);
    const lastDay = ev.end?.date ? addDay(ev.end.date, -1) : event_date;
    end_date = lastDay > event_date ? lastDay : null;
  }
  return { title: ev.summary?.trim() || "(untitled)", description, event_date, end_date, start_time, end_time, location: ev.location?.trim() ?? "" };
}
