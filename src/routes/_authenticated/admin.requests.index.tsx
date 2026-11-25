import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { allRequestsQuery, findConflicts, statusTone } from "@/lib/admin-data";
import { adminStoriesQuery } from "@/lib/stories";

export const Route = createFileRoute("/_authenticated/admin/requests/")({
  validateSearch: z.object({ status: z.enum(["all", "pending", "accepted", "declined", "tentative"]).optional() }),
  component: Inbox,
});

function Inbox() {
  const { status = "all" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery(allRequestsQuery);
  const { data: stories = [] } = useQuery(adminStoriesQuery);
  const rows = data.filter(
    (r) => (status === "all" || r.status === status) && `${r.event_title} ${r.organization} ${r.requester_name} ${r.requester_email}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-semibold">Requests</h1><p className="text-sm text-muted-foreground">Invitations from the request form. Accepting one adds it to your engagements and Google Calendar.</p></div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap rounded-md border border-border p-0.5 text-sm">
          {(["all", "pending", "tentative", "accepted", "declined"] as const).map((s) => (
            <button key={s} onClick={() => navigate({ search: { status: s } })} className={`rounded px-3 py-1.5 capitalize ${status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{s}</button>
          ))}
        </div>
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-3">Event</th><th className="p-3">Requester</th><th className="p-3">Dates</th><th className="p-3">Type / Role</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No requests.</td></tr>}
              {rows.map((r) => {
                const dates = [...r.request_sessions].sort((a, b) => a.session_date.localeCompare(b.session_date));
                const conflict = r.status !== "accepted" && r.status !== "declined" && findConflicts(r, stories).length > 0;
                return (
                  <tr key={r.id} className="hover:bg-muted/40">
                    <td className="p-3"><Link to="/admin/requests/$id" params={{ id: r.id }} className="font-medium hover:underline">{r.event_title}</Link><div className="text-muted-foreground">{r.organization}</div></td>
                    <td className="p-3">{r.requester_name}<div className="text-muted-foreground">{r.requester_email}</div></td>
                    <td className="p-3 whitespace-nowrap">{dates[0] ? format(parseISO(dates[0].session_date), "d MMM yyyy") : "—"}{dates.length > 1 && <span className="text-muted-foreground"> +{dates.length - 1}</span>}</td>
                    <td className="p-3">{r.event_types?.name}<div className="text-muted-foreground">{r.roles?.name}</div></td>
                    <td className="p-3"><span className={`rounded px-2 py-0.5 text-xs capitalize ${statusTone[r.status]}`}>{r.status}</span>{conflict && <span className="ml-1 rounded bg-destructive/15 px-2 py-0.5 text-xs text-destructive">conflict</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
