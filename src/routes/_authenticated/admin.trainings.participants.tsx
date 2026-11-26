import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { FilterBar, inPeriod, monthOptions, textMatch, useFilters, valueOptions, yearOptions, type FilterDef } from "@/components/admin/FilterBar";
import { AdminPage, Empty, Field, Panel, Pill, selectCls } from "@/components/admin/AdminPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  eventsQuery,
  eventTitle,
  membershipsQuery,
  packagesQuery,
  peopleQuery,
  sortEvents,
  tk,
  type Participant,
  type TrainingEvent,
} from "@/lib/training-data";

export const Route = createFileRoute("/_authenticated/admin/trainings/participants")({ component: Participants });

function Participants() {
  const qc = useQueryClient();
  const { data: people = [], isLoading } = useQuery(peopleQuery);
  const { data: events = [] } = useQuery(eventsQuery);
  const { data: mem = [] } = useQuery(membershipsQuery);
  const { data: packages = [] } = useQuery(packagesQuery);
  const { q, setQ, values: f, set } = useFilters();
  const sorted = useMemo(() => sortEvents(events), [events]);
  const evName = (id: string | null) => {
    const e = events.find((x) => x.id === id);
    return e ? `${eventTitle(e)} (${e.code})` : "No event";
  };
  const memOf = (pid: string) => mem.filter((m) => m.profile_id === pid).map((m) => m.event_id);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: tk.people });
    qc.invalidateQueries({ queryKey: tk.memberships });
  };
  /* A participant's events: every event they belong to, plus the one they registered for. */
  const eventsOf = (p: Participant) =>
    [...new Set([...(p.event_id ? [p.event_id] : []), ...memOf(p.id)])]
      .map((id) => events.find((e) => e.id === id))
      .filter((e): e is TrainingEvent => !!e);
  const eventFiltersSet = !!(f["pkg"] || f["year"] || f["month"] || f["event"]);
  const match = (p: Participant) => {
    if (!textMatch(q, p.full_name, p.office, p.education)) return false;
    if (f["gender"] && p.gender !== f["gender"]) return false;
    if (f["age"] && p.age_group !== f["age"]) return false;
    if (f["edu"] && p.education !== f["edu"]) return false;
    if (!eventFiltersSet) return true;
    return eventsOf(p).some(
      (e) =>
        (!f["event"] || e.id === f["event"]) &&
        (!f["pkg"] || e.package_id === f["pkg"]) &&
        inPeriod(e.event_dates ?? [], f["year"], f["month"]),
    );
  };
  const allPending = people.filter((p) => p.status === "pending");
  const allApproved = people.filter((p) => p.status === "approved");
  const pending = allPending.filter(match);
  const approved = allApproved.filter(match);
  const filters: FilterDef[] = [
    { key: "pkg", label: "All packages", width: "w-52", options: packages.map((k) => ({ value: k.id, label: k.name })) },
    { key: "year", label: "Any year", width: "w-28", options: yearOptions(events.flatMap((e) => e.event_dates ?? [])) },
    { key: "month", label: "Any month", width: "w-32", options: monthOptions() },
    {
      key: "event",
      label: "All events",
      width: "w-56",
      options: sorted
        .filter((e) => (!f["pkg"] || e.package_id === f["pkg"]) && inPeriod(e.event_dates ?? [], f["year"], f["month"]))
        .map((e) => ({ value: e.id, label: `${eventTitle(e)} (${e.code})` })),
    },
    { key: "gender", label: "Any gender", width: "w-32", options: valueOptions(people, (p) => p.gender) },
    { key: "age", label: "Any age group", width: "w-36", options: valueOptions(people, (p) => p.age_group) },
    { key: "edu", label: "Any education", width: "w-40", options: valueOptions(people, (p) => p.education) },
  ];

  async function setStatus(id: string, status: "approved" | "rejected" | "pending", eventId: string | null) {
    const patch: Partial<Participant> = { status };
    if (status === "approved") patch.event_id = eventId;
    if (status !== "approved") patch.event_id = null;
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    refresh();
  }
  async function removeMembership(p: Participant, evId: string) {
    if (!confirm(`Remove ${p.full_name} from "${evName(evId)}"?`)) return;
    const { error } = await supabase.from("participant_events").delete().eq("profile_id", p.id).eq("event_id", evId);
    if (error) { toast.error(error.message); return; }
    const others = memOf(p.id).filter((x) => x !== evId);
    if (p.event_id === evId && others[0]) await setStatus(p.id, "approved", others[0]);
    else refresh();
  }

  return (
    <AdminPage
      title="Participants"
      description="Approve new registrations into a training event, move people between events, and create accounts yourself when confirmation e-mails do not arrive."
      wide
    >
      <FilterBar
        q={q}
        onQ={setQ}
        placeholder="Name, office or education"
        filters={filters}
        values={f}
        onChange={set}
        shown={pending.length + approved.length}
        total={allPending.length + allApproved.length}
      />
      <Panel
        title={
          <span className="flex items-center gap-2">
            Waiting for approval {pending.length > 0 && <Pill tone="warn">{pending.length}</Pill>}
          </span>
        }
        bodyClassName="p-0"
      >
        {isLoading ? (
          <p className="p-5 text-muted-foreground">Loading…</p>
        ) : pending.length === 0 ? (
          <div className="p-5">
            <Empty>{allPending.length ? "No waiting registration matches the filters." : "No new registrations."}</Empty>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {pending.map((p) => (
              <PendingRow key={p.id} p={p} events={sorted} onApprove={(ev) => setStatus(p.id, "approved", ev)} onReject={() => setStatus(p.id, "rejected", null)} />
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title={`Approved participants (${approved.length})`}
        bodyClassName="p-0"
      >
        {approved.length === 0 ? (
          <div className="p-5">
            <Empty>{allApproved.length ? "No approved participant matches the filters." : "No approved participant yet."}</Empty>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {approved.map((p) => {
              const evs = memOf(p.id);
              return (
                <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                  <Person p={p} />
                  <div className="flex max-w-xl flex-col items-end gap-2">
                    <div className="flex flex-wrap justify-end gap-1">
                      {evs.map((id) => (
                        <span key={id} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs">
                          {evName(id)}
                          {id === p.event_id && <span className="font-semibold">· current</span>}
                          {evs.length > 1 && (
                            <button onClick={() => removeMembership(p, id)} aria-label="Remove from this event" title="Remove from this event">
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <select
                        className={cn(selectCls, "h-8 w-64 text-xs")}
                        value={p.event_id ?? ""}
                        onChange={(e) => e.target.value && setStatus(p.id, "approved", e.target.value)}
                        aria-label="Current / add event"
                        title="Current event; choosing another adds it"
                      >
                        {!p.event_id && <option value="">— choose event —</option>}
                        {sorted.map((e) => (
                          <option key={e.id} value={e.id}>
                            {eventTitle(e)} ({e.code})
                          </option>
                        ))}
                      </select>
                      <Button size="sm" variant="ghost" onClick={() => setStatus(p.id, "pending", null)}>
                        Revoke
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <ManualAccounts events={sorted} onDone={refresh} />
    </AdminPage>
  );
}

function Person({ p }: { p: Participant }) {
  return (
    <div className="min-w-0">
      <div className="font-medium">{p.full_name || "(no name yet)"}</div>
      <div className="text-xs text-muted-foreground">{[p.office, p.education, p.age_group, p.gender].filter(Boolean).join(" · ")}</div>
    </div>
  );
}

function PendingRow({ p, events, onApprove, onReject }: { p: Participant; events: TrainingEvent[]; onApprove: (ev: string) => void; onReject: () => void }) {
  const [ev, setEv] = useState(p.event_id ?? events.find((e) => e.is_active)?.id ?? "");
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <Person p={p} />
      <div className="flex flex-wrap items-center gap-2">
        <select className={cn(selectCls, "h-8 w-64 text-xs")} value={ev} onChange={(e) => setEv(e.target.value)} aria-label="Event">
          <option value="">— choose event —</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {eventTitle(e)} ({e.code})
            </option>
          ))}
        </select>
        <Button size="sm" onClick={() => (ev ? onApprove(ev) : toast.error("Choose the event first."))}>
          <Check />
          Approve
        </Button>
        <Button size="sm" variant="ghost" onClick={onReject}>
          Reject
        </Button>
      </div>
    </li>
  );
}

type Created = { email: string; status: string; message: string; password?: string };

/** Backup when e-mail confirmation does not reach people: the trainer creates approved accounts. */
function ManualAccounts({ events, onDone }: { events: TrainingEvent[]; onDone: () => void }) {
  const [ev, setEv] = useState(events.find((e) => e.is_active)?.id ?? "");
  // the events arrive after the first render: preselect the active one once they do
  useEffect(() => {
    if (!ev) setEv(events.find((e) => e.is_active)?.id ?? "");
  }, [events]); // eslint-disable-line react-hooks/exhaustive-deps
  const [mode, setMode] = useState<"one" | "bulk">("one");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ event: string; results: Created[] } | null>(null);

  async function create(list: { email: string; password: string }[]) {
    if (!ev) { toast.error("Choose the event first."); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-create-participants", { body: { event_id: ev, participants: list } });
    setBusy(false);
    if (error) {
      const code = (await (error as { context?: Response }).context?.json?.().catch(() => null))?.error;
      { toast.error(
        { "not-trainer": "This account may not do this.", "event-not-found": "Event not found.", "too-many": "At most 100 at a time." }[code as string] ??
          `Could not create: ${code ?? error.message}`,
      ); return; }
    }
    setOut({ event: data.event, results: data.results ?? [] });
    onDone();
  }
  function submitOne(e: React.FormEvent) {
    e.preventDefault();
    if (pw && pw.length < 8) { toast.error("Password: at least 8 characters."); return; }
    create([{ email: email.trim(), password: pw }]).then(() => (setEmail(""), setPw("")));
  }
  function submitBulk() {
    const rows: { email: string; password: string }[] = [];
    const errs: string[] = [];
    csv.split(/\r?\n/).forEach((line, i) => {
      const c = line.trim().split(",").map((x) => x.trim());
      if (!c[0] || c[0].toLowerCase() === "email") return;
      if (c[0].indexOf("@") < 1) errs.push(`line ${i + 1}`);
      else rows.push({ email: c[0], password: c[1] || "" });
    });
    if (errs.length) { toast.error(`E-mail not valid on ${errs.join(", ")}.`); return; }
    if (!rows.length) { toast.error("No line found."); return; }
    if (rows.length > 100) { toast.error("At most 100 at a time."); return; }
    create(rows);
  }
  const copy = (t: string) => navigator.clipboard.writeText(t).then(() => toast.success("Copied"));

  return (
    <Panel
      title="Create accounts yourself"
      description="When confirmation e-mails do not arrive: accounts are created approved and joined to the event. Passwords are shown only once here; send them privately."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Event" className="min-w-[18rem] flex-1">
            <select className={selectCls} value={ev} onChange={(e) => setEv(e.target.value)}>
              <option value="">— choose event —</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {eventTitle(e)} ({e.code})
                </option>
              ))}
            </select>
          </Field>
          <div className="inline-flex rounded-lg border border-border p-0.5">
            {(["one", "bulk"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-md px-3 py-1.5 text-sm ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {m === "one" ? "One by one" : "Bulk (CSV)"}
              </button>
            ))}
          </div>
        </div>
        {mode === "one" ? (
          <form onSubmit={submitOne} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <Field label="E-mail (user name)">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Password (empty: made automatically, ≥ 8 characters)">
              <Input value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="off" />
            </Field>
            <Button type="submit" disabled={busy}>
              <UserPlus />
              Create account
            </Button>
          </form>
        ) : (
          <div className="space-y-2">
            <Field label="One per line: e-mail, or e-mail,password (password made automatically when missing). Up to 100.">
              <Textarea rows={6} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={"ram@example.com\nsita@example.com,Sita@2083"} />
            </Field>
            <Button onClick={submitBulk} disabled={busy}>
              <UserPlus />
              Create all
            </Button>
          </div>
        )}
        {out && (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {out.event}: {out.results.filter((r) => r.status === "created").length} of {out.results.length} created
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copy(out.results.filter((r) => r.password).map((r) => `${r.email}\t${r.password}`).join("\n"))}
              >
                <Copy />
                Copy all e-mails and passwords
              </Button>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {out.results.map((r) => (
                  <tr key={r.email} className="border-t border-border">
                    <td className="py-1.5 pr-3">{r.email}</td>
                    <td className={`py-1.5 pr-3 ${r.status === "created" ? "text-success" : "text-destructive"}`}>{r.message}</td>
                    <td className="py-1.5">
                      {r.password ? (
                        <span className="inline-flex items-center gap-2">
                          <code className="rounded bg-muted px-1.5">{r.password}</code>
                          <button onClick={() => copy(r.password!)} aria-label="Copy password">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Panel>
  );
}
