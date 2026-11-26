import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { AlertTriangle, FileText, CalendarPlus, BookImage } from "lucide-react";
import { downloadIcs } from "@/lib/ics";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { allRequestsQuery, findConflicts, statusTone } from "@/lib/admin-data";
import { adminStoriesQuery } from "@/lib/stories";
import { setRequestStatus } from "@/lib/requests.functions";
import { hm } from "@/components/site/MonthCalendar";

export const Route = createFileRoute("/_authenticated/admin/requests/$id")({ component: Detail });

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  if (v === null || v === undefined || v === "") return null;
  return <div className="grid grid-cols-[9rem_1fr] gap-3 py-1.5 text-sm"><div className="text-muted-foreground">{k}</div><div className="break-words">{v}</div></div>;
}

function Detail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const setStatus = useServerFn(setRequestStatus);
  const { data = [], isLoading } = useQuery(allRequestsQuery);
  const { data: stories = [] } = useQuery(adminStoriesQuery);
  const r = data.find((x) => x.id === id);
  const engagement = stories.find((s) => s.source_request_id === id);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setNotes(r?.private_notes ?? ""), [r?.private_notes]);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!r) return <p>Request not found. <Link to="/admin/requests" className="underline">Back</Link></p>;
  const conflicts = findConflicts(r, stories);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["stories"] }); };

  async function changeStatus(status: "accepted" | "declined" | "tentative" | "pending") {
    setBusy(true);
    try {
      const res = await setStatus({ data: { id, status, message: message || undefined } });
      toast.success(`Marked ${status}${status === "accepted" || status === "declined" ? (res.emailed ? " · requester emailed" : " · email not sent (email service not set up)") : ""}${res.calendar ? " · Google Calendar updated" : ""}${status === "accepted" ? " · added to your engagements" : ""}`);
      setMessage("");
      refresh();
      qc.invalidateQueries({ queryKey: ["public-events"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }
  async function update(patch: { private_notes?: string; show_publicly?: boolean }) {
    const { error } = await supabase.from("appointment_requests").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    refresh();
    qc.invalidateQueries({ queryKey: ["public-events"] });
  }
  async function openAttachment() {
    const { data: s, error } = await supabase.storage.from("attachments").createSignedUrl(r!.attachment_path!, 300);
    if (error) { toast.error(error.message); return; }
    window.open(s.signedUrl, "_blank");
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Link to="/admin/requests" className="text-sm text-muted-foreground hover:underline">← All invitations</Link>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">{r.event_title}</h1>
          <p className="text-muted-foreground">{r.organization} · received {format(parseISO(r.created_at), "d MMM yyyy, HH:mm")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded px-3 py-1 text-sm capitalize ${statusTone[r.status]}`}>{r.status}</span>
          {engagement && <Button size="sm" variant="accent" onClick={() => navigate({ to: "/admin/stories/$id", params: { id: engagement.id } })}><BookImage />Open engagement</Button>}
        </div>
      </div>

      {conflicts.length > 0 && (
        <div className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          <div><div className="font-medium">Schedule conflict</div>
            {conflicts.map((c, i) => <div key={i}>{c.date}: overlaps <Link to="/admin/stories/$id" params={{ id: c.other.id }} className="underline">{c.other.title}</Link></div>)}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-3 font-semibold">Schedule ({r.timezone})</h2>
            <ul className="space-y-1 text-sm">
              {[...r.request_sessions].sort((a, b) => (a.session_date + a.start_time).localeCompare(b.session_date + b.start_time)).map((s) => (
                <li key={s.id}>{format(parseISO(s.session_date), "EEE, d MMM yyyy")} · {hm(s.start_time)}–{hm(s.end_time)}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-3 font-semibold">Details</h2>
            <Row k="Event type" v={r.event_types?.name} />
            <Row k="Role" v={r.roles?.name} />
            <Row k="Basis" v={r.basis === "paid" ? `Paid${r.honorarium ? ` — ${r.honorarium} ${r.currency ?? ""}` : ""}` : "Volunteer / Pro bono"} />
            <Row k="Mode" v={r.venue_mode.replace("_", "-")} />
            <Row k="Venue" v={[r.venue_name, r.address, r.city, r.country].filter(Boolean).join(", ")} />
            <Row k="Online link" v={r.online_link && <a href={r.online_link} target="_blank" rel="noreferrer" className="underline">{r.online_link}</a>} />
            <Row k="Description" v={<span className="whitespace-pre-wrap">{r.description}</span>} />
          </section>
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-3 font-semibold">Requester</h2>
            <Row k="Name" v={r.requester_name} />
            <Row k="Designation" v={r.requester_designation} />
            <Row k="Email" v={<a href={`mailto:${r.requester_email}`} className="underline">{r.requester_email}</a>} />
            <Row k="Phone" v={r.requester_phone} />
            {r.attachment_path && <Button variant="outline" size="sm" className="mt-3" onClick={openAttachment}><FileText />View invitation letter</Button>}
          </section>
        </div>
        <div className="space-y-6">
          <section className="space-y-3 rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold">Decision</h2>
            <Textarea placeholder="Optional message included in the email to the requester" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => changeStatus("accepted")}>Accept</Button>
              <Button disabled={busy} variant="outline" onClick={() => changeStatus("tentative")}>Mark tentative</Button>
              <Button disabled={busy} variant="destructive" onClick={() => changeStatus("declined")}>Decline</Button>
            </div>
            <p className="text-xs text-muted-foreground">Accept and decline email the requester. Accepting adds it to your engagements (Events, Story Map) and Google Calendar; changing your mind later removes it again.</p>
            {r.status === "accepted" && (
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <Button size="sm" variant="outline" onClick={() => downloadIcs(r, r.request_sessions, r.roles?.name)}><CalendarPlus />Add to calendar (.ics)</Button>
              </div>
            )}
          </section>
          <section className="rounded-xl border border-border bg-card p-6">
            <label className="flex items-center justify-between gap-3">
              <span><span className="font-semibold">{r.show_publicly ? "Public when accepted" : "Private when accepted"}</span><span className="block text-xs text-muted-foreground">{engagement ? "Already accepted: change visibility on the engagement itself." : r.show_publicly ? "Visitors will see it on Events and the Story Map once you accept." : "Only you will see it. Turn on to make it public once accepted."}</span></span>
              <Switch checked={engagement ? engagement.is_public : r.show_publicly} disabled={!!engagement} onCheckedChange={(v) => update({ show_publicly: v })} />
            </label>
          </section>
          <section className="space-y-3 rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold">Private notes</h2>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} />
            <Button size="sm" variant="outline" onClick={() => update({ private_notes: notes })}>Save notes</Button>
          </section>
        </div>
      </div>
    </div>
  );
}
