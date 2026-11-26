import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, FileText, Globe, Lock, Pencil, Power } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Empty, Panel, Pill, Stat } from "@/components/admin/AdminPage";
import { EventGallery } from "@/components/admin/EventGallery";
import { FeedbackSummary } from "@/components/admin/FeedbackSummary";
import { TrainingEventForm } from "@/components/admin/TrainingEventForm";
import { TrainingQr } from "@/components/admin/TrainingQr";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { workshop } from "@/lib/workshop-legacy";
import {
  COURSE_LABEL,
  COURSE_PAGE,
  courseOfKey,
  enDates,
  eventsQuery,
  feedbackQuery,
  hasAssessmentKey,
  membershipsQuery,
  packagesQuery,
  peopleQuery,
  phase,
  phaseLabel,
  refreshTraining,
  resultsCountQuery,
  type TrainingEvent,
} from "@/lib/training-data";

const TABS = [
  ["details", "Details & QR"],
  ["class", "Class view"],
  ["results", "Test results"],
  ["people", "Participants"],
  ["feedback", "Feedback"],
  ["gallery", "Gallery"],
] as const;
type Tab = (typeof TABS)[number][0];

export const Route = createFileRoute("/_authenticated/admin/trainings/event/$code")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab | undefined; edit?: number | undefined } => ({
    tab: TABS.some(([t]) => t === s["tab"]) ? (s["tab"] as Tab) : undefined,
    edit: s["edit"] ? 1 : undefined,
  }),
  component: TrainingEventPage,
});

