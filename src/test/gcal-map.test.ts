import { describe, expect, it } from "vitest";
import { FOOTER_MARK, fromGoogle, toGoogle, type EngagementFields } from "@/lib/gcal-map";
import { findConflicts, type Req } from "@/lib/admin-data";

const base: EngagementFields = {
  id: "s1", title: "Keynote", organizer: "NOU", description: "Talk on GIS", event_date: "2026-12-01", end_date: null,
  start_time: null, end_time: null, venue_mode: "in_person", venue_name: "Hall A", city: "Kathmandu", country: "Nepal", online_link: null, role: "Speaker",
};

describe("toGoogle / fromGoogle", () => {
  it("all-day, several days: end date is exclusive in Google and restored on read", () => {
    const g = toGoogle({ ...base, end_date: "2026-12-03" });
    expect(g.start).toEqual({ date: "2026-12-01" });
    expect(g.end).toEqual({ date: "2026-12-04" });
    expect(g.location).toBe("Hall A, Kathmandu, Nepal");
    const back = fromGoogle({ id: "x", ...g });
    expect(back).toMatchObject({ title: "Keynote", description: "Talk on GIS", event_date: "2026-12-01", end_date: "2026-12-03", start_time: null });
  });

  it("timed: keeps Kathmandu local time through an offset timestamp", () => {
    const g = toGoogle({ ...base, start_time: "10:00:00", end_time: "12:30:00" });
    expect(g.start).toEqual({ dateTime: "2026-12-01T10:00:00", timeZone: "Asia/Kathmandu" });
    const back = fromGoogle({ id: "x", start: { dateTime: "2026-12-01T04:15:00Z" }, end: { dateTime: "2026-12-01T06:45:00Z" } });
    expect(back).toMatchObject({ event_date: "2026-12-01", start_time: "10:00:00", end_time: "12:30:00", end_date: null });
  });

  it("strips the Hub footer when reading a description back", () => {
    const g = toGoogle(base);
    expect(g.description).toContain(FOOTER_MARK);
    expect(fromGoogle({ id: "x", description: g.description, start: { date: "2026-12-01" }, end: { date: "2026-12-02" } }).description).toBe("Talk on GIS");
  });
});

describe("findConflicts", () => {
  const req = { id: "r1", request_sessions: [{ session_date: "2026-12-02", start_time: "10:00:00", end_time: "11:00:00" }] } as unknown as Req;
  it("all-day multi-day engagement clashes with any time on a covered day", () => {
    expect(findConflicts(req, [{ id: "a", title: "Conf", event_date: "2026-12-01", end_date: "2026-12-03", start_time: null, end_time: null }])).toHaveLength(1);
  });
  it("timed engagement clashes only when the hours overlap", () => {
    const at = (s: string, e: string) => [{ id: "b", title: "x", event_date: "2026-12-02", end_date: null, start_time: s, end_time: e }];
    expect(findConflicts(req, at("11:00:00", "12:00:00"))).toHaveLength(0);
    expect(findConflicts(req, at("10:30:00", "12:00:00"))).toHaveLength(1);
  });
});
