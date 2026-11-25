import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { holidaysQuery } from "@/lib/holidays";
import { useI18n } from "@/lib/i18n";
import { BS_MONTHS_EN, BS_MONTHS_NE, bsMonthSpan, digits, toBs } from "@/lib/nepali-date";

export type CalItem = { id: string; date: string; label: string; sub?: string; tone?: "accent" | "navy" | "warning" };

const toneCls = {
  accent: "bg-accent/20 text-foreground border-l-2 border-accent",
  navy: "bg-primary text-primary-foreground",
  warning: "bg-warning/25 text-foreground border-l-2 border-warning",
};

const dotCls = { accent: "bg-accent", navy: "bg-primary", warning: "bg-warning" };

const WEEK_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEK_NE = ["आइत", "सोम", "मंगल", "बुध", "बिहि", "शुक्र", "शनि"];

/**
 * Month grid showing both the Gregorian (AD) and Bikram Sambat (BS) date in every cell.
 * Optional: `selected`/`onDayClick` to pick a date, `onAdd` to show a + button on each date.
 */
export function MonthCalendar({
  month, onMonth, items, onSelect, selected, onDayClick, onAdd,
}: {
  month: Date;
  onMonth: (d: Date) => void;
  items: CalItem[];
  onSelect?: (id: string) => void;
  selected?: string | null;
  onDayClick?: (date: string) => void;
  onAdd?: (date: string) => void;
}) {
  const { lang } = useI18n();
  const ne = lang === "ne";
  const start = startOfWeek(startOfMonth(month));
  const end = endOfWeek(endOfMonth(month));
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const byDate = new Map<string, CalItem[]>();
  items.forEach((i) => byDate.set(i.date, [...(byDate.get(i.date) ?? []), i]));
  const bsSpan = bsMonthSpan(startOfMonth(month), endOfMonth(month), true);
  const bsNames = ne ? BS_MONTHS_NE : BS_MONTHS_EN;

  // Nepal holidays for every year the grid touches (a grid can span Dec–Jan).
  const { data: hA = [] } = useQuery(holidaysQuery(start.getFullYear()));
  const { data: hB = [] } = useQuery({ ...holidaysQuery(end.getFullYear()), enabled: end.getFullYear() !== start.getFullYear() });
  const holidays = new Map<string, { name: string; p: boolean }[]>();
  [...hA, ...(end.getFullYear() !== start.getFullYear() ? hB : [])].forEach((h) => holidays.set(h.date, [...(holidays.get(h.date) ?? []), h]));

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="relative overflow-hidden bg-hero px-4 py-4 text-navy-foreground sm:px-6 sm:py-5">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-semibold tracking-tight sm:text-3xl">{format(month, "MMMM yyyy")}</h3>
            {bsSpan && <p className="mt-1 font-[family-name:var(--font-display)] text-base text-accent">{bsSpan} <span className="text-navy-foreground/60">वि.सं.</span></p>}
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="heroOutline" className="rounded-full" onClick={() => onMonth(addMonths(month, -1))} aria-label="Previous month"><ChevronLeft /></Button>
            <Button size="sm" variant="heroOutline" className="rounded-full" onClick={() => onMonth(new Date())}>{ne ? "आज" : "Today"}</Button>
            <Button size="icon" variant="heroOutline" className="rounded-full" onClick={() => onMonth(addMonths(month, 1))} aria-label="Next month"><ChevronRight /></Button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-border bg-secondary/60 text-center text-[11px] font-semibold uppercase tracking-wider">
        {(ne ? WEEK_NE : WEEK_EN).map((d, i) => <div key={d} className={`py-2.5 ${i === 6 ? "text-destructive" : "text-muted-foreground"}`}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const evs = [...(byDate.get(key) ?? [])].sort((x, y) => (x.sub ?? "").localeCompare(y.sub ?? ""));
          const bs = toBs(d);
          const hol = holidays.get(key) ?? [];
          const publicHol = hol.filter((h) => h.p);
          const isRed = d.getDay() === 6 || publicHol.length > 0;
          const inMonth = isSameMonth(d, month);
          const isSel = selected === key;
          const today = isToday(d);
          return (
            <div
              key={key}
              onClick={onDayClick ? () => onDayClick(key) : undefined}
              title={hol.map((h) => h.name).join(" · ") || undefined}
              className={`group relative min-h-[4.25rem] border-b border-r border-border p-1 text-xs transition-colors sm:min-h-28 sm:p-2 ${inMonth ? (publicHol.length ? "bg-destructive/[0.06]" : "") : "bg-muted/50 opacity-60"} ${onDayClick ? "cursor-pointer hover:bg-accent/10" : ""} ${isSel ? "z-10 bg-accent/10 ring-2 ring-inset ring-accent" : ""}`}
            >
              <div className="flex items-start justify-between gap-1">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-display text-base font-semibold leading-none sm:h-8 sm:w-8 sm:text-lg ${today ? "bg-accent text-accent-foreground shadow" : isRed ? "text-destructive" : "text-foreground"}`}>{format(d, "d")}</span>
                {bs && (
                  <span className={`pt-1 text-right font-[family-name:var(--font-display)] text-[11px] leading-none sm:text-[13px] ${isRed ? "text-destructive/80" : "text-muted-foreground"}`} title={`${bs.day} ${bsNames[bs.month - 1]} ${bs.year}`}>
                    {bs.day === 1 && <span className="mb-0.5 hidden text-[10px] font-semibold text-accent sm:block">{BS_MONTHS_NE[bs.month - 1]}</span>}
                    {digits(bs.day, true)}
                  </span>
                )}
              </div>
              {hol.length > 0 && (
                <div className={`mt-1 hidden truncate text-[11px] font-medium leading-tight sm:block ${publicHol.length ? "text-destructive" : "text-muted-foreground italic"}`}>
                  {(publicHol[0] ?? hol[0])!.name}
                </div>
              )}
              {onAdd && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onAdd(key); }}
                  className={`absolute bottom-1 right-1 h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow transition-opacity sm:flex sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 ${isSel ? "flex sm:opacity-100" : "hidden"}`}
                  aria-label={`Add event on ${key}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
              {(evs.length > 0 || hol.length > 0) && (
                <div className="mt-1 flex flex-wrap items-center gap-1 sm:hidden" aria-hidden>
                  {evs.slice(0, 3).map((e, i) => <span key={i} className={`h-2 w-2 rounded-full ${dotCls[e.tone ?? "accent"]}`} />)}
                  {evs.length > 3 && <span className="text-[10px] font-semibold leading-none text-muted-foreground">+{evs.length - 3}</span>}
                  {hol.length > 0 && evs.length === 0 && <span className={`h-1.5 w-1.5 rounded-full ${publicHol.length ? "bg-destructive" : "bg-muted-foreground/50"}`} />}
                </div>
              )}
              <div className="mt-1 hidden space-y-1 sm:block">
                {evs.slice(0, 2).map((e) => (
                  <button
                    key={e.id + e.label + (e.sub ?? "")}
                    onClick={(ev) => { if (onSelect) { ev.stopPropagation(); onSelect(e.id); } }}
                    className={`block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium ${toneCls[e.tone ?? "accent"]}`}
                    title={`${e.label} ${e.sub ?? ""}`}
                  >
                    {e.sub && <span className="hidden opacity-70 sm:inline">{e.sub} </span>}{e.label}
                  </button>
                ))}
                {evs.length > 2 && <div className="text-[11px] font-medium text-muted-foreground">+{evs.length - 2}</div>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-destructive" />{ne ? "सार्वजनिक बिदा / शनिबार" : "Public holiday / Saturday"}</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border-l-2 border-accent bg-accent/20" />{ne ? "कार्यक्रम" : "Event"}</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-accent" />{ne ? "आज" : "Today"}</span>
        <span className="flex items-center gap-1.5"><span className="font-[family-name:var(--font-display)] text-[13px]">१२</span>{ne ? "नेपाली मिति (वि.सं.)" : "Nepali date (BS)"}</span>
        {onDayClick && <span className="w-full sm:hidden">{ne ? "विवरण हेर्न मितिमा थिच्नुहोस्।" : "Tap a date to see its details."}</span>}
      </div>
    </div>
  );
}

export const hm = (t?: string | null) => (t ? t.slice(0, 5) : "");
/** "10:00–12:00", or "All day" when the engagement has no time. */
export const timeRange = (a?: string | null, b?: string | null, allDay = "All day") => (a ? `${hm(a)}${b ? `–${hm(b)}` : ""}` : allDay);
