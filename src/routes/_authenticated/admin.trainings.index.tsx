import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Pencil, Plus, QrCode, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Empty, Panel, Pill, Stat } from "@/components/admin/AdminPage";
import { TrainingEventForm } from "@/components/admin/TrainingEventForm";
import { TrainingQr } from "@/components/admin/TrainingQr";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { workshop } from "@/lib/workshop-legacy";
import {
  courseOfKey,
  enDates,
  eventsQuery,
  eventTitle,
  feedbackQuery,
  hasAssessmentKey,
  packagesQuery,
  peopleQuery,
  phase,
  phaseLabel,
  refreshTraining,
  resultsCountQuery,
  sortEvents,
  type TrainingEvent,
} from "@/lib/training-data";

type Search = { new?: number | undefined; edit?: string | undefined };

/* AI for ALL → Training events: the programme figures and every training event in one place.
 * Create or edit an event here; open one for its class view, participants, results, feedback and gallery. */
export const Route = createFileRoute("/_authenticated/admin/trainings/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    new: s["new"] ? 1 : undefined,
    edit: typeof s["edit"] === "string" ? s["edit"] : undefined,
  }),
  component: TrainingEvents,
});

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

function TrainingEvents() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: events = [], isLoading } = useQuery(eventsQuery);
  const { data: packages = [] } = useQuery(packagesQuery);
  const { data: people = [] } = useQuery(peopleQuery);
  const { data: feedback = [] } = useQuery(feedbackQuery);
  const { data: results = {} } = useQuery(resultsCountQuery);
  const [qrFor, setQrFor] = useState<TrainingEvent | null>(null);
  const editing = search.edit ? events.find((e) => e.id === search.edit) : null;
  const formOpen = !!search.new || !!editing;
  const pkg = (id: string | null) => packages.find((p) => p.id === id);
  const closeForm = () => navigate({ search: {} });
  const pending = people.filter((p) => p.status === "pending").length;
  const approved = people.filter((p) => p.status === "approved").length;

  const counts = (e: TrainingEvent) => {
    const n = people.filter((x) => x.status === "approved" && x.event_id === e.id).length;
    const r = results[e.code.toUpperCase()];
    const fb = feedback.filter((f) => f.event_code === e.code).length;
    return [
      plural(n, "participant"),
      hasAssessmentKey(pkg(e.package_id)?.key) && r ? `pre ${r.pre} · post ${r.post}` : "",
      fb ? `feedback ${fb}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  };

  return (
    <AdminPage
      title="Training events"
      description="Your AI for ALL programme: create and edit training events, open or close their tests and print QR codes. Open an event for its class view, participants, results, feedback and gallery. Visitors who are not signed in see the active event on the AI for ALL page."
      actions={
        !formOpen && (
          <Button onClick={() => navigate({ search: { new: 1 } })}>
            <Plus />
            New training event
          </Button>
        )
      }
      wide
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Training events" value={events.length} />
        <Link to="/admin/masters/packages">
          <Stat label="Packages" value={packages.length} />
        </Link>
        <Link to="/admin/trainings/participants">
          <Stat label="Waiting for approval" value={pending} tone={pending ? "warn" : undefined} hint={pending ? "Review now →" : undefined} />
        </Link>
        <Stat label="Approved participants" value={approved} />
        <Link to="/admin/trainings/results">
          <Stat label="Feedback received" value={feedback.length} />
        </Link>
      </div>

      {formOpen && (
        <Panel title={editing ? `Edit: ${editing.name} [${editing.code}]` : "New training event"}>
          <TrainingEventForm key={editing?.id ?? "new"} ev={editing} onDone={closeForm} />
        </Panel>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : events.length === 0 ? (
        <Empty>No training event yet.</Empty>
      ) : (
        <div className="space-y-3">
          {sortEvents(events).map((e) => (
            <EventRow
              key={e.id}
              ev={e}
              pkgName={pkg(e.package_id)?.name ?? "No package"}
              pkgKey={pkg(e.package_id)?.key}
              counts={counts(e)}
              onEdit={() => navigate({ search: { edit: e.id } })}
              onQr={() => setQrFor(e)}
            />
          ))}
        </div>
      )}

      <Dialog open={!!qrFor} onOpenChange={(o) => !o && setQrFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>{qrFor ? eventTitle(qrFor) : ""}</DialogTitle>
          <DialogDescription>QR codes for the event link and its tests.</DialogDescription>
          {qrFor && (
            <TrainingQr
              ev={qrFor}
              packageKey={pkg(qrFor.package_id)?.key}
              kinds={hasAssessmentKey(pkg(qrFor.package_id)?.key) ? ["link", "pre", "post"] : ["link"]}
            />
          )}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}

function EventRow({
  ev,
  pkgName,
  pkgKey,
  counts,
  onEdit,
  onQr,
}: {
  ev: TrainingEvent;
  pkgName: string;
  pkgKey: string | undefined;
  counts: string;
  onEdit: () => void;
  onQr: () => void;
}) {
  const qc = useQueryClient();
  const test = hasAssessmentKey(pkgKey);
  const ph = phase(ev);
  const n = ev.question_ids?.length ?? 0;

  async function patch(p: Partial<TrainingEvent>) {
    const { error } = await supabase.from("events").update(p).eq("id", ev.id);
    if (error) toast.error(error.message);
    refreshTraining(qc);
  }
  async function regenSet() {
    if (n && !confirm("Make a new question set for this event? Do this before the tests start, so the pre and post tests use the same set.")) return;
    try {
      const { pick } = await workshop();
      const ids = pick(courseOfKey(pkgKey));
      await patch({ question_ids: ids });
      toast.success(`Question set made (${ids.length} questions).`);
    } catch (e) {
      toast.error(String((e as Error).message ?? e));
    }
  }

  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link to="/admin/trainings/event/$code" params={{ code: ev.code }} className="font-semibold hover:text-accent">
              {eventTitle(ev)}
            </Link>
            <span className="font-mono text-xs text-muted-foreground">[{ev.code}]</span>
            {ev.is_active && <Pill tone="ok">Active</Pill>}
            {ph && <Pill tone={ph === "upcoming" ? "info" : ph === "today" ? "warn" : "neutral"}>{phaseLabel[ph]}</Pill>}
            <Pill>{ev.materials_public ? "Materials public" : "Materials private"}</Pill>
          </div>
          <div className="text-xs text-muted-foreground">{[pkgName, enDates(ev.event_dates), ev.address].filter(Boolean).join(" · ")}</div>
          <div className="text-xs text-muted-foreground">{counts}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to="/admin/trainings/event/$code" params={{ code: ev.code }}>
              Open
            </Link>
          </Button>
          <Button size="sm" variant="outline" onClick={onQr}>
            <QrCode />
            QR
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil />
            Edit
          </Button>
          {test && (
            <Button asChild size="sm" variant="ghost">
              <a href={`/workshop/assessment/index.html?report=${encodeURIComponent(ev.code)}`} target="_blank" rel="noopener">
                <FileText />
                Report
              </a>
            </Button>
          )}
        </div>
      </div>
      {test && (
        <div className="mt-3 grid gap-x-6 gap-y-2 border-t border-border pt-3 text-sm sm:grid-cols-2 lg:grid-cols-[repeat(4,auto)_1fr] lg:items-center">
          <Flag label="Pre-test open" on={!!ev.pre_open} onChange={(v) => patch({ pre_open: v })} />
          <Flag label="Pre: answers shown" on={!!ev.pre_answers} onChange={(v) => patch({ pre_answers: v })} />
          <Flag label="Post-test open" on={!!ev.post_open} onChange={(v) => patch({ post_open: v })} />
          <Flag label="Post: answers shown" on={!!ev.post_answers} onChange={(v) => patch({ post_answers: v })} />
          <div className="flex items-center gap-2 lg:justify-end">
            <span className="text-xs text-muted-foreground">
              Question set: {n ? `${n} questions${n === 20 ? " (4 simple · 10 medium · 6 complex)" : ""}` : "not made yet"}
            </span>
            <Button size="sm" variant={n ? "ghost" : "secondary"} onClick={regenSet}>
              <RefreshCw />
              {n ? "Remake" : "Make set"}
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

function Flag({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2">
      <Switch checked={on} onCheckedChange={onChange} />
      <span className={on ? "" : "text-muted-foreground"}>{label}</span>
    </label>
  );
}
