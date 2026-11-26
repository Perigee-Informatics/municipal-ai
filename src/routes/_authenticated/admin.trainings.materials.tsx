import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, MonitorPlay, X } from "lucide-react";
import { AdminPage, Field, Panel, Pill, selectCls } from "@/components/admin/AdminPage";
import { Button } from "@/components/ui/button";
import { COURSE_PAGE, courseOfKey, enDates, eventsQuery, eventTitle, packagesQuery, sortEvents } from "@/lib/training-data";

export const Route = createFileRoute("/_authenticated/admin/trainings/materials")({ component: Materials });

const COURSES = [
  { key: "cso", title: "AI for CSOs", text: "5-hour workshop (English): facilitator guide, participant workbook, exercises, use cases, demos and feedback form." },
  { key: "representative", title: "AI for Municipal Representatives", text: "जनप्रतिनिधिका लागि: कार्ययोजना, सामग्री १–१२, आयोजना छनौट क्याल्कुलेटर र पृष्ठपोषण फाराम।" },
  { key: "employee", title: "AI for Municipal Employees", text: "कर्मचारीका लागि तालिम सामग्री, प्रम्प्ट र अभ्यास।" },
  { key: "hied", title: "AI for Higher Education", text: "80-minute session (English) for postgraduate teachers: lesson outlines, summaries, quizzes and presentations with Claude.", short: true },
  { key: "judiciary", title: "AI in Judiciary", text: "2-hour session (English) for judges and court officers: Nepali voice typing, prompt basics, two case-study demos, five group exercises on fictional case papers, guardrails.", short: true },
];

function Materials() {
  const { data: events = [] } = useQuery(eventsQuery);
  const { data: packages = [] } = useQuery(packagesQuery);
  const [shown, setShown] = useState<{ title: string; url: string } | null>(null);
  const keyOf = (id: string | null) => packages.find((p) => p.id === id)?.key;

  return (
    <AdminPage
      title="Training materials"
      description="The course pages of each package. Choose the event: its organiser, place and dates fill the material. Your trainer account always sees them; whether participants need to sign in is set per event (private / public)."
      wide
    >
      <div className="grid gap-4 md:grid-cols-2">
        {COURSES.map((c) => (
          <CourseCard
            key={c.key}
            course={c}
            events={sortEvents(events).filter((e) => courseOfKey(keyOf(e.package_id)) === c.key)}
            onShow={(url) => setShown({ title: c.title, url })}
          />
        ))}
      </div>
      {shown && (
        <Panel
          title={shown.title}
          actions={
            <>
              <Button asChild size="sm" variant="ghost">
                <a href={shown.url} target="_blank" rel="noopener">
                  <ExternalLink />
                  Full screen (new tab)
                </a>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShown(null)} aria-label="Close">
                <X />
              </Button>
            </>
          }
          bodyClassName="p-0"
        >
          <iframe key={shown.url} src={shown.url} title={shown.title} className="h-[78vh] w-full rounded-b-xl bg-white" />
        </Panel>
      )}
    </AdminPage>
  );
}

function CourseCard({
  course,
  events,
  onShow,
}: {
  course: { key: string; title: string; text: string; short?: boolean };
  events: ReturnType<typeof sortEvents>;
  onShow: (url: string) => void;
}) {
  const [code, setCode] = useState(events[0]?.code ?? "");
  const cur = events.find((e) => e.code === code) ?? events[0];
  const url = `${COURSE_PAGE[course.key]}${cur ? `?event=${encodeURIComponent(cur.code)}` : ""}`;
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          {course.title} {course.short && <Pill>Short package</Pill>}
        </span>
      }
    >
      <p className="text-sm text-muted-foreground">{course.text}</p>
      <Field label="For which event?" className="mt-4">
        <select className={selectCls} value={cur?.code ?? ""} onChange={(e) => setCode(e.target.value)} disabled={!events.length}>
          {events.length ? (
            events.map((e) => (
              <option key={e.id} value={e.code}>
                {eventTitle(e)} [{e.code}] · {enDates(e.event_dates)}
              </option>
            ))
          ) : (
            <option>No event of this package yet</option>
          )}
        </select>
      </Field>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onShow(`${url}${url.includes("?") ? "&" : "?"}fresh=${Date.now().toString(36)}`)}>
          <MonitorPlay />
          Show here
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href={url} target="_blank" rel="noopener">
            <ExternalLink />
            Open in new tab
          </a>
        </Button>
      </div>
    </Panel>
  );
}
