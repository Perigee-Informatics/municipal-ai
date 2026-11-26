import { Tx } from "@/lib/admin-i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FilterBar, textMatch, useFilters, valueOptions } from "@/components/admin/FilterBar";
import { AdminPage, Empty, Field, Panel, Pill, selectCls } from "@/components/admin/AdminPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminStoriesQuery } from "@/lib/stories";
import { eventsQuery, organizersQuery, refreshTraining, tk, type Organizer } from "@/lib/training-data";

export const Route = createFileRoute("/_authenticated/admin/masters/organizers")({ component: Organizers });

const ORG_KINDS: Record<string, string> = {
  municipality: "Municipality",
  rural_municipality: "Rural municipality",
  cso: "CSO / NGO",
  university: "University / college / school",
  government: "Government body",
  international: "International agency",
  private: "Company",
  other: "Other",
};
const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

function Organizers() {
  const { data: orgs = [], isLoading } = useQuery(organizersQuery);
  const { data: events = [] } = useQuery(eventsQuery);
  const { data: stories = [] } = useQuery(adminStoriesQuery);
  const { q, setQ, values: f, set } = useFilters();
  const [editing, setEditing] = useState<Partial<Organizer> | null>(null);
  const uses = useMemo(() => {
    const m = new Map<string, { trainings: number; engagements: number }>();
    const bump = (n: string, k: "trainings" | "engagements") => {
      const key = norm(n);
      if (!key) return;
      const v = m.get(key) ?? { trainings: 0, engagements: 0 };
      v[k]++;
      m.set(key, v);
    };
    events.forEach((e) => bump(e.organized_by ?? "", "trainings"));
    // trainings also have an engagement; count only the engagements that are not trainings
    stories.filter((s) => !s.training_event_id).forEach((s) => bump(s.organizer ?? "", "engagements"));
    return m;
  }, [events, stories]);
  const usageOf = (o: Organizer) => uses.get(norm(o.name)) ?? { trainings: 0, engagements: 0 };
  const list = orgs.filter((o) => {
    const u = usageOf(o);
    return (
      textMatch(q, o.name, o.name_ne, o.city, o.contact_person, o.email) &&
      (!f["kind"] || o.kind === f["kind"]) &&
      (!f["city"] || o.city === f["city"]) &&
      (!f["use"] ||
        (f["use"] === "trainings" ? u.trainings > 0 : f["use"] === "engagements" ? u.engagements > 0 : u.trainings + u.engagements === 0)) &&
      (!f["active"] || (f["active"] === "yes") === o.active)
    );
  });

  return (
    <AdminPage
      title="Organizers"
      description="The organisations you work with. They are offered when you add a training event or an engagement; renaming one here can update it everywhere."
      actions={
        <Button onClick={() => setEditing({ kind: "other", active: true, country: "Nepal" })}>
          <Plus />
          <Tx>Add organizer</Tx>
        </Button>
      }
      wide
    >
      {editing && (
        <Panel title={editing.id ? `Edit: ${editing.name}` : "New organizer"}>
          <OrganizerForm o={editing} usage={uses.get(norm(editing.name)) ?? { trainings: 0, engagements: 0 }} onDone={() => setEditing(null)} />
        </Panel>
      )}
      <FilterBar
        q={q}
        onQ={setQ}
        placeholder="Name, city, contact or e-mail"
        values={f}
        onChange={set}
        shown={list.length}
        total={orgs.length}
        filters={[
          { key: "kind", label: "All types", width: "w-52", options: Object.entries(ORG_KINDS).map(([k, v]) => ({ value: k, label: v, count: orgs.filter((o) => o.kind === k).length })) },
          { key: "city", label: "Any city", options: valueOptions(orgs, (o) => o.city) },
          {
            key: "use",
            label: "Any use",
            width: "w-44",
            options: [
              { value: "trainings", label: "Has trainings" },
              { value: "engagements", label: "Has engagements" },
              { value: "unused", label: "Not used yet" },
            ],
          },
          { key: "active", label: "Active or not", width: "w-36", options: [{ value: "yes", label: "Active" }, { value: "no", label: "Inactive" }] },
        ]}
      />
      <Panel
        title={`${list.length} organizer${list.length === 1 ? "" : "s"}`}
        bodyClassName="p-0"
      >
        {isLoading ? (
          <p className="p-5 text-muted-foreground">Loading…</p>
        ) : list.length === 0 ? (
          <div className="p-5">
            <Empty>No organizer found.</Empty>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2"><Tx>Name</Tx></th>
                  <th className="px-4 py-2"><Tx>Type</Tx></th>
                  <th className="px-4 py-2"><Tx>City</Tx></th>
                  <th className="px-4 py-2">Contact</th>
                  <th className="px-4 py-2 text-right">Trainings</th>
                  <th className="px-4 py-2 text-right"><Tx>Engagements</Tx></th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {list.map((o) => {
                  const u = uses.get(norm(o.name)) ?? { trainings: 0, engagements: 0 };
                  return (
                    <tr key={o.id} className={`border-t border-border ${o.active ? "" : "text-muted-foreground"}`}>
                      <td className="px-4 py-2">
                        <div className="font-medium">{o.name}</div>
                        {o.name_ne && <div className="text-xs text-muted-foreground">{o.name_ne}</div>}
                        {!o.active && <Pill>inactive</Pill>}
                      </td>
                      <td className="px-4 py-2">{ORG_KINDS[o.kind] ?? o.kind}</td>
                      <td className="px-4 py-2">{o.city}</td>
                      <td className="px-4 py-2 text-xs">{[o.contact_person, o.email, o.phone].filter(Boolean).join(" · ")}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{u.trainings || ""}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{u.engagements || ""}</td>
                      <td className="px-4 py-2 text-right">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(o)} aria-label={`Edit ${o.name}`}>
                          <Pencil />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </AdminPage>
  );
}

function OrganizerForm({ o, usage, onDone }: { o: Partial<Organizer>; usage: { trainings: number; engagements: number }; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Partial<Organizer>>(o);
  const [propagate, setPropagate] = useState(true);
  const set = (k: keyof Organizer, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  const used = usage.trainings + usage.engagements;
  const renamed = !!o.id && norm(o.name) !== norm(f.name);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const name = (f.name ?? "").trim();
    if (!name) { toast.error("The name is required."); return; }
    const row = {
      name,
      name_ne: f.name_ne?.trim() || null,
      kind: f.kind ?? "other",
      city: f.city?.trim() || null,
      country: f.country?.trim() || null,
      contact_person: f.contact_person?.trim() || null,
      email: f.email?.trim() || null,
      phone: f.phone?.trim() || null,
      website: f.website?.trim() || null,
      notes: f.notes?.trim() || null,
      active: f.active !== false,
    };
    const res = o.id ? await supabase.from("organizers").update(row).eq("id", o.id) : await supabase.from("organizers").insert(row);
    if (res.error) { toast.error(/unique|duplicate/i.test(res.error.message) ? "An organizer with this name already exists." : res.error.message); return; }
    if (renamed && propagate && o.name) {
      // the old name as stored on events and engagements (exact text)
      const a = await supabase.from("events").update({ organized_by: name }).eq("organized_by", o.name);
      const b = await supabase.from("stories").update({ organizer: name }).eq("organizer", o.name);
      if (a.error || b.error) toast.error((a.error ?? b.error)!.message);
    }
    toast.success("Organizer saved.");
    qc.invalidateQueries({ queryKey: tk.organizers });
    refreshTraining(qc);
    onDone();
  }
  async function remove() {
    if (!o.id) return;
    if (!confirm(used ? `Remove "${o.name}" from the list? Its ${used} event(s) keep the name as text.` : `Delete "${o.name}"?`)) return;
    const { error } = await supabase.from("organizers").delete().eq("id", o.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: tk.organizers });
    onDone();
  }

  const txt = (k: keyof Organizer, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <Field label={label}>
      <Input value={String(f[k] ?? "")} onChange={(e) => set(k, e.target.value)} {...props} />
    </Field>
  );
  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {txt("name", "Name *", { required: true })}
        {txt("name_ne", "Name (नेपाली)")}
        <Field label="Type">
          <select className={selectCls} value={f.kind ?? "other"} onChange={(e) => set("kind", e.target.value)}>
            {Object.entries(ORG_KINDS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          {txt("city", "City")}
          {txt("country", "Country")}
        </div>
        {txt("contact_person", "Contact person")}
        {txt("email", "E-mail", { type: "email" })}
        {txt("phone", "Phone")}
        {txt("website", "Website", { type: "url" })}
        <Field label="Notes" className="md:col-span-2">
          <Textarea rows={2} value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={f.active !== false} onCheckedChange={(v) => set("active", v)} />
          Active (offered in forms)
        </label>
      </div>
      {renamed && used > 0 && (
        <label className="flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-sm">
          <Switch checked={propagate} onCheckedChange={setPropagate} />
          Also rename it on its {usage.trainings} training event(s) and {usage.engagements} engagement(s)
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit"><Tx>Save</Tx></Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          <Tx>Cancel</Tx>
        </Button>
        {o.id && (
          <Button type="button" variant="ghost" className="ml-auto text-destructive" onClick={remove}>
            <Trash2 />
            <Tx>Delete</Tx>
          </Button>
        )}
      </div>
    </form>
  );
}
