import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { forwardRef, useRef, useState } from "react";
import { addDays, addWeeks, format, parseISO, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Globe, Lock, MapPin, Plus } from "lucide-react";
import { AddEventDialog } from "@/components/admin/AddEventDialog";
import { formatBs } from "@/lib/nepali-date";
import { Button } from "@/components/ui/button";
import { MonthCalendar, hm, timeRange } from "@/components/site/MonthCalendar";
import { GoogleSyncBar } from "@/components/admin/GoogleSyncBar";
import { adminStoriesQuery } from "@/lib/stories";
import { allRequestsQuery } from "@/lib/admin-data";
import { holidaysQuery } from "@/lib/holidays";

export const Route = createFileRoute("/_authenticated/admin/calendar")({ component: CalendarPage });

type Item = { id: string; kind: "story" | "request"; date: string; label: string; sub?: string; start: string; end: string; tone: "warning" | "accent" | "navy" };

/** Each day an engagement covers (capped at 60 days). */
function daysOf(from: string, to: string | null) {
  const out: string[] = [];
  const last = to && to > from ? to : from;
  for (let d = parseISO(from); out.length < 60; d = addDays(d, 1)) {
    const k = format(d, "yyyy-MM-dd");
    out.push(k);
    if (k >= last) break;
  }
  return out;
}

