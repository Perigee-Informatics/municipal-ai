import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { CheckCircle2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { PageIntro } from "@/components/site/PageIntro";
import { toast } from "sonner";
import { PublicShell } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { invitationSettingsQuery, lookupsQuery } from "@/lib/queries";
import { requestSchema, submitRequest } from "@/lib/requests.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/request")({
  head: () => ({
    meta: [
      { title: "Request an Engagement — Dr. Bhoj Raj Ghimire" },
      { name: "description", content: "Invite Dr. Bhoj Raj Ghimire as a keynote speaker, trainer, panelist, chair or expert consultant." },
      { property: "og:title", content: "Request an Engagement — Dr. Bhoj Raj Ghimire" },
      { property: "og:description", content: "Invite Dr. Ghimire to speak, train or advise." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(lookupsQuery), context.queryClient.ensureQueryData(invitationSettingsQuery)]),
  component: RequestPage,
});

const TZS = ["Asia/Kathmandu", "Asia/Kolkata", "Asia/Bangkok", "Asia/Tokyo", "Asia/Dubai", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Australia/Sydney", "UTC"];
const sel = "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring";
type Session = { session_date: string; start_time: string; end_time: string };

function Field({ label, children, req }: { label: string; children: React.ReactNode; req?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{req && <span className="text-accent"> *</span>}</Label>
      {children}
    </div>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <legend className="flex items-center gap-3 px-2 font-display text-lg font-semibold">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary font-sans text-xs text-primary-foreground">{n}</span>
      {title}
    </legend>
  );
}

function Card({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <StepTitle n={n} title={title} />
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function RequestPage() {
  const { t, pick } = useI18n();
  const { data: lookups } = useSuspenseQuery(lookupsQuery);
  const { data: inv } = useSuspenseQuery(invitationSettingsQuery);
  const earliest = inv.min_notice_days ? new Date(Date.now() + inv.min_notice_days * 864e5).toISOString().slice(0, 10) : undefined;
  const submit = useServerFn(submitRequest);
  const startedAt = useRef(Date.now());
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [basis, setBasis] = useState<"paid" | "volunteer">("paid");
  const [mode, setMode] = useState<"in_person" | "online" | "hybrid">("in_person");
  const [sessions, setSessions] = useState<Session[]>([{ session_date: "", start_time: "10:00", end_time: "12:00" }]);
  const [file, setFile] = useState<File | null>(null);

  const updateSession = (i: number, k: keyof Session, v: string) => setSessions((s) => s.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) ?? "");
    const hon = g("honorarium");
    const payload = {
      event_type_id: g("event_type_id"), role_id: g("role_id"), event_title: g("event_title"), organization: g("organization"),
      description: g("description"), timezone: g("timezone"), sessions, basis,
      honorarium: hon ? Number(hon) : null, currency: g("currency") || null, venue_mode: mode,
      venue_name: g("venue_name"), address: g("address"), city: g("city"), country: g("country"), online_link: g("online_link"),
      requester_name: g("requester_name"), requester_email: g("requester_email"), requester_phone: g("requester_phone"),
      requester_designation: g("requester_designation"), website: g("website"), started_at: startedAt.current, attachment_path: null as string | null,
    };
    const parsed = requestSchema.safeParse(payload);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]!;
      toast.error(`${issue.path.join(".") || "Form"}: ${issue.message}`);
      return;
    }
    if (file && (file.type !== "application/pdf" || file.size > 10 * 1024 * 1024)) {
      toast.error("Attachment must be a PDF under 10 MB");
      return;
    }
    setBusy(true);
    try {
      if (file) {
        const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.pdf`;
        const { error } = await supabase.storage.from("attachments").upload(path, file, { contentType: "application/pdf" });
        if (error) throw new Error("Attachment upload failed");
        payload.attachment_path = path;
      }
      const res = await submit({ data: payload });
      if (!res.ok) throw new Error(res.error);
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <PublicShell>
        <div className="container-page flex flex-col items-center py-28 text-center">
          <CheckCircle2 className="h-14 w-14 text-success" />
          <h1 className="mt-6 text-3xl font-semibold">{t("form.thanksTitle")}</h1>
          <p className="mt-3 max-w-md text-muted-foreground">{t("form.thanksBody")}</p>
          <Button className="mt-8" variant="outline" onClick={() => { setDone(false); startedAt.current = Date.now(); setSessions([{ session_date: "", start_time: "10:00", end_time: "12:00" }]); setFile(null); }}>{t("form.another")}</Button>
        </div>
      </PublicShell>
    );

  return (
    <PublicShell>
      <PageIntro eyebrow={t("nav.request")} title={t("form.title")} subtitle={t("form.subtitle")} />
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_18rem]">
        <aside className="order-first lg:order-last">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:sticky lg:top-24">
            <p className="font-display text-lg font-semibold">{t("req.nextTitle")}</p>
            <ol className="mt-4 space-y-4 text-sm">
              {(["req.next1", "req.next2", "req.next3"] as const).map((k, i) => (
                <li key={k} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent-foreground">{i + 1}</span>
                  <span className="text-muted-foreground">{t(k)}</span>
                </li>
              ))}
            </ol>
            <p className="mt-6 flex gap-2 border-t border-border pt-4 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0 text-success" />{t("req.privacy")}</p>
          </div>
        </aside>

        {!inv.accepting ? (
          <div className="min-w-0 rounded-2xl border border-border bg-card p-8 shadow-soft">
            <p className="font-display text-xl font-semibold">{t("req.closedTitle")}</p>
            <p className="mt-3 whitespace-pre-line text-muted-foreground">{pick(inv.closed_message, inv.closed_message_ne) || t("req.closedBody")}</p>
          </div>
        ) : (
        <form onSubmit={onSubmit} className="min-w-0 space-y-8" noValidate>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          <Card n={1} title={t("form.event")}>
            <Field label={t("form.eventType")} req>
              <select name="event_type_id" className={sel} required defaultValue="">
                <option value="" disabled>{t("form.select")}</option>
                {lookups.types.map((x) => <option key={x.id} value={x.id}>{pick(x.name, x.name_ne)}</option>)}
              </select>
            </Field>
            <Field label={t("form.role")} req>
              <select name="role_id" className={sel} required defaultValue="">
                <option value="" disabled>{t("form.select")}</option>
                {lookups.roles.map((x) => <option key={x.id} value={x.id}>{pick(x.name, x.name_ne)}</option>)}
              </select>
            </Field>
            <Field label={t("form.eventTitle")} req><Input name="event_title" required maxLength={200} /></Field>
            <Field label={t("form.organization")} req><Input name="organization" required maxLength={200} /></Field>
            <div className="md:col-span-2"><Field label={t("form.description")}><Textarea name="description" rows={4} maxLength={3000} /></Field></div>
          </Card>

          <fieldset className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <StepTitle n={2} title={t("form.schedule")} />
            <p className="mb-4 text-sm text-muted-foreground">{t("form.scheduleHint")}</p>
            <div className="space-y-3">
              {sessions.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] items-end gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                  <div className="col-span-2 sm:col-span-1"><Field label={t("form.date")}><Input type="date" min={earliest} value={s.session_date} onChange={(e) => updateSession(i, "session_date", e.target.value)} required /></Field></div>
                  <Field label={t("form.start")}><Input type="time" value={s.start_time} onChange={(e) => updateSession(i, "start_time", e.target.value)} /></Field>
                  <Field label={t("form.end")}><Input type="time" value={s.end_time} onChange={(e) => updateSession(i, "end_time", e.target.value)} /></Field>
                  <Button type="button" variant="ghost" size="icon" disabled={sessions.length === 1} onClick={() => setSessions((x) => x.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 /></Button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setSessions((x) => [...x, { start_time: x[x.length - 1]?.start_time ?? "10:00", end_time: x[x.length - 1]?.end_time ?? "12:00", session_date: "" }])}><Plus />{t("form.addSession")}</Button>
              <div className="w-60"><Field label={t("form.timezone")}><select name="timezone" className={sel} defaultValue="Asia/Kathmandu">{TZS.map((z) => <option key={z}>{z}</option>)}</select></Field></div>
            </div>
          </fieldset>

          <Card n={3} title={t("form.basis")}>
            <div className="flex gap-2 md:col-span-2">
              {(["paid", "volunteer"] as const).map((b) => (
                <button type="button" key={b} onClick={() => setBasis(b)} className={`rounded-md border px-4 py-2 text-sm ${basis === b ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{t(b === "paid" ? "form.paid" : "form.volunteer")}</button>
              ))}
            </div>
            {basis === "paid" && (
              <>
                <Field label={t("form.honorarium")}><Input name="honorarium" type="number" min={0} step="any" /></Field>
                <Field label={t("form.currency")}><select name="currency" className={sel} defaultValue={inv.default_currency}>{inv.currencies.map((c) => <option key={c}>{c}</option>)}</select></Field>
              </>
            )}
          </Card>

          <Card n={4} title={t("form.venue")}>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              {(["in_person", "online", "hybrid"] as const).map((m) => (
                <button type="button" key={m} onClick={() => setMode(m)} className={`rounded-md border px-4 py-2 text-sm ${mode === m ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{t(m === "in_person" ? "form.inPerson" : m === "online" ? "form.online" : "form.hybrid")}</button>
              ))}
            </div>
            {mode !== "online" && (
              <>
                <Field label={t("form.venueName")}><Input name="venue_name" /></Field>
                <Field label={t("form.address")}><Input name="address" /></Field>
                <Field label={t("form.city")}><Input name="city" /></Field>
                <Field label={t("form.country")}><Input name="country" defaultValue="Nepal" /></Field>
              </>
            )}
            {mode !== "in_person" && <div className="md:col-span-2"><Field label={t("form.link")}><Input name="online_link" type="url" placeholder="https://" /></Field></div>}
          </Card>

          <Card n={5} title={t("form.you")}>
            <Field label={t("form.name")} req><Input name="requester_name" required /></Field>
            <Field label={t("form.email")} req><Input name="requester_email" type="email" required /></Field>
            <Field label={t("form.phone")}><Input name="requester_phone" type="tel" /></Field>
            <Field label={t("form.designation")}><Input name="requester_designation" /></Field>
            <div className="md:col-span-2"><Field label={t("form.attachment")}><Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field></div>
          </Card>

          <Button type="submit" size="lg" variant="accent" disabled={busy} className="w-full rounded-full md:w-auto">{busy ? t("form.submitting") : t("form.submit")}</Button>
        </form>
        )}
      </div>
    </PublicShell>
  );
}
