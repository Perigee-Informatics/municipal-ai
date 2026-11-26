import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Field, Panel, Pill } from "@/components/admin/AdminPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  COURSE_LABEL,
  courseOfKey,
  isShortKey,
  eventsQuery,
  packagesQuery,
  POOL_SIZE,
  sortEvents,
  tk,
  type TrainingPackage,
} from "@/lib/training-data";

export const Route = createFileRoute("/_authenticated/admin/masters/packages")({ component: Packages });

const LEVEL: Record<string, string> = { municipal: "नगरपालिका (municipality)", rural: "गाउँपालिका (rural municipality)" };
const levelOf = (key: string) => (/-rural$/.test(key) ? LEVEL["rural"] : /-municipal$/.test(key) ? LEVEL["municipal"] : "");

function Packages() {
  const { data: packages = [], isLoading } = useQuery(packagesQuery);
  const { data: events = [] } = useQuery(eventsQuery);
  const [editing, setEditing] = useState<string | null>(null);
  const isShort = (p: TrainingPackage) => p.is_short || isShortKey(p.key);
  const groups = [
    ["Training packages", packages.filter((p) => !isShort(p))],
    ["Short training packages", packages.filter(isShort)],
  ] as const;

  return (
    <AdminPage
      title="Training packages"
      description="The AI for ALL packages. Each has its own course materials and (except short packages) its own question bank, so a new package is added in code; here you name and describe them."
    >
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {groups.map(([title, list]) =>
        list.length ? (
          <Panel key={title} title={title} bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {list.map((p) => {
                const mine = sortEvents(events.filter((e) => e.package_id === p.id));
                const course = courseOfKey(p.key);
                return (
                  <li key={p.id} className="px-5 py-4">
                    {editing === p.id ? (
                      <PackageForm p={p} onDone={() => setEditing(null)} />
                    ) : (
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{p.name}</span>
                            <Pill>{COURSE_LABEL[course]}</Pill>
                            {levelOf(p.key) && <Pill tone="info">{levelOf(p.key)}</Pill>}
                            <span className="font-mono text-[11px] text-muted-foreground">{p.key}</span>
                          </div>
                          {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                          <p className="text-xs text-muted-foreground">
                            {[p.audience && `For: ${p.audience}`, p.duration && `Duration: ${p.duration}`, POOL_SIZE[course] ? `${POOL_SIZE[course]}-question bank` : "No test"]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          <div className="flex flex-wrap gap-1 pt-1 text-xs">
                            {mine.length ? (
                              mine.map((e) => (
                                <Link
                                  key={e.id}
                                  to="/admin/trainings/event/$code"
                                  params={{ code: e.code }}
                                  className="rounded-full bg-secondary px-2 py-0.5 hover:bg-accent/30"
                                >
                                  {e.organized_by || e.name} [{e.code}]
                                  {e.is_active ? " · active" : ""}
                                </Link>
                              ))
                            ) : (
                              <span className="text-muted-foreground">No event yet</span>
                            )}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setEditing(p.id)}>
                          <Pencil />
                          Edit
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        ) : null,
      )}
    </AdminPage>
  );
}

function PackageForm({ p, onDone }: { p: TrainingPackage; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: p.name,
    description: p.description ?? "",
    audience: p.audience ?? "",
    duration: p.duration ?? "",
    sort_order: String(p.sort_order ?? 0),
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) { toast.error("The name cannot be empty."); return; }
    const { error } = await supabase
      .from("training_packages")
      .update({
        name: f.name.trim(),
        description: f.description.trim() || null,
        audience: f.audience.trim() || null,
        duration: f.duration.trim() || null,
        sort_order: Number(f.sort_order) || 0,
      })
      .eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Package saved.");
    qc.invalidateQueries({ queryKey: tk.packages });
    onDone();
  }
  return (
    <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
      <Field label="Name" className="md:col-span-2">
        <Input value={f.name} onChange={(e) => set("name", e.target.value)} required />
      </Field>
      <Field label="Description" className="md:col-span-2">
        <Textarea rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} />
      </Field>
      <Field label="Audience">
        <Input value={f.audience} onChange={(e) => set("audience", e.target.value)} placeholder="e.g. municipal staff" />
      </Field>
      <Field label="Duration">
        <Input value={f.duration} onChange={(e) => set("duration", e.target.value)} placeholder="e.g. 2 days, 80 minutes" />
      </Field>
      <Field label="Order in lists">
        <Input type="number" value={f.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
      </Field>
      <div className="flex items-end gap-2">
        <Button type="submit">Save</Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
