import { describe, expect, it } from "vitest";
import { formatBs, toBs } from "@/lib/nepali-date";

describe("toBs", () => {
  it("matches known conversions", () => {
    expect(toBs("2003-04-14")).toEqual({ year: 2060, month: 1, day: 1 });
    expect(toBs("2013-04-14")).toEqual({ year: 2070, month: 1, day: 1 });
    expect(toBs("2026-04-14")).toEqual({ year: 2083, month: 1, day: 1 });
    expect(toBs("2026-11-23")).toEqual({ year: 2083, month: 8, day: 7 });
    expect(toBs("2034-01-01")).toEqual({ year: 2090, month: 9, day: 17 });
  });
  it("returns null outside the range", () => {
    expect(toBs("2003-04-13")).toBeNull();
    expect(toBs("2040-01-01")).toBeNull();
  });
  it("formats in both languages", () => {
    expect(formatBs("2026-11-23", false)).toBe("7 Mangsir 2083");
    expect(formatBs("2026-11-23", true)).toBe("मंसिर ७, २०८३");
  });
});
