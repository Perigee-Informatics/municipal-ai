import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
import { AdminPage, Empty, Pill, Stat } from "@/components/admin/AdminPage";
import { Button } from "@/components/ui/button";
import {
  enDates,
  eventsQuery,
  feedbackQuery,
  hasAssessmentKey,
  packagesQuery,
  peopleQuery,
  phase,
  phaseLabel,
  resultsCountQuery,
  sortEvents,
} from "@/lib/training-data";

export const Route = createFileRoute("/_authenticated/admin/trainings/")({ component: ProgrammeOverview });

function ProgrammeOverview() {
  const { data: events = [], isLoading } = useQuery(eventsQuery);
  const { data: packages = [] } = useQuery(packagesQuery);
  const { data: people = [] } = useQuery(peopleQuery);
  const { data: feedback = [] } = useQuery(feedbackQuery);
  const { data: results = {} } = useQuery(resultsCountQuery);
  const pending = people.filter((p) => p.status === "pending").length;
  const approved = people.filter((p) => p.status === "approved").length;
  const pkg = (id: string | null) => packages.find((p) => p.id === id);

  return (
    <AdminPage
      title="AI for ALL"
      description="Your training programme: every training event with its participants, tests, feedback, materials and photos. Visitors who are not signed in see the active event on the AI for ALL page."
      actions={
        <Button asChild>
          <Link to="/admin/trainings/events" search={{ new: 1 }}>
            <Plus />
            New training event
          </Link>
        </Button>
      }
      wide
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Training events" value={events.length} />
        <Stat label="Packages" value={packages.length} />
        <Link to="/admin/trainings/participants">
          <Stat label="Waiting for approval" value={pending} tone={pending ? "warn" : undefined} hint={pending ? "Review now →" : undefined} />
        </Link>
        <Stat label="Approved participants" value={approved} />
        <Stat label="Feedback received" value={feedback.length} />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : events.length === 0 ? (
        <Empty>No training event yet.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortEvents(events).map((e) => {
            const p = pkg(e.package_id);
            const ph = phase(e);
            const fb = feedback.filter((f) => f.event_code === e.code).length;
            const r = results[e.code.toUpperCase()];
            const test = hasAssessmentKey(p?.key);
            return (
              <article key={e.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-accent/60">
                <div className="flex flex-wrap items-center gap-1.5">
                  {e.is_active && <Pill tone="ok">Active</Pill>}
                  {ph && <Pill tone={ph === "upcoming" ? "info" : ph === "today" ? "warn" : "neutral"}>{phaseLabel[ph]}</Pill>}
                  <Pill>{e.materials_public ? "Materials public" : "Materials private"}</Pill>
                  <span className="ml-auto font-mono text-[11px] text-muted-foreground">{e.code}</span>
                </div>
                <h3 className="font-display text-lg font-semibold leading-snug">
                  <Link to="/admin/trainings/event/$code" params={{ code: e.code }} className="hover:text-accent">
                    {e.organized_by || e.name}
                  </Link>
                </h3>
                <div className="text-sm">{e.name}</div>
                <div className="text-xs text-muted-foreground">
                  {[p?.name, enDates(e.event_dates), e.address].filter(Boolean).join(" · ")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {((n) => `${n} participant${n === 1 ? "" : "s"}`)(people.filter((x) => x.status === "approved" && x.event_id === e.id).length)}
                  {test && r ? ` · pre ${r.pre} · post ${r.post}` : ""}
                  {fb ? ` · feedback ${fb}` : ""}
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Button asChild size="sm">
                    <Link to="/admin/trainings/event/$code" params={{ code: e.code }}>
                      Open
                    </Link>
                  </Button>
                  {test && (
                    <>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/admin/trainings/event/$code" params={{ code: e.code }} search={{ tab: "results" }}>
                          Results
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <a href={`/workshop/assessment/index.html?report=${encodeURIComponent(e.code)}`} target="_blank" rel="noopener">
                          <FileText />
                          Report
                        </a>
                      </Button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AdminPage>
  );
}
