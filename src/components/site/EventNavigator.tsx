import { useEffect, useState } from "react";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { bsMonthSpan, digits } from "@/lib/nepali-date";

type NavEvent = { id: string; session_date: string; event_title: string };

/**
 * Date navigator: collapsible years → collapsible months → event days.
 * Clicking a month or a day moves the calendar there.
 */
export function EventNavigator({
  events, month, selected, onMonth, onPick,
}: {
  events: NavEvent[];
  month: Date;
  selected: string;
  onMonth: (d: Date) => void;
  onPick: (date: string) => void;
}) {
  const { lang } = useI18n();
  const ne = lang === "ne";
  const thisYear = new Date().getFullYear();
  const minYear = Math.min(thisYear, ...events.map((e) => Number(e.session_date.slice(0, 4))));
  const maxYear = Math.max(thisYear + 1, ...events.map((e) => Number(e.session_date.slice(0, 4))));
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  const [openYears, setOpenYears] = useState<Set<number>>(() => new Set([month.getFullYear()]));
  const [openMonths, setOpenMonths] = useState<Set<string>>(() => new Set([format(month, "yyyy-MM")]));
  // Keep the visible month unfolded when the calendar moves.
  useEffect(() => {
    setOpenYears((s) => new Set(s).add(month.getFullYear()));
    setOpenMonths((s) => new Set(s).add(format(month, "yyyy-MM")));
  }, [month]);

  const toggle = <T,>(set: Set<T>, v: T) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    return n;
  };
  const count = (prefix: string) => events.filter((e) => e.session_date.startsWith(prefix)).length;
  const curMonth = format(month, "yyyy-MM");

  return (
    <nav aria-label={ne ? "मिति नेभिगेटर" : "Date navigator"} className="rounded-3xl border border-border bg-card p-3 shadow-soft">
      <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{ne ? "वर्ष र महिना" : "Years & months"}</p>
      <ul className="max-h-[26rem] space-y-0.5 overflow-y-auto pr-1">
        {years.map((y) => {
          const yOpen = openYears.has(y);
          const yc = count(String(y));
          return (
            <li key={y}>
              <button
                type="button"
                onClick={() => setOpenYears((s) => toggle(s, y))}
                aria-expanded={yOpen}
                className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors hover:bg-secondary ${y === month.getFullYear() ? "font-semibold" : ""}`}
              >
                <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${yOpen ? "rotate-90" : ""}`} />
                <span className="font-display text-lg">{y}</span>
                <span className="text-xs text-muted-foreground">{bsMonthSpan(new Date(y, 0, 1), new Date(y, 11, 31), true).replace(/^.* (\S+) – .* (\S+)$/, "$1–$2")}</span>
                {yc > 0 && <span className="ml-auto rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-semibold">{digits(yc, ne)}</span>}
              </button>
              {yOpen && (
                <ul className="ml-4 border-l border-border pl-2">
                  {Array.from({ length: 12 }, (_, m) => {
                    const key = `${y}-${String(m + 1).padStart(2, "0")}`;
                    const first = new Date(y, m, 1);
                    const mOpen = openMonths.has(key);
                    const list = events.filter((e) => e.session_date.startsWith(key));
                    const isCur = key === curMonth;
                    return (
                      <li key={key}>
                        <div className={`flex items-center rounded-lg ${isCur ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                          <button
                            type="button"
                            onClick={() => setOpenMonths((s) => toggle(s, key))}
                            aria-expanded={mOpen}
                            aria-label={mOpen ? "Collapse month" : "Expand month"}
                            className="p-1.5"
                            disabled={list.length === 0}
                          >
                            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${mOpen && list.length ? "rotate-90" : ""} ${list.length ? "" : "opacity-20"}`} />
                          </button>
                          <button type="button" onClick={() => onMonth(first)} className="flex min-w-0 flex-1 items-baseline gap-2 py-1.5 pr-2 text-left text-sm">
                            <span className="w-20 shrink-0 font-medium">{format(first, "MMMM")}</span>
                            <span className={`truncate font-[family-name:var(--font-display)] text-xs ${isCur ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {bsMonthSpan(startOfMonth(first), endOfMonth(first), true).replace(/ ?[०-९]+/g, "")}
                            </span>
                            {list.length > 0 && <span className={`ml-auto rounded-full px-1.5 text-[11px] font-semibold ${isCur ? "bg-accent text-accent-foreground" : "bg-accent/20"}`}>{digits(list.length, ne)}</span>}
                          </button>
                        </div>
                        {mOpen && list.length > 0 && (
                          <ul className="mb-1 ml-5 space-y-0.5 border-l border-dashed border-border pl-2">
                            {list.map((e) => (
                              <li key={e.id + e.session_date}>
                                <button
                                  type="button"
                                  onClick={() => onPick(e.session_date)}
                                  className={`flex w-full gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-secondary ${selected === e.session_date ? "bg-accent/15 font-medium" : ""}`}
                                >
                                  <span className="w-6 shrink-0 font-display font-semibold">{format(parseISO(e.session_date), "d")}</span>
                                  <span className="truncate">{e.event_title}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
