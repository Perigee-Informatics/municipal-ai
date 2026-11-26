import { useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { tr } from "@/lib/admin-i18n";
import { selectCls } from "@/components/admin/AdminPage";
import { cn } from "@/lib/utils";

/* One filter bar for every admin list: a search box, any number of drop-down filters,
 * a "Clear" button when something is set, and the number of matching rows. */

export type FilterOption = { value: string; label: string; count?: number | undefined };
export type FilterDef = {
  key: string;
  label: string; // shown as the "all" choice: "All packages"
  options: FilterOption[];
  width?: string | undefined;
};
export type FilterValues = Record<string, string>;

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthOptions = (): FilterOption[] => MONTHS.map((m, i) => ({ value: String(i + 1).padStart(2, "0"), label: m }));

/** Distinct years in a set of yyyy-mm-dd dates, newest first. */
export function yearOptions(dates: (string | null | undefined)[]): FilterOption[] {
  const ys = [...new Set(dates.filter((d): d is string => !!d && d.length >= 4).map((d) => d.slice(0, 4)))].sort().reverse();
  return ys.map((y) => ({ value: y, label: y }));
}

/** Whether any of the dates falls in the chosen year and month (either may be empty = any). */
export function inPeriod(dates: (string | null | undefined)[], year: string | undefined, month: string | undefined): boolean {
  if (!year && !month) return true;
  return dates.some((d) => !!d && (!year || d.slice(0, 4) === year) && (!month || d.slice(5, 7) === month));
}

/** Distinct, sorted non-empty values of a field, with how many rows have each. */
export function valueOptions<T>(rows: T[], get: (r: T) => string | null | undefined): FilterOption[] {
  const n = new Map<string, number>();
  for (const r of rows) {
    const v = (get(r) ?? "").trim();
    if (v) n.set(v, (n.get(v) ?? 0) + 1);
  }
  return [...n.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([value, count]) => ({ value, label: value, count }));
}

export const textMatch = (q: string, ...parts: (string | null | undefined)[]) =>
  !q.trim() || parts.join(" ").toLowerCase().includes(q.trim().toLowerCase());

export function FilterBar({
  q,
  onQ,
  placeholder = "Search…",
  filters = [],
  values,
  onChange,
  shown,
  total,
  children,
}: {
  q: string;
  onQ: (q: string) => void;
  placeholder?: string;
  filters?: FilterDef[];
  values: FilterValues;
  onChange: (key: string, value: string) => void;
  shown?: number;
  total?: number;
  children?: ReactNode;
}) {
  const { lang } = useI18n();
  const T = (x: string) => tr(lang, x) as string;
  const active = !!q.trim() || filters.some((f) => values[f.key]);
  return (
    <div className="flex flex-wrap items-center gap-2" role="search">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => onQ(e.target.value)} placeholder={T(placeholder)} className="h-9 w-56 pl-8" aria-label={T("Search")} />
      </div>
      {filters.map((f) => (
        <select
          key={f.key}
          className={cn(selectCls, f.width ?? "w-40", values[f.key] ? "border-primary font-medium" : "text-muted-foreground")}
          value={values[f.key] ?? ""}
          onChange={(e) => onChange(f.key, e.target.value)}
          aria-label={T(f.label)}
        >
          <option value="">{T(f.label)}</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {T(o.label)}
              {o.count != null ? ` (${o.count})` : ""}
            </option>
          ))}
        </select>
      ))}
      {children}
      {active && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            onQ("");
            filters.forEach((f) => values[f.key] && onChange(f.key, ""));
          }}
        >
          <X />
          {T("Clear")}
        </Button>
      )}
      {shown != null && total != null && (
        <span className="ml-auto text-sm text-muted-foreground">
          {shown === total ? `${total}` : lang === "ne" ? `${total} मध्ये ${shown}` : `${shown} of ${total}`}
        </span>
      )}
    </div>
  );
}

/** Small state helper: the values of all filters of one page. */
export function useFilters(initial: FilterValues = {}) {
  const [q, setQ] = useState("");
  const [values, setValues] = useState<FilterValues>(initial);
  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));
  return { q, setQ, values, set };
}
