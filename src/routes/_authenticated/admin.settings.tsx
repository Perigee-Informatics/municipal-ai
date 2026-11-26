import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { CalendarCheck, Copy, FileText, ImageUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { portfolioQuery } from "@/lib/queries";
import { chooseGcalCalendar, disconnectGcal, getGcalAuthUrl, getGcalStatus, getImportInfo } from "@/lib/admin.functions";
import { syncSummary } from "@/components/admin/GoogleSyncBar";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  validateSearch: z.object({ gcal: z.string().optional() }),
  component: Settings,
});

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-4 rounded-xl border border-border bg-card p-6"><h2 className="font-semibold">{title}</h2>{children}</section>;
}

function Settings() {
  const { gcal } = Route.useSearch();
  const qc = useQueryClient();
  const { data: pf, refetch } = useQuery(portfolioQuery);
  const p = pf?.profile;
  const [stats, setStats] = useState({ facebook_followers: "", linkedin_followers: "", linkedin_connections: "" });
  useEffect(() => { if (p) setStats({ facebook_followers: p.facebook_followers ?? "", linkedin_followers: p.linkedin_followers ?? "", linkedin_connections: p.linkedin_connections ?? "" }); }, [p]);

  const fetchStatus = useServerFn(getGcalStatus);
  const fetchUrl = useServerFn(getGcalAuthUrl);
  const disconnect = useServerFn(disconnectGcal);
  const choose = useServerFn(chooseGcalCalendar);
  const [switching, setSwitching] = useState(false);
  const fetchImport = useServerFn(getImportInfo);
  const { data: status, refetch: refetchStatus } = useQuery({ queryKey: ["admin", "gcal"], queryFn: () => fetchStatus() });
  const { data: imp } = useQuery({ queryKey: ["admin", "import"], queryFn: () => fetchImport() });
  useEffect(() => { if (gcal) (gcal === "connected" ? toast.success("Google Calendar connected and synced") : toast.error(`Google Calendar: ${gcal.replace(/_/g, " ")}`)); }, [gcal]);

  const after = () => { refetch(); qc.invalidateQueries({ queryKey: ["portfolio"] }); };
  async function uploadFile(file: File, kind: "photo" | "cv") {
    if (kind === "cv" && file.type !== "application/pdf") { toast.error("CV must be a PDF"); return; }
    if (kind === "photo" && !file.type.startsWith("image/")) { toast.error("Choose an image"); return; }
    const path = `${kind}/${Date.now()}-${file.name.replace(/[^\w.]+/g, "_")}`;
    const { error } = await supabase.storage.from("site-files").upload(path, file, { contentType: file.type });
    if (error) { toast.error(error.message); return; }
    const { error: e2 } = await supabase.from("profile").update(kind === "photo" ? { photo_url: `storage:${path}` } : { cv_path: `storage:${path}` }).eq("id", 1);
    if (e2) { toast.error(e2.message); return; }
    toast.success(kind === "photo" ? "Photo updated" : "CV uploaded");
    after();
  }
  async function clear(kind: "photo" | "cv") {
    await supabase.from("profile").update(kind === "photo" ? { photo_url: null } : { cv_path: null }).eq("id", 1);
    after();
  }
  async function saveStats() {
    const { error } = await supabase.from("profile").update({ facebook_followers: stats.facebook_followers || null, linkedin_followers: stats.linkedin_followers || null, linkedin_connections: stats.linkedin_connections || null }).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    after();
  }
  const endpoint = typeof window !== "undefined" ? `${window.location.origin}/api/public/import-story-media` : "";
  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copied"); };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="border-b border-border pb-5"><h1 className="text-2xl font-semibold md:text-3xl">Site & integrations</h1><p className="mt-1.5 text-sm text-muted-foreground">Profile photo, CV, social numbers, Google Calendar and photo import.</p></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Profile photo">
          <div className="flex items-center gap-4">
            <div className="flex h-28 w-24 items-center justify-center overflow-hidden rounded-lg bg-muted">
              {pf?.photoUrl ? <img src={pf.photoUrl} alt="" className="h-full w-full object-cover" /> : <span className="font-display text-2xl text-accent">BRG</span>}
            </div>
            <div className="space-y-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-muted"><ImageUp className="h-4 w-4" />Upload photo<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "photo")} /></label>
              {pf?.photoUrl && <Button variant="ghost" size="sm" onClick={() => clear("photo")}>Remove (show BRG monogram)</Button>}
            </div>
          </div>
        </Card>
        <Card title="CV (PDF)">
          <p className="text-sm text-muted-foreground">Shown as "Download CV" on the Portfolio Dashboard.</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-muted"><FileText className="h-4 w-4" />{pf?.cvUrl ? "Replace CV" : "Upload CV"}<input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "cv")} /></label>
            {pf?.cvUrl && <><a href={pf.cvUrl} target="_blank" rel="noreferrer" className="text-sm underline">View current</a><Button variant="ghost" size="sm" onClick={() => clear("cv")}>Remove</Button></>}
          </div>
        </Card>
        <Card title="Social stats">
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="text-xs text-muted-foreground">Facebook followers</label><Input value={stats.facebook_followers} onChange={(e) => setStats({ ...stats, facebook_followers: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">LinkedIn followers</label><Input value={stats.linkedin_followers} onChange={(e) => setStats({ ...stats, linkedin_followers: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">LinkedIn connections</label><Input value={stats.linkedin_connections} onChange={(e) => setStats({ ...stats, linkedin_connections: e.target.value })} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Profile links (Instagram, Google Scholar, ResearchGate, ORCID…) are edited under Portfolio content → Profile.</p>
          <Button size="sm" onClick={saveStats}>Save stats</Button>
        </Card>
        <Card title="Google Calendar">
          {!status ? <p className="text-sm text-muted-foreground">Checking…</p> : !status.configured ? (
            <p className="text-sm text-muted-foreground">Waiting for Google credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET). Once they are added, a "Connect Google Calendar" button appears here.</p>
          ) : status.connected ? (
            <div className="space-y-4 text-sm">
              <p className="flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-success" />Connected{status.email ? ` as ${status.email}` : ""}. {status.linked} engagements are in Google.</p>
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Sync engagements with</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {([
                    [false, "Engagements calendar", "A separate calendar in your Google account, made by the Hub. Your other events stay untouched."],
                    [true, "My main calendar", "Your primary Google calendar. Events you add there from now on also come into the Hub as private engagements."],
                  ] as const).map(([v, title, hint]) => (
                    <button key={title} type="button" disabled={switching} onClick={async () => {
                      if (v === status.useMain) return;
                      if (!confirm(`Switch to ${title}? Every engagement is sent to it again. Entries already in the other calendar stay there; delete them in Google if you no longer want them.`)) return;
                      setSwitching(true);
                      try { toast.success(syncSummary(await choose({ data: { useMain: v } }))); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
                      setSwitching(false);
                      refetchStatus();
                      qc.invalidateQueries({ queryKey: ["admin", "stories"] });
                    }} className={`rounded-lg border p-3 text-left ${status.useMain === v ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-secondary/60"}`}>
                      <span className="block font-medium">{title}</span><span className="block text-xs text-muted-foreground">{hint}</span>
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Edits sync both ways: change an engagement here and Google updates; add, move or delete it in Google and the Hub follows within seconds. If both change at once, the Hub's edit wins. Engagements from Google arrive private and without a map pin.</p>
              <Button variant="outline" size="sm" onClick={async () => { if (!confirm("Disconnect Google Calendar? Engagements stay in the Hub and in Google, but stop syncing.")) return; await disconnect(); refetchStatus(); }}>Disconnect</Button>
            </div>
          ) : (
            <Button onClick={async () => { try { const { url } = await fetchUrl(); window.location.href = url; } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } }}>Connect Google Calendar</Button>
          )}
        </Card>
        <Card title="Bulk media import (Facebook photos)">
          <p className="text-sm text-muted-foreground">POST JSON to this address with the header <code>x-import-token</code>. Keep the token private.</p>
          <div className="space-y-2 text-xs">
            <div className="flex gap-2"><Input readOnly value={endpoint} /><Button size="icon" variant="outline" onClick={() => copy(endpoint)}><Copy /></Button></div>
            <div className="flex gap-2"><Input readOnly type="password" value={imp?.token ?? ""} /><Button size="icon" variant="outline" onClick={() => imp && copy(imp.token)}><Copy /></Button></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
