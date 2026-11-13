import { describe, expect, it } from "vitest";

import { bsRange, toBS } from "@/lib/bs-date";

describe("Bikram Sambat dates", () => {
  it("converts known dates", () => {
    expect(toBS("2023-04-14")).toEqual({ y: 2080, m: 1, d: 1 });
    expect(toBS("2026-10-10")).toEqual({ y: 2083, m: 6, d: 24 });
    expect(toBS("2026-11-13")).toEqual({ y: 2083, m: 7, d: 27 });
    expect(toBS("2027-04-14")).toEqual({ y: 2084, m: 1, d: 1 });
    expect(toBS("2020-01-01")).toBeNull();
  });
  it("writes an event's dates as one phrase", () => {
    expect(bsRange(["2026-10-11", "2026-10-10"])).toBe("२०८३ असोज २४ र २५");
    expect(bsRange(["2026-10-16", "2026-10-17", "2026-10-18"])).toBe(
      "२०८३ असोज ३०, ३१ र कात्तिक १",
    );
    expect(bsRange([])).toBe("");
  });
});
