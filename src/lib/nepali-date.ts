/**
 * Gregorian (AD) → Bikram Sambat (BS) conversion for BS 2060–2090 (AD 2003-04-14 to ~2034-04).
 * Month lengths come from the MIT-licensed `nepali-date-converter` table, stored compactly:
 * each digit is a month length minus 28.
 */
const FIRST_BS_YEAR = 2060;
const ANCHOR_UTC = Date.UTC(2003, 3, 14); // 1 Baisakh 2060
const YEARS = [
  "334432212122", "343432221123", "243433121213", "334333212122", "334432212122", "343432221123", "333433122113", "334333212122",
  "334432212122", "343432221123", "333433122122", "334333212122", "343432212122", "343432221123", "333433212122", "334333212122",
  "343432221122", "343432221213", "333433212122", "334333212122", "343432221122", "343432221213", "334333212122", "334333212122",
  "334332221222", "343423221222", "243432221222", "334333221222", "234423221222", "243432221222", "243432221222",
];

export type BsDate = { year: number; month: number; day: number };

const DAY_MS = 86_400_000;

/** Converts a `yyyy-MM-dd` string or Date (local calendar day) to BS. Returns null outside the supported range. */
export function toBs(input: string | Date): BsDate | null {
  const [y, m, d] = typeof input === "string" ? input.split("-").map(Number) : [input.getFullYear(), input.getMonth() + 1, input.getDate()];
  let days = Math.round((Date.UTC(y!, m! - 1, d!) - ANCHOR_UTC) / DAY_MS);
  if (days < 0) return null;
  for (let yi = 0; yi < YEARS.length; yi++) {
    const months = YEARS[yi]!;
    for (let mi = 0; mi < 12; mi++) {
      const len = 28 + Number(months[mi]);
      if (days < len) return { year: FIRST_BS_YEAR + yi, month: mi + 1, day: days + 1 };
      days -= len;
    }
  }
  return null;
}

export const BS_MONTHS_EN = ["Baisakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Asoj", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
export const BS_MONTHS_NE = ["वैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कात्तिक", "मंसिर", "पुस", "माघ", "फागुन", "चैत"];
const NE_DIGITS = "०१२३४५६७८९";

/** Renders digits in Devanagari when `ne` is true. */
export function digits(n: number | string, ne: boolean) {
  const s = String(n);
  return ne ? s.replace(/\d/g, (c) => NE_DIGITS[Number(c)]!) : s;
}

/** e.g. "7 Mangsir 2083" or "मंसिर ७, २०८३". */
export function formatBs(input: string | Date, ne: boolean) {
  const bs = toBs(input);
  if (!bs) return "";
  return ne
    ? `${BS_MONTHS_NE[bs.month - 1]} ${digits(bs.day, true)}, ${digits(bs.year, true)}`
    : `${bs.day} ${BS_MONTHS_EN[bs.month - 1]} ${bs.year}`;
}

/** BS month span covered by a Gregorian month, e.g. "Kartik–Mangsir 2083". */
export function bsMonthSpan(first: Date, last: Date, ne: boolean) {
  const a = toBs(first);
  const b = toBs(last);
  if (!a || !b) return "";
  const names = ne ? BS_MONTHS_NE : BS_MONTHS_EN;
  const yr = (y: number) => digits(y, ne);
  if (a.year === b.year) return a.month === b.month ? `${names[a.month - 1]} ${yr(a.year)}` : `${names[a.month - 1]}–${names[b.month - 1]} ${yr(a.year)}`;
  return `${names[a.month - 1]} ${yr(a.year)} – ${names[b.month - 1]} ${yr(b.year)}`;
}
