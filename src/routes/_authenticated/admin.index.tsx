import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { allRequestsQuery, findConflicts, statusTone } from "@/lib/admin-data";
import { timeRange } from "@/components/site/MonthCalendar";
import { GoogleSyncBar } from "@/components/admin/GoogleSyncBar";
import { adminStoriesQuery } from "@/lib/stories";

export const Route = createFileRoute("/_authenticated/admin/")({ component: Dashboard });

function Dashboard() {
  const { data = [], isLoading } = useQuery(allRequestsQuery);
  const { data: stories = [] } = useQuery(adminStoriesQuery);
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  const count = (s: string) => data.filter((r) => r.status === s).length;
  const today = format(new Date(), "yyyy-MM-dd");
  const upcoming = stories
    .filter((s) => (s.end_date ?? s.event_date) >= today)
    .sort((a, b) => (a.event_date + (a.start_time ?? "")).localeCompare(b.event_date + (b.start_time ?? "")))
    .slice(0, 6);

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <GoogleSyncBar />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(["pending", "tentative", "accepted", "declined"] as const).map((s) => (
          <Link key={s} to="/admin/requests" search={{ status: s }} className="rounded-xl border border-border bg-card p-5 shadow-soft hover:border-accent">
            <div className="text-sm capitalize text-muted-foreground">{s}</div>
            <div className="mt-1 font-display text-4xl font-semibold">{count(s)}</div>
          </Link>
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 text-xl font-semibold">Upcoming engagements</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {upcoming.length === 0 && <li className="p-5 text-sm text-muted-foreground">Nothing scheduled.</li>}
            {upcoming.map((s) => (
              <li key={s.id}><Link to="/admin/stories/$id" params={{ id: s.id }} className="block p-4 hover:bg-muted/50">
                <div className="text-xs font-medium text-accent">{format(parseISO(s.event_date), "EEE d MMM")}{s.end_date && s.end_date > s.event_date ? `–${format(parseISO(s.end_date), "d MMM")}` : ""} · {timeRange(s.start_time, s.end_time)}</div>
                <div className="font-medium">{s.title}</div>
                <div className="text-sm text-muted-foreground">{s.organizer}{s.is_public ? " · public" : " · private"}</div>
              </Link></li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-4 text-xl font-semibold">Recent requests</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {data.length === 0 && <li className="p-5 text-sm text-muted-foreground">No requests yet.</li>}
            {data.slice(0, 6).map((r) => (
              <li key={r.id}><Link to="/admin/requests/$id" params={{ id: r.id }} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50">
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.event_title}</div>
                  <div className="text-sm text-muted-foreground">{r.requester_name} · {format(parseISO(r.created_at), "d MMM")}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {r.status === "pending" && findConflicts(r, stories).length > 0 && <span className="rounded bg-destructive/15 px-2 py-0.5 text-xs text-destructive">conflict</span>}
                  <span className={`rounded px-2 py-0.5 text-xs capitalize ${statusTone[r.status]}`}>{r.status}</span>
                </div>
              </Link></li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
