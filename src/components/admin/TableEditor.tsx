import { Tx } from "@/lib/admin-i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export type FieldDef = { key: string; label: string; type?: "text" | "textarea" | "bool" | "select"; options?: string[]; required?: boolean };
type TableName = "event_types" | "roles" | "highlights" | "expertise" | "education" | "experience" | "publications" | "certifications";
type Row = Record<string, unknown> & { id: string; sort_order: number };

export function TableEditor({ table, title, fields, display }: { table: TableName; title: string; fields: FieldDef[]; // eslint-disable-next-line @typescript-eslint/no-explicit-any
  display: (r: any) => React.ReactNode }) {
  const qc = useQueryClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase.from(table) as any;
  const { data: rows = [] } = useQuery({
    queryKey: ["admin", "table", table],
    queryFn: async () => {
      const { data, error } = await db.select("*").order("sort_order");
      if (error) throw error;
      return data as Row[];
    },
  });
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "table", table] });
    qc.invalidateQueries({ queryKey: ["portfolio"] });
    qc.invalidateQueries({ queryKey: ["lookups"] });
  };

  async function save() {
    if (!editing) return;
    for (const f of fields) if (f.required && !editing[f.key]) { toast.error(`${f.label} is required`); return; }
    const payload: Record<string, unknown> = {};
    fields.forEach((f) => (payload[f.key] = editing[f.key] === "" ? null : editing[f.key] ?? (f.type === "bool" ? false : null)));
    const res = editing.id
      ? await db.update(payload).eq("id", editing.id)
      : await db.insert({ ...payload, sort_order: (rows.at(-1)?.sort_order ?? 0) + 1 });
    if (res.error) { toast.error(res.error.message); return; }
    setEditing(null);
    refresh();
  }
  async function remove(id: string) {
    if (!confirm("Delete this item?")) return;
    const { error } = await db.delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }
  async function move(i: number, dir: -1 | 1) {
    const a = rows[i], b = rows[i + dir];
    if (!a || !b) return;
    await Promise.all([db.update({ sort_order: b.sort_order }).eq("id", a.id), db.update({ sort_order: a.sort_order }).eq("id", b.id)]);
    refresh();
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-semibold"><Tx>{title}</Tx></h2>
        <Button size="sm" onClick={() => setEditing({})}><Plus />Add</Button>
      </div>
      {editing && (
        <div className="grid gap-3 border-b border-border bg-muted/40 p-4 md:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className={f.type === "textarea" ? "md:col-span-2" : ""}>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{f.label}{f.required && " *"}</label>
              {f.type === "textarea" ? (
                <Textarea rows={3} value={String(editing[f.key] ?? "")} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} />
              ) : f.type === "bool" ? (
                <Switch checked={editing[f.key] !== false} onCheckedChange={(v) => setEditing({ ...editing, [f.key]: v })} />
              ) : f.type === "select" ? (
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={String(editing[f.key] ?? f.options![0])} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}>
                  {f.options!.map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <Input value={String(editing[f.key] ?? "")} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} />
              )}
            </div>
          ))}
          <div className="flex gap-2 md:col-span-2">
            <Button size="sm" onClick={save}><Tx>Save</Tx></Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><Tx>Cancel</Tx></Button>
          </div>
        </div>
      )}
      <ul className="divide-y divide-border">
        {rows.length === 0 && <li className="p-4 text-sm text-muted-foreground">No items.</li>}
        {rows.map((r, i) => (
          <li key={r.id} className="flex items-center gap-2 p-3">
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-muted-foreground disabled:opacity-30" aria-label="Up"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="text-muted-foreground disabled:opacity-30" aria-label="Down"><ArrowDown className="h-3.5 w-3.5" /></button>
            </div>
            <div className="min-w-0 flex-1 text-sm">{display(r)}</div>
            <Button size="icon" variant="ghost" onClick={() => setEditing(r)} aria-label="Edit"><Pencil /></Button>
            <Button size="icon" variant="ghost" onClick={() => remove(r.id)} aria-label="Delete"><Trash2 /></Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
