import { Tx } from "@/lib/admin-i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Field, Panel } from "@/components/admin/AdminPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { invitationSettingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/masters/invitations")({ component: InvitationSettings });

/** Whether new invitations are accepted and the options of the public Request form. */
function InvitationSettings() {
  const qc = useQueryClient();
  const { data: s, isLoading } = useQuery(invitationSettingsQuery);
  const [f, setF] = useState({ accepting: true, closed_message: "", closed_message_ne: "", min_notice_days: "0", currencies: "", default_currency: "NPR" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (s)
      setF({
        accepting: s.accepting,
        closed_message: s.closed_message ?? "",
        closed_message_ne: s.closed_message_ne ?? "",
        min_notice_days: String(s.min_notice_days ?? 0),
        currencies: (s.currencies ?? []).join(", "),
        default_currency: s.default_currency ?? "NPR",
      });
  }, [s]);
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const currencies = [...new Set(f.currencies.split(/[,\s]+/).map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{3}$/.test(c)))];
    if (!currencies.length) { toast.error("Give at least one 3-letter currency code, e.g. NPR."); return; }
    const def = f.default_currency.trim().toUpperCase();
    const days = Math.max(0, Math.min(365, Number(f.min_notice_days) || 0));
    setBusy(true);
    const { error } = await supabase
      .from("invitation_settings")
      .update({
        accepting: f.accepting,
        closed_message: f.closed_message.trim() || null,
        closed_message_ne: f.closed_message_ne.trim() || null,
        min_notice_days: days,
        currencies,
        default_currency: currencies.includes(def) ? def : currencies[0]!,
      })
      .eq("id", 1);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Invitation settings saved.");
    qc.invalidateQueries({ queryKey: ["invitation-settings"] });
  }

  return (
    <AdminPage
      title="Invitation settings"
      description="How the public Request an engagement form behaves. Event types and roles offered on the form are under Event types & roles."
      actions={
        <>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/catalog"><Tx>Event types & roles</Tx></Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/request" target="_blank" rel="noopener">
              <ExternalLink />
              <Tx>View the form</Tx>
            </a>
          </Button>
        </>
      }
    >
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <form onSubmit={save} className="space-y-6">
          <Panel title="Accepting invitations">
            <label className="flex items-center gap-3">
              <Switch checked={f.accepting} onCheckedChange={(v) => set("accepting", v)} />
              <span className="text-sm">
                {f.accepting ? (
                  <>
                    <b>Open.</b> The home page shows "Open to invitations" and the Request form is available.
                  </>
                ) : (
                  <>
                    <b>Closed.</b> The home page says you are not taking new invitations; the Request form shows the message below.
                  </>
                )}
              </span>
            </label>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Message when closed (English)" hint="Empty: a short default message.">
                <Textarea rows={3} value={f.closed_message} onChange={(e) => set("closed_message", e.target.value)} />
              </Field>
              <Field label="Message when closed (नेपाली)">
                <Textarea rows={3} value={f.closed_message_ne} onChange={(e) => set("closed_message_ne", e.target.value)} />
              </Field>
            </div>
          </Panel>
          <Panel title="Request form">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Minimum notice (days)" hint="The earliest date that can be requested is today plus this many days.">
                <Input type="number" min={0} max={365} value={f.min_notice_days} onChange={(e) => set("min_notice_days", e.target.value)} />
              </Field>
              <Field label="Currencies offered" hint="3-letter codes, comma-separated.">
                <Input value={f.currencies} onChange={(e) => set("currencies", e.target.value)} />
              </Field>
              <Field label="Default currency">
                <Input value={f.default_currency} onChange={(e) => set("default_currency", e.target.value)} maxLength={3} className="uppercase" />
              </Field>
            </div>
          </Panel>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save settings"}
          </Button>
        </form>
      )}
    </AdminPage>
  );
}
