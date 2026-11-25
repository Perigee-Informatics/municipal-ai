type Sess = { id: string; session_date: string; start_time: string; end_time: string };

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
const local = (d: string, t: string) => `${d.replace(/-/g, "")}T${t.slice(0, 5).replace(":", "")}00`;

/** Builds an .ics file (one VEVENT per session, in the request's timezone) and triggers a download. */
export function downloadIcs(r: { id: string; event_title: string; organization: string; timezone: string; venue_name?: string | null; city?: string | null; country?: string | null; online_link?: string | null; basis: string }, sessions: Sess[], roleName?: string) {
  const loc = [r.venue_name, r.city, r.country].filter(Boolean).join(", ") || r.online_link || "";
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const events = sessions.map((s) =>
    [
      "BEGIN:VEVENT",
      `UID:${s.id}@ghimire-portal`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${r.timezone}:${local(s.session_date, s.start_time)}`,
      `DTEND;TZID=${r.timezone}:${local(s.session_date, s.end_time)}`,
      `SUMMARY:${esc(r.event_title)}`,
      `LOCATION:${esc(loc)}`,
      `DESCRIPTION:${esc(`${r.organization}${roleName ? ` — ${roleName}` : ""} (${r.basis === "paid" ? "Paid" : "Volunteer"})`)}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    ].join("\r\n"),
  );
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ghimire Portal//EN", ...events, "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = `${r.event_title.replace(/[^\w]+/g, "-").slice(0, 40)}.ics`;
  a.click();
}