function CalendarPage() {
  const navigate = useNavigate();
  const { data: stories = [] } = useQuery(adminStoriesQuery);
  const { data: requests = [] } = useQuery(allRequestsQuery);
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(new Date());
  const [showTentative, setShowTentative] = useState(true);
  const [adding, setAdding] = useState<{ date?: string | undefined } | null>(null);
  const [selected, setSelected] = useState(format(new Date(), "yyyy-MM-dd"));
  const panel = useRef<HTMLDivElement>(null);
  const { data: yearHolidays = [] } = useQuery(holidaysQuery(Number(selected.slice(0, 4))));
  /** Picks a day; on phones the details panel sits under the grid, so bring it into view. */
  function pick(date: string) {
    setSelected(date);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches) {
      setTimeout(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }
  const items: Item[] = [
    ...stories.flatMap((s) =>
      daysOf(s.event_date, s.end_date).map((date) => ({
        id: s.id, kind: "story" as const, date, label: s.title, start: s.start_time ?? "", end: s.end_time ?? "",
        ...(s.start_time ? { sub: hm(s.start_time) } : {}),
        tone: (s.is_public ? "accent" : "navy") as Item["tone"],
      })),
    ),
    ...requests
      .filter((r) => showTentative && (r.status === "tentative" || r.status === "pending"))
      .flatMap((r) => r.request_sessions.map((x) => ({
        id: `req:${r.id}`, kind: "request" as const, date: x.session_date, label: `${r.status === "pending" ? "Request: " : ""}${r.event_title}`,
        sub: hm(x.start_time), start: x.start_time, end: x.end_time, tone: "warning" as const,
      }))),
  ];
  const open = (id: string) =>
    id.startsWith("req:") ? navigate({ to: "/admin/requests/$id", params: { id: id.slice(4) } }) : navigate({ to: "/admin/stories/$id", params: { id } });
  const weekStart = startOfWeek(cursor);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-semibold">My Calendar</h1><p className="text-sm text-muted-foreground">Every engagement, the same list as the Story Map. Click one to edit it.</p></div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setAdding({})}><Plus />Add engagement</Button>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showTentative} onChange={(e) => setShowTentative(e.target.checked)} />Show open requests</label>
          <div className="inline-flex rounded-md border border-border p-0.5 text-sm">
            {(["month", "week"] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`rounded px-3 py-1.5 capitalize ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{v}</button>)}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary" />Private (only you)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-accent/60" />Public (on the Events page)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-warning/50" />Pending or tentative request</span>
      </div>

      {view === "month" ? (
        <>
          <MonthCalendar month={cursor} onMonth={setCursor} items={items} onSelect={open} onAdd={(date) => setAdding({ date })} selected={selected} onDayClick={pick} />
          <DayPanel
            ref={panel}
            date={selected}
            holidays={yearHolidays.filter((h) => h.date === selected)}
            stories={stories.filter((s) => selected >= s.event_date && selected <= (s.end_date && s.end_date > s.event_date ? s.end_date : s.event_date)).sort((x, y) => (x.start_time ?? "").localeCompare(y.start_time ?? ""))}
            requests={showTentative ? requests.filter((r) => (r.status === "pending" || r.status === "tentative") && r.request_sessions.some((x) => x.session_date === selected)) : []}
            onStep={(n) => { const d = format(addDays(parseISO(selected), n), "yyyy-MM-dd"); setSelected(d); setCursor(parseISO(d)); }}
            onOpen={open}
            onAdd={() => setAdding({ date: selected })}
          />
        </>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="text-lg font-semibold">Week of {format(weekStart, "d MMM yyyy")}</h3>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => setCursor(addWeeks(cursor, -1))}><ChevronLeft /></Button>
              <Button size="sm" variant="ghost" onClick={() => setCursor(new Date())}>Today</Button>
              <Button size="icon" variant="ghost" onClick={() => setCursor(addWeeks(cursor, 1))}><ChevronRight /></Button>
            </div>
          </div>
          <div className="grid divide-y divide-border md:grid-cols-7 md:divide-x md:divide-y-0">
            {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const evs = items.filter((x) => x.date === key).sort((a, b) => a.start.localeCompare(b.start));
              return (
                <div key={key} className="min-h-40 p-2">
                  <div className="mb-2 flex items-start justify-between gap-1">
                    <div className="text-xs font-medium text-muted-foreground">{format(d, "EEE d")}<div className="font-normal">{formatBs(key, false)}</div></div>
                    <button type="button" onClick={() => setAdding({ date: key })} className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-label={`Add event on ${key}`}><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="space-y-1.5">
                    {evs.map((e, i) => (
                      <button key={i} onClick={() => open(e.id)} className={`block w-full rounded p-1.5 text-left text-xs ${e.tone === "navy" ? "bg-primary text-primary-foreground" : e.tone === "warning" ? "bg-warning/25" : "bg-accent/20"}`}>
                        <div className="font-medium">{timeRange(e.start, e.end)}</div>{e.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AddEventDialog open={!!adding} onOpenChange={(o) => !o && setAdding(null)} date={adding?.date} />

      <GoogleSyncBar />

    </div>
  );
}

type DayStory = { id: string; title: string; organizer: string | null; start_time: string | null; end_time: string | null; venue_mode: string; venue_name: string | null; city: string | null; country: string | null; is_public: boolean; event_types: { name: string } | null; roles: { name: string } | null };
type DayRequest = { id: string; event_title: string; organization: string; status: string; request_sessions: { session_date: string; start_time: string; end_time: string }[] };

/** Everything on one day, readable on a phone: engagements, open requests and holidays. */
const DayPanel = forwardRef<HTMLDivElement, {
  date: string; holidays: { name: string; p: boolean }[]; stories: DayStory[]; requests: DayRequest[];
  onStep: (n: number) => void; onOpen: (id: string) => void; onAdd: () => void;
}>(function DayPanel({ date, holidays, stories, requests, onStep, onOpen, onAdd }, ref) {
  const sat = parseISO(date).getDay() === 6;
  const red = sat || holidays.some((h) => h.p);
  return (
    <div ref={ref} className="scroll-mt-4 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className={`font-display text-lg font-semibold sm:text-xl ${red ? "text-destructive" : ""}`}>{format(parseISO(date), "EEEE, d MMMM yyyy")}</div>
          <div className="font-[family-name:var(--font-display)] text-sm text-accent">{formatBs(date, true)} वि.सं. <span className="text-muted-foreground">· {formatBs(date, false)} BS</span></div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="icon" variant="ghost" onClick={() => onStep(-1)} aria-label="Previous day"><ChevronLeft /></Button>
          <Button size="icon" variant="ghost" onClick={() => onStep(1)} aria-label="Next day"><ChevronRight /></Button>
        </div>
      </div>
      {holidays.length > 0 && (
        <ul className="mt-3 space-y-1">
          {holidays.map((h) => (
            <li key={h.name} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${h.p ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"}`}>
              {h.name}{!h.p && <span className="ml-1 text-xs font-normal">(observance)</span>}
            </li>
          ))}
        </ul>
      )}
      <ul className="mt-3 space-y-2">
        {stories.length === 0 && requests.length === 0 && <li className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Nothing on this day.</li>}
        {stories.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => onOpen(s.id)} className={`w-full rounded-xl border-l-4 bg-secondary/50 p-3 text-left hover:bg-secondary ${s.is_public ? "border-accent" : "border-primary"}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{s.title}</span>
                <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${s.is_public ? "bg-success/15 text-success" : "bg-primary/10 text-primary"}`}>
                  {s.is_public ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}{s.is_public ? "Public" : "Private"}
                </span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{timeRange(s.start_time, s.end_time)}{s.organizer ? ` · ${s.organizer}` : ""}</div>
              {(s.venue_name || s.city || s.country || s.venue_mode !== "in_person") && (
                <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {[s.venue_name, s.city, s.country].filter(Boolean).join(", ") || (s.venue_mode === "online" ? "Online" : "Hybrid")}
                </div>
              )}
              {(s.event_types || s.roles) && <div className="mt-1.5 flex flex-wrap gap-1 text-xs">{s.event_types && <span className="rounded-full bg-card px-2 py-0.5">{s.event_types.name}</span>}{s.roles && <span className="rounded-full bg-accent/15 px-2 py-0.5">{s.roles.name}</span>}</div>}
            </button>
          </li>
        ))}
        {requests.map((r) => {
          const ses = r.request_sessions.find((x) => x.session_date === date);
          return (
            <li key={r.id}>
              <button type="button" onClick={() => onOpen(`req:${r.id}`)} className="w-full rounded-xl border-l-4 border-warning bg-warning/10 p-3 text-left hover:bg-warning/20">
                <div className="flex items-start justify-between gap-2"><span className="font-medium">{r.event_title}</span><span className="shrink-0 rounded-full bg-warning/30 px-2 py-0.5 text-[11px] font-medium capitalize">{r.status} request</span></div>
                <div className="mt-1 text-sm text-muted-foreground">{ses ? timeRange(ses.start_time, ses.end_time) : ""} · {r.organization}</div>
              </button>
            </li>
          );
        })}
      </ul>
      <Button variant="outline" size="sm" className="mt-3 w-full sm:w-auto" onClick={onAdd}><Plus />Add engagement on this day</Button>
    </div>
  );
});
