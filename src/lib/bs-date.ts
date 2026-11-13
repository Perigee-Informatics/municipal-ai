/* Bikram Sambat dates for the app pages; the same table as public/workshop/event-info.js
 * (checked day by day against two published converters for 2020–2033; later years are projections). */

const DEV = "०१२३४५६७८९";
export const toNepaliDigits = (s: string | number): string =>
  String(s).replace(/[0-9]/g, (d) => DEV[Number(d)] ?? d);

const MONTHS = [
  "बैशाख",
  "जेठ",
  "असार",
  "साउन",
  "भदौ",
  "असोज",
  "कात्तिक",
  "मंसिर",
  "पुस",
  "माघ",
  "फागुन",
  "चैत",
];
const BS_START = 2080;
const AD_ANCHOR = Date.UTC(2023, 3, 14); // 2080/01/01 BS
const BS_DAYS: number[][] = [
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], // 2080
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2081
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2082
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2083
  [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30], // 2084
  [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30], // 2085
  [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], // 2086
  [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30], // 2087
  [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30], // 2088
  [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], // 2089
  [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], // 2090
];

export type BsDate = { y: number; m: number; d: number };

/* "2026-10-10" → { y: 2083, m: 6, d: 24 }, or null outside the table. */
export function toBS(iso: string): BsDate | null {
  const p = String(iso || "")
    .slice(0, 10)
    .split("-")
    .map(Number);
  if (p.length !== 3 || p.some((n) => Number.isNaN(n))) return null;
  let days = Math.round((Date.UTC(p[0]!, p[1]! - 1, p[2]!) - AD_ANCHOR) / 86400000);
  if (days < 0) return null;
  for (let yi = 0; yi < BS_DAYS.length; yi++) {
    for (let mi = 0; mi < 12; mi++) {
      const len = BS_DAYS[yi]![mi]!;
      if (days < len) return { y: BS_START + yi, m: mi + 1, d: days + 1 };
      days -= len;
    }
  }
  return null;
}

const full = (b: BsDate) => `${toNepaliDigits(b.y)} ${MONTHS[b.m - 1]} ${toNepaliDigits(b.d)}`;
const short = (b: BsDate) => `${MONTHS[b.m - 1]} ${toNepaliDigits(b.d)}`;

/* All dates of an event in one phrase: "२०८३ असोज २४ र २५", "२०८३ असोज ३० र कात्तिक १". */
export function bsRange(isoDates: readonly string[] | null | undefined): string {
  const list = [...(isoDates ?? [])]
    .sort()
    .map(toBS)
    .filter((b): b is BsDate => !!b);
  if (!list.length) return "";
  if (list.length === 1) return full(list[0]!);
  let prev = list[0]!;
  const rest = list.slice(1).map((b) => {
    const s = b.y !== prev.y ? full(b) : b.m !== prev.m ? short(b) : toNepaliDigits(b.d);
    prev = b;
    return s;
  });
  const tail =
    rest.length === 1
      ? ` र ${rest[0]}`
      : `, ${rest.slice(0, -1).join(", ")} र ${rest[rest.length - 1]}`;
  return full(list[0]!) + tail;
}
