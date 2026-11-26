/* When an engagement counts as over. Times are stored as Nepal local time, so "now" is taken in
 * Asia/Kathmandu whatever the viewer's own clock says. An event with an end time is over once that
 * time has passed on its last day; one without an end time is over once its last day has ended. */

export function nepalNow(at: Date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}:${get("second")}`,
  };
}

type Timed = {
  event_date: string;
  end_date?: string | null;
  end_time?: string | null;
};

export function isOver(e: Timed, now = nepalNow()): boolean {
  const last = e.end_date && e.end_date > e.event_date ? e.end_date : e.event_date;
  if (last !== now.date) return last < now.date;
  return !!e.end_time && e.end_time.slice(0, 8).padEnd(8, ":00") <= now.time;
}

const startKey = (e: { event_date: string; start_time?: string | null }) =>
  e.event_date + (e.start_time ?? "");

/** Upcoming soonest first; completed most recent first. */
export function splitByTime<T extends Timed & { start_time?: string | null }>(
  rows: T[],
  now = nepalNow(),
): { upcoming: T[]; completed: T[] } {
  const upcoming: T[] = [];
  const completed: T[] = [];
  for (const r of rows) (isOver(r, now) ? completed : upcoming).push(r);
  upcoming.sort((a, b) => startKey(a).localeCompare(startKey(b)));
  completed.sort((a, b) => startKey(b).localeCompare(startKey(a)));
  return { upcoming, completed };
}