function TrainingEventPage() {
  const { code } = Route.useParams();
  const { tab = "details", edit } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const { data: events = [], isLoading } = useQuery(eventsQuery);
  const { data: packages = [] } = useQuery(packagesQuery);
  const ev = events.find((e) => e.code.toUpperCase() === code.toUpperCase());
  const pkg = packages.find((p) => p.id === ev?.package_id);
  const course = courseOfKey(pkg?.key);
  const test = hasAssessmentKey(pkg?.key);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!ev)
    return (
      <AdminPage title="Event not found">
        <Empty>
          No training event has the code {code}. <Link to="/admin/trainings" className="underline">See all training events</Link>.
        </Empty>
      </AdminPage>
    );

  async function setActive(on: boolean) {
    const { error } = await supabase.rpc("set_active_event", { p_code: on ? ev!.code : "" });
    if (error) { toast.error(error.message); return; }
    toast.success(on ? "This is now the active event shown to visitors." : "No event is active now.");
    refreshTraining(qc);
  }
  async function setPublic(pub: boolean) {
    const { error } = await supabase.from("events").update({ materials_public: pub }).eq("id", ev!.id);
    if (error) { toast.error(error.message); return; }
    refreshTraining(qc);
  }
  const tabs = TABS.filter(([t]) => test || (t !== "results"));
  const ph = phase(ev);

  return (
    <AdminPage
      wide
      title={ev.organized_by || ev.name}
      description={
        <span className="flex flex-wrap items-center gap-1.5">
          <span>{ev.name}</span>
          <span className="font-mono text-xs">[{ev.code}]</span>
          <span>· {pkg?.name ?? "No package"}</span>
          {ev.is_active && <Pill tone="ok">Active</Pill>}
          {ph && <Pill tone={ph === "upcoming" ? "info" : "neutral"}>{phaseLabel[ph]}</Pill>}
        </span>
      }
      actions={
        <>
          <div className="inline-flex rounded-lg border border-border p-0.5" role="radiogroup" aria-label="Who can read the training materials">
            <button
              role="radio"
              aria-checked={!ev.materials_public}
              onClick={() => setPublic(false)}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs ${!ev.materials_public ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              <Lock className="h-3 w-3" />
              Private
            </button>
            <button
              role="radio"
              aria-checked={!!ev.materials_public}
              onClick={() => setPublic(true)}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs ${ev.materials_public ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              <Globe className="h-3 w-3" />
              Public
            </button>
          </div>
          <Button variant={ev.is_active ? "secondary" : "outline"} size="sm" onClick={() => setActive(!ev.is_active)}>
            <Power />
            {ev.is_active ? "Deactivate" : "Make active"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate({ search: { tab, edit: 1 } })}>
            <Pencil />
            Edit
          </Button>
          {test && (
            <Button asChild size="sm">
              <a href={`/workshop/assessment/index.html?report=${encodeURIComponent(ev.code)}`} target="_blank" rel="noopener">
                <FileText />
                Generate report
              </a>
            </Button>
          )}
        </>
      }
    >
      {edit ? (
        <Panel title="Edit training event">
          <TrainingEventForm
            ev={ev}
            onDone={(saved) => navigate({ to: "/admin/trainings/event/$code", params: { code: saved?.code ?? ev.code }, search: { tab } })}
          />
        </Panel>
      ) : null}

      <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label="Event sections">
        {tabs.map(([t, label]) => (
          <Link
            key={t}
            to="/admin/trainings/event/$code"
            params={{ code: ev.code }}
            search={{ tab: t }}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${tab === t ? "border-accent font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === "details" && <Details ev={ev} pkgKey={pkg?.key} pkgName={pkg?.name} course={course} test={test} />}
      {tab === "class" && (
        <ClassView ev={ev} course={course} onBack={() => navigate({ search: { tab: "details" } })} />
      )}
      {tab === "results" && test && (
        <Framed src={`/workshop/assessment/index.html?dash=${encodeURIComponent(ev.code)}`} title="Test results" note="Pre- and post-test analysis for this event." />
      )}
      {tab === "people" && <People ev={ev} />}
      {tab === "feedback" && <EventFeedback ev={ev} course={course} />}
      {tab === "gallery" && <EventGallery eventId={ev.id} />}
    </AdminPage>
  );
}

function Details({ ev, pkgKey, pkgName, course, test }: { ev: TrainingEvent; pkgKey?: string | undefined; pkgName?: string | undefined; course: string; test: boolean }) {
  const qc = useQueryClient();
  const { data: people = [] } = useQuery(peopleQuery);
  const { data: feedback = [] } = useQuery(feedbackQuery);
  const { data: results = {} } = useQuery(resultsCountQuery);
  const [bs, setBs] = useState("");
  useEffect(() => {
    workshop().then(({ EVI }) => setBs(EVI.info(ev)?.dateRange ?? "")).catch(() => {});
  }, [ev]);
  const r = results[ev.code.toUpperCase()] ?? { pre: 0, post: 0 };
  const approved = people.filter((p) => p.status === "approved" && p.event_id === ev.id).length;
  async function patch(p: Partial<TrainingEvent>) {
    const { error } = await supabase.from("events").update(p).eq("id", ev.id);
    if (error) toast.error(error.message);
    refreshTraining(qc);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Approved participants" value={approved} />
        {test && <Stat label="Pre-tests submitted" value={r.pre} />}
        {test && <Stat label="Post-tests submitted" value={r.post} />}
        <Stat label="Feedback" value={feedback.filter((f) => f.event_code === ev.code).length} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Panel title="Event details">
          <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Organizer</dt>
            <dd>{ev.organized_by || "—"}</dd>
            <dt className="text-muted-foreground">Place</dt>
            <dd>{ev.address || "—"}</dd>
            <dt className="text-muted-foreground">Dates</dt>
            <dd>
              {enDates(ev.event_dates)}
              {bs && <div className="text-xs text-muted-foreground">{bs}</div>}
            </dd>
            <dt className="text-muted-foreground">Package</dt>
            <dd>
              {pkgName ?? "—"} <span className="text-xs text-muted-foreground">· {COURSE_LABEL[course]}</span>
            </dd>
            <dt className="text-muted-foreground">Materials</dt>
            <dd>{ev.materials_public ? "Public: anyone with the link" : "Private: approved participants of this event"}</dd>
          </dl>
          {test && (
            <div className="mt-5 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
              <Row label="Pre-test open" on={!!ev.pre_open} onChange={(v) => patch({ pre_open: v })} />
              <Row label="Post-test open" on={!!ev.post_open} onChange={(v) => patch({ post_open: v })} />
              <Row label="Pre: answers shown" on={!!ev.pre_answers} onChange={(v) => patch({ pre_answers: v })} />
              <Row label="Post: answers shown" on={!!ev.post_answers} onChange={(v) => patch({ post_answers: v })} />
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Question set: {ev.question_ids?.length ? `${ev.question_ids.length} questions` : "not made yet (make it under Training events)"}
              </p>
            </div>
          )}
        </Panel>
        <Panel title="Event link and QR codes">
          <TrainingQr ev={ev} packageKey={pkgKey} kinds={test ? ["link", "pre", "post"] : ["link"]} />
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2">
      <Switch checked={on} onCheckedChange={onChange} />
      <span className={on ? "" : "text-muted-foreground"}>{label}</span>
    </label>
  );
}

/** The course page in teaching mode: the session bar, full screen, larger text. */
/* Teaching view: takes the whole browser window (above the admin menu and header) so the
 * course page is as large as possible on a projector. The course page's own "पूरा स्क्रिन"
 * button goes one step further and hides the browser's bars too. */
function ClassView({ ev, course, onBack }: { ev: TrainingEvent; course: string; onBack: () => void }) {
  const [fresh] = useState(() => Date.now().toString(36));
  const page = COURSE_PAGE[course];
  const src = `${page}?event=${encodeURIComponent(ev.code)}&teach=1&embed=1&fresh=${fresh}`;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-1.5 text-sm">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft />
          Back to event
        </Button>
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          <span className="font-medium text-foreground">{ev.organized_by || ev.name}</span>
          <span className="ml-2 font-mono text-xs">[{ev.code}]</span>
        </span>
        <Button asChild size="sm" variant="ghost">
          <a href={`${page}?event=${encodeURIComponent(ev.code)}&teach=1`} target="_blank" rel="noopener">
            <ExternalLink />
            New tab
          </a>
        </Button>
      </div>
      <iframe src={src} title="Class view" allow="fullscreen" allowFullScreen className="min-h-0 w-full flex-1 bg-white" />
    </div>
  );
}

function Framed({ src, title, note }: { src: string; title: string; note: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{note}</span>
        <Button asChild size="sm" variant="ghost">
          <a href={src} target="_blank" rel="noopener">
            <ExternalLink />
            New tab
          </a>
        </Button>
      </div>
      <iframe src={src} title={title} className="h-[78vh] w-full rounded-xl border border-border bg-white" />
    </div>
  );
}

function People({ ev }: { ev: TrainingEvent }) {
  const { data: people = [], isLoading } = useQuery(peopleQuery);
  const { data: mem = [] } = useQuery(membershipsQuery);
  const ids = new Set(mem.filter((m) => m.event_id === ev.id).map((m) => m.profile_id));
  const list = people.filter((p) => p.status === "approved" && (p.event_id === ev.id || ids.has(p.id)));
  const pending = people.filter((p) => p.status === "pending").length;
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  return (
    <Panel
      title={`Approved participants (${list.length})`}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link to="/admin/trainings/participants">{pending ? `Review ${pending} waiting` : "Manage participants"}</Link>
        </Button>
      }
      bodyClassName="p-0"
    >
      {list.length === 0 ? (
        <div className="p-5">
          <Empty>No approved participant in this event yet.</Empty>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Office / section</th>
                <th className="px-4 py-2">Gender</th>
                <th className="px-4 py-2">Age group</th>
                <th className="px-4 py-2">Education</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p, i) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-2 font-medium">{p.full_name}</td>
                  <td className="px-4 py-2">{p.office}</td>
                  <td className="px-4 py-2">{p.gender}</td>
                  <td className="px-4 py-2">{p.age_group}</td>
                  <td className="px-4 py-2">{p.education}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function EventFeedback({ ev, course }: { ev: TrainingEvent; course: string }) {
  const { data = [], isLoading } = useQuery(feedbackQuery);
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  return (
    <Panel title="Participant feedback">
      <FeedbackSummary rows={data.filter((f) => f.event_code === ev.code)} course={course} />
    </Panel>
  );
}
