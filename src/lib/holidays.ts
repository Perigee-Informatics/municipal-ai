import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { BUNDLED_HOLIDAYS, type Holiday } from "./nepal-holidays";

const cache = new Map<number, { at: number; list: Holiday[] }>();
const TTL = 12 * 60 * 60 * 1000;

/**
 * Nepal holidays for one year. Public, read-only. Uses the live Google "Holidays in Nepal" calendar
 * through the connected Google account when available (cached 12h), merged with the bundled list.
 */
export const getNepalHolidays = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ year: z.number().int().min(2000).max(2100) }).parse(d))
  .handler(async ({ data }) => {
    const hit = cache.get(data.year);
    if (hit && Date.now() - hit.at < TTL) return hit.list;
    const bundled = BUNDLED_HOLIDAYS.filter((h) => h.date.startsWith(String(data.year)));
    let live: Holiday[] | null = null;
    try {
      const { listNepalHolidays } = await import("./gcal.server");
      live = await listNepalHolidays(`${data.year}-01-01`, `${data.year}-12-31`);
    } catch (e) {
      console.error("holiday lookup failed", e);
    }
    const seen = new Set<string>();
    const list = [...(live ?? []), ...bundled].filter((h) => {
      const k = `${h.date}|${h.name}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    cache.set(data.year, { at: Date.now(), list });
    return list;
  });

export const holidaysQuery = (year: number) =>
  queryOptions({
    queryKey: ["nepal-holidays", year],
    queryFn: async () => {
      try {
        return await getNepalHolidays({ data: { year } });
      } catch {
        return BUNDLED_HOLIDAYS.filter((h) => h.date.startsWith(String(year)));
      }
    },
    staleTime: TTL,
  });
