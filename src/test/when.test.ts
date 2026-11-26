import { describe, it, expect } from "vitest";
import { isOver, nepalNow } from "@/lib/when";
describe("when", () => {
  const now = nepalNow(new Date("2026-11-26T14:20:00Z")); // 20:05 Nepal
  it("nepal time", () => expect(now).toEqual({ date: "2026-11-26", time: "20:05:00" }));
  it("today ended", () => expect(isOver({ event_date: "2026-11-26", end_time: "13:00:00" }, now)).toBe(true));
  it("today later", () => expect(isOver({ event_date: "2026-11-26", end_time: "21:00" }, now)).toBe(false));
  it("today no end", () => expect(isOver({ event_date: "2026-11-26" }, now)).toBe(false));
  it("multi-day", () => expect(isOver({ event_date: "2026-11-25", end_date: "2026-11-27" }, now)).toBe(false));
  it("past", () => expect(isOver({ event_date: "2026-11-16" }, now)).toBe(true));
});
