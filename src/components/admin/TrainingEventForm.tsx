import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, selectCls } from "@/components/admin/AdminPage";
import { OrganizerInput, rememberOrganizer } from "@/components/admin/OrganizerInput";
import {
  enDates,
  hasAssessmentKey,
  packagesQuery,
  refreshTraining,
  tk,
  type TrainingEvent,
} from "@/lib/training-data";

export function TrainingEventForm({ ev, onDone }: { ev?: TrainingEvent | null | undefined; onDone: (saved?: TrainingEvent) => void }) {
  const qc = useQueryClient();
  const { data: packages = [] } = useQuery(packagesQuery);
  const [f, setF] = useState({
    name: ev?.name ?? "",
    organized_by: ev?.organized_by ?? "",
    address: ev?.address ?? "",
    code: ev?.code ?? "",
    package_id: ev?.package_id ?? packages[0]?.id ?? "",
    pre_open: !!ev?.pre_open,
    post_open: !!ev?.post_open,
    pre_answers: !!ev?.pre_answers,
    post_answers: !!ev?.post_answers,
  });
  const [dates, setDates] = useState<string[]>([...(ev?.event_dates ?? [])].sort());
  const [dateIn, setDateIn] = useState("");
  const [busy, setBusy] = useState(false);
  const pkgKey = packages.find((p) => p.id === (f.package_id || packages[0]?.id))?.key;
  const test = hasAssessmentKey(pkgKey);
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));

  function addDate(v = dateIn) {
    if (!v) return;
    setDates((d) => (d.includes(v) ? d : [...d, v].sort()));
    setDateIn("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const code = f.code.trim().toUpperCase();
    const all = dateIn && !dates.includes(dateIn) ? [...dates, dateIn].sort() : dates; // a picked but not yet added date counts
    if (!f.name.trim() || !code) { toast.error("Fill in the event name and code."); return; }
    if (!/^[A-Z0-9-]{3,20}$/.test(code)) { toast.error("Code: 3–20 letters, digits or dashes, e.g. AICSO002."); return; }
    if (!all.length) { toast.error("Add at least one date."); return; }
    setBusy(true);
    const payload = {
      ...(ev ? { id: ev.id } : {}),
      name: f.name.trim(),
      code,
      package_id: f.package_id || packages[0]?.id || null,
      organized_by: f.organized_by.trim(),
      address: f.address.trim(),
      event_dates: all,
      pre_open: f.pre_open,
      post_open: f.post_open,
      pre_answers: f.pre_answers,
      post_answers: f.post_answers,
    };
    const { data, error } = await supabase.from("events").upsert(payload, { onConflict: "id" }).select().maybeSingle();
    setBusy(false);
    if (error) {
      toast.error(/duplicate|unique/i.test(error.message) ? `The code ${code} is already used by another event.` : error.message);
      return;
    }
    await rememberOrganizer(payload.organized_by);
    qc.invalidateQueries({ queryKey: tk.organizers });
    refreshTraining(qc);
    toast.success(ev ? "Event updated." : "Event created. It also appears in your engagements, calendar and story map.");
    onDone(data ?? undefined);
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Event name *">
          <Input value={f.name} onChange={(e) => set("name", e.target.value)} required />
        </Field>
        <Field label="Organizer" hint="Pick from your organizers or type a new one; new names are added to the list.">
          <OrganizerInput value={f.organized_by} onChange={(e) => set("organized_by", e.target.value)} />
        </Field>
        <Field label="Address / place">
          <Input value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="e.g. Nagarkot, Bhaktapur" />
        </Field>
        <Field label="Event code *" hint="Participants and QR codes use it; e.g. AICSO002.">
          <Input value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} required className="font-mono uppercase" />
        </Field>
        <Field label="Training package *" className="md:col-span-2">
          <select className={selectCls} value={f.package_id} onChange={(e) => set("package_id", e.target.value)}>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Dates *" hint={dates.length ? enDates(dates) : "Add one or more days."}>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" value={dateIn} onChange={(e) => setDateIn(e.target.value)} className="w-auto" />
          <Button type="button" variant="outline" size="sm" onClick={() => addDate()}>
            Add date
          </Button>
          {dates.map((d) => (
            <span key={d} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">
              {d}
              <button type="button" onClick={() => setDates((x) => x.filter((y) => y !== d))} aria-label={`Remove ${d}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </Field>

      {test && (
        <div className="grid gap-3 rounded-lg border border-border bg-muted/40 p-4 sm:grid-cols-2">
          <Toggle label="Pre-training test open" checked={f.pre_open} onChange={(v) => set("pre_open", v)} />
          <Toggle label="Post-training test open" checked={f.post_open} onChange={(v) => set("post_open", v)} />
          <Toggle label="Pre: show correct answers" checked={f.pre_answers} onChange={(v) => set("pre_answers", v)} />
          <Toggle label="Post: show correct answers" checked={f.post_answers} onChange={(v) => set("post_answers", v)} />
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : ev ? "Save changes" : "Create event"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => onDone()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <Switch checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}
