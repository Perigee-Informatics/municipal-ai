import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { AdminPage, Field, Panel, selectCls } from "@/components/admin/AdminPage";
import { FeedbackSummary } from "@/components/admin/FeedbackSummary";
import { Button } from "@/components/ui/button";
import { courseOfKey, eventsQuery, eventTitle, feedbackQuery, packagesQuery, sortEvents } from "@/lib/training-data";

export const Route = createFileRoute("/_authenticated/admin/trainings/results")({ component: Results });

function Results() {
  const { data: events = [] } = useQuery(eventsQuery);
  const { data: packages = [] } = useQuery(packagesQuery);
  const { data: feedback = [], isLoading } = useQuery(feedbackQuery);
  const [code, setCode] = useState("");
  const withFb = sortEvents(events).filter((e) => feedback.some((f) => f.event_code === e.code));
  const ev = events.find((e) => e.code === code);
  const course = courseOfKey(packages.find((p) => p.id === ev?.package_id)?.key);
  // feedback questions differ per course: "all events" groups by the course of the first event with feedback
  const rows = code ? feedback.filter((f) => f.event_code === code) : feedback;
  const dash = "/workshop/assessment/index.html";

  return (
    <AdminPage title="Results & feedback" description="Test results of all events and what participants said about the trainings." wide>
      <Panel
        title="Test dashboard"
        description="Pre- and post-test analysis by event and participant code."
        actions={
          <Button asChild size="sm" variant="ghost">
            <a href={dash} target="_blank" rel="noopener">
              <ExternalLink />
              New tab
            </a>
          </Button>
        }
        bodyClassName="p-0"
      >
        <iframe src={dash} title="Test dashboard" className="h-[70vh] w-full rounded-b-xl bg-white" />
      </Panel>

      <Panel
        title="Participant feedback"
        actions={
          <Field label="" className="w-72">
            <select className={selectCls} value={code} onChange={(e) => setCode(e.target.value)} aria-label="Event">
              <option value="">All events ({feedback.length})</option>
              {withFb.map((e) => (
                <option key={e.id} value={e.code}>
                  {eventTitle(e)} [{e.code}] · {feedback.filter((f) => f.event_code === e.code).length}
                </option>
              ))}
            </select>
          </Field>
        }
      >
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : !code && new Set(withFb.map((e) => courseOfKey(packages.find((p) => p.id === e.package_id)?.key))).size > 1 ? (
          <p className="text-sm text-muted-foreground">
            The questions differ between training packages, so choose an event to see its ratings. ({feedback.length} responses in all.)
          </p>
        ) : (
          <FeedbackSummary
            rows={rows}
            course={code ? course : courseOfKey(packages.find((p) => p.id === withFb[0]?.package_id)?.key)}
          />
        )}
      </Panel>
    </AdminPage>
  );
}
