import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { CalendarSearch, ChevronLeft, ChevronRight } from "lucide-react";
import { PublicShell } from "@/components/site/SiteHeader";
import { MonthCalendar, hm, timeRange } from "@/components/site/MonthCalendar";
import { PageIntro } from "@/components/site/PageIntro";
import { EventNavigator } from "@/components/site/EventNavigator";
import { holidaysQuery } from "@/lib/holidays";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { formatBs } from "@/lib/nepali-date";
import { publicEventsQuery, type PublicEvent } from "@/lib/queries";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Public Engagements — Dr. Bhoj Raj Ghimire" },
      { name: "description", content: "Calendar of upcoming public lectures, keynotes and workshops by Dr. Bhoj Raj Ghimire." },
      { property: "og:title", content: "Public Engagements — Dr. Bhoj Raj Ghimire" },
      { property: "og:description", content: "Upcoming public lectures, keynotes and workshops." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(publicEventsQuery),
  component: Events,
});

function EventCard({ e }: { e: PublicEvent }) {
  const { pick, lang } = useI18n();
  return (
    <li className="card-lift flex gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary py-2 text-primary-foreground">
        <div className="text-[10px] uppercase tracking-wider text-accent">{format(parseISO(e.session_date), "MMM")}</div>
        <div className="font-display text-2xl font-semibold leading-none">{format(parseISO(e.session_date), "d")}</div>
      </div>
      <div className="min-w-0">
        <div className="font-medium">{e.event_title}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">{e.organization}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{formatBs(e.session_date, lang === "ne")}</div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          <span className="rounded-full bg-secondary px-2.5 py-0.5">{timeRange(e.start_time, e.end_time, lang === "ne" ? "दिनभर" : "All day")}</span>
          {e.event_type && <span className="rounded-full bg-secondary px-2.5 py-0.5">{pick(e.event_type, e.event_type_ne)}</span>}
          {e.role && <span className="rounded-full bg-accent/15 px-2.5 py-0.5">{pick(e.role, e.role_ne)}</span>}
          <span className="rounded-full bg-secondary px-2.5 py-0.5">{[e.city, e.country].filter(Boolean).join(", ") || e.venue_mode}</span>
        </div>
      </div>
    </li>
  );
}

function Events() {
  const { t, lang } = useI18n();
  const ne = lang === "ne";
  const { data } = useSuspenseQuery(publicEventsQuery);
  const today = format(new Date(), "yyyy-MM-dd");
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState<string>(today);
  const upcoming = data.filter((e) => e.session_date >= today);
  const onDay = data.filter((e) => e.session_date === selected);
  const { data: yearHolidays = [] } = useQuery(holidaysQuery(Number(selected.slice(0, 4))));
  const dayHolidays = yearHolidays.filter((h) => h.date === selected);
  const isSaturday = parseISO(selected).getDay() === 6;

  /** Date navigator: moves both the selected day and the visible month. */
  function goTo(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    setSelected(date);
    setMonth(parseISO(date));
  }
  const dayCard = useRef<HTMLDivElement>(null);
  /** On phones the day details sit under the calendar, so bring them into view after a tap. */
  function pickDay(date: string) {
    setSelected(date);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setTimeout(() => dayCard.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }
  const step = (n: number) => goTo(format(addDays(parseISO(selected), n), "yyyy-MM-dd"));

  const byMonth = new Map<string, PublicEvent[]>();
  upcoming.forEach((e) => byMonth.set(e.session_date.slice(0, 7), [...(byMonth.get(e.session_date.slice(0, 7)) ?? []), e]));

  return (
    <PublicShell>
      <PageIntro
        eyebrow={t("nav.events")}
        title={t("events.title")}
        subtitle={t("events.subtitle")}
        action={
          <label className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-4 pr-1 text-sm shadow-soft">
            <CalendarSearch className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">{t("events.goTo")}</span>
            <Input type="date" value={selected} onChange={(e) => goTo(e.target.value)} className="h-8 w-40 border-0 shadow-none focus-visible:ring-0" aria-label={t("events.goTo")} />
          </label>
        }
      />
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_24rem]">
        <MonthCalendar
          month={month}
          onMonth={setMonth}
          selected={selected}
          onDayClick={pickDay}
          onSelect={(id) => {
            const e = data.find((x) => x.id === id);
            if (e) pickDay(e.session_date);
          }}
          items={data.map((e) => ({ id: e.id, date: e.session_date, label: e.event_title, ...(e.start_time ? { sub: hm(e.start_time) } : {}) }))}
        />

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div ref={dayCard} className="scroll-mt-20 rounded-3xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className={`font-display text-xl font-semibold ${dayHolidays.some((h) => h.p) || isSaturday ? "text-destructive" : ""}`}>{format(parseISO(selected), "EEEE, d MMMM yyyy")}</div>
                <div className="mt-0.5 font-[family-name:var(--font-display)] text-base text-accent">{formatBs(selected, true)} वि.सं.</div>
                {!ne && <div className="text-xs text-muted-foreground">{formatBs(selected, false)} BS</div>}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" onClick={() => step(-1)} aria-label="Previous day"><ChevronLeft /></Button>
                <Button size="icon" variant="ghost" onClick={() => step(1)} aria-label="Next day"><ChevronRight /></Button>
              </div>
            </div>
            {dayHolidays.length > 0 && (
              <ul className="mt-3 space-y-1">
                {dayHolidays.map((h) => (
                  <li key={h.name} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${h.p ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"}`}>
                    {h.name}{!h.p && <span className="ml-1 text-xs font-normal">({ne ? "पर्व" : "observance"})</span>}
                  </li>
                ))}
              </ul>
            )}
            <ul className="mt-4 space-y-3">
              {onDay.length === 0 && <li className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{t("events.noneOnDay")}</li>}
              {onDay.map((e) => <EventCard key={e.id + e.session_date} e={e} />)}
            </ul>
          </div>
          <EventNavigator events={data} month={month} selected={selected} onMonth={setMonth} onPick={goTo} />
        </aside>
      </div>

      <section className="container-page">
        <h2 className="text-2xl font-semibold">{t("events.upcoming")}</h2>
        {upcoming.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">{t("events.empty")}</p>
        ) : (
          <div className="mt-6 space-y-8">
            {[...byMonth.entries()].map(([m, list]) => (
              <section key={m}>
                <button type="button" onClick={() => goTo(`${m}-01`)} className="text-lg font-semibold hover:text-primary">
                  {format(parseISO(`${m}-01`), "MMMM yyyy")}
                </button>
                <ul className="mt-3 grid gap-3 md:grid-cols-2">
                  {list.map((e) => <EventCard key={e.id + e.session_date} e={e} />)}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>
    </PublicShell>
  );
}
