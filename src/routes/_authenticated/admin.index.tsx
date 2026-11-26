import { Tx } from "@/lib/admin-i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { allRequestsQuery, findConflicts, statusTone } from "@/lib/admin-data";
import { timeRange } from "@/components/site/MonthCalendar";
import { GoogleSyncBar } from "@/components/admin/GoogleSyncBar";
import { adminStoriesQuery } from "@/lib/stories";
import { Pill } from "@/components/admin/AdminPage";
import { nepalNow, splitByTime } from "@/lib/when";
import { enDates, eventsQuery, peopleQuery, phase, sortEvents } from "@/lib/training-data";

export const Route = createFileRoute("/_authenticated/admin/")({ component: Dashboard });

type StoryRow = Awaited<ReturnType<typeof adminStoriesQuery.queryFn & {}>>[number];

function EngagementList({ title, empty, rows, today, more, when, muted }: {
  title: string; empty: string; rows: StoryRow[]; today: string; more: number;
  when: "upcoming" | "completed"; muted?: boolean;
}) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold"><Tx>{title}</Tx></h2>
        {more > 0 && <Link to="/admin/stories" search={{ when }} className="text-sm text-accent hover:underline">All {more} →</Link>}
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {rows.length === 0 && <li className="p-5 text-sm text-muted-foreground"><Tx>{empty}</Tx></li>}
        {rows.map((s) => {
          const isToday = s.event_date <= today && (s.end_date ?? s.event_date) >= today;
          return (
            <li key={s.id}><Link to="/admin/stories/$id" params={{ id: s.id }} className="block p-4 hover:bg-muted/50">
              <div className={`flex items-center gap-2 text-xs font-medium ${muted ? "text-muted-foreground" : "text-accent"}`}>
                {format(parseISO(s.event_date), "EEE d MMM")}{s.end_date && s.end_date > s.event_date ? `–${format(parseISO(s.end_date), "d MMM")}` : ""} · {timeRange(s.start_time, s.end_time)}
                {isToday && <Pill tone={muted ? "neutral" : "info"}>{muted ? "Done today" : "Today"}</Pill>}
              </div>
              <div className={`font-medium ${muted ? "text-muted-foreground" : ""}`}>{s.title}</div>
              <div className="text-sm text-muted-foreground">{s.organizer} · <Tx>{s.is_public ? "public" : "private"}</Tx></div>
            </Link></li>
          );
        })}
      </ul>
    </section>
  );
}

function Dashboard() {
  const { data = [], isLoading } = useQuery(allRequestsQuery);
  const { data: stories = [] } = useQuery(adminStoriesQuery);
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  const count = (s: string) => data.filter((r) => r.status === s).length;
  const now = nepalNow();
  const split = splitByTime(stories, now);
  const upcoming = split.upcoming.slice(0, 6);
  const completed = split.completed.slice(0, 6);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div className="border-b border-border pb-5"><h1 className="text-2xl font-semibold md:text-3xl"><Tx>Dashboard</Tx></h1><p className="mt-1.5 text-sm text-muted-foreground"><Tx>Your invitations, upcoming engagements and the AI for ALL programme at a glance.</Tx></p></div>
      <GoogleSyncBar />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(["pending", "tentative", "accepted", "declined"] as const).map((s) => (
          <Link key={s} to="/admin/requests" search={{ status: s }} className="rounded-xl border border-border bg-card p-5 shadow-soft hover:border-accent">
            <div className="text-sm capitalize text-muted-foreground"><Tx>{s}</Tx></div>
            <div className="mt-1 font-display text-4xl font-semibold">{count(s)}</div>
          </Link>
        ))}
      </div>
      <TrainingStrip />
      <div className="grid gap-8 lg:grid-cols-2">
        <EngagementList
          title="Upcoming engagements"
          empty="Nothing scheduled."
          rows={upcoming}
          today={now.date}
          more={split.upcoming.length > upcoming.length ? split.upcoming.length : 0}
          when="upcoming"
        />
        <EngagementList
          title="Recently completed"
          empty="Nothing completed yet."
          rows={completed}
          today={now.date}
          more={split.completed.length > completed.length ? split.completed.length : 0}
          when="completed"
          muted
        />
        <section>
          <h2 className="mb-4 text-xl font-semibold"><Tx>Recent requests</Tx></h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {data.length === 0 && <li className="p-5 text-sm text-muted-foreground"><Tx>No requests yet.</Tx></li>}
            {data.slice(0, 6).map((r) => (
              <li key={r.id}><Link to="/admin/requests/$id" params={{ id: r.id }} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50">
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.event_title}</div>
                  <div className="text-sm text-muted-foreground">{r.requester_name} · {format(parseISO(r.created_at), "d MMM")}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {r.status === "pending" && findConflicts(r, stories).length > 0 && <span className="rounded bg-destructive/15 px-2 py-0.5 text-xs text-destructive">conflict</span>}
                  <span className={`rounded px-2 py-0.5 text-xs capitalize ${statusTone[r.status]}`}><Tx>{r.status}</Tx></span>
                </div>
              </Link></li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/** AI for ALL at a glance: the active or next training and registrations waiting. */
function TrainingStrip() {
  const { data: events = [] } = useQuery(eventsQuery);
  const { data: people = [] } = useQuery(peopleQuery);
  const pending = people.filter((p) => p.status === "pending").length;
  const next = sortEvents(events).find((e) => e.is_active) ?? sortEvents(events).find((e) => phase(e) === "upcoming");
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wider text-accent"><Tx>AI for ALL</Tx></div>
        {next ? (
          <Link to="/admin/trainings/event/$code" params={{ code: next.code }} className="mt-1 block hover:text-accent">
            <span className="font-medium">{next.organized_by || next.name}</span>{" "}
            <span className="text-sm text-muted-foreground">· {next.name} · {enDates(next.event_dates)}</span>{" "}
            {next.is_active && <Pill tone="ok"><Tx>Active</Tx></Pill>}
          </Link>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground"><Tx>No active or upcoming training.</Tx></p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link to="/admin/trainings/participants" className="rounded-lg border border-border px-3 py-1.5 hover:border-accent">
          {pending} <Tx>{pending === 1 ? "registration waiting" : "registrations waiting"}</Tx>
        </Link>
        <Link to="/admin/trainings" className="rounded-lg border border-border px-3 py-1.5 hover:border-accent">
          <Tx>Training events →</Tx>
        </Link>
      </div>
    </section>
  );
}
