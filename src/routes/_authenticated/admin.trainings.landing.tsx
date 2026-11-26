import { Tx } from "@/lib/admin-i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Camera, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Field, Panel } from "@/components/admin/AdminPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { workshop } from "@/lib/workshop-legacy";
import { publicMediaUrl, siteProfileQuery, tk } from "@/lib/training-data";

export const Route = createFileRoute("/_authenticated/admin/trainings/landing")({ component: ProgrammePage });

/** The trainer card on the AI for ALL page (/ai-for-all): name, role, short bio, highlights, photo. */
function ProgrammePage() {
  const qc = useQueryClient();
  const { data: sp, isLoading } = useQuery(siteProfileQuery);
  const [f, setF] = useState({ name: "", title: "", organisation: "", linkedin_url: "", bio: "", highlights: "" });
  const [busy, setBusy] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");
  useEffect(() => {
    if (sp)
      setF({
        name: sp.name ?? "",
        title: sp.title ?? "",
        organisation: sp.organisation ?? "",
        linkedin_url: sp.linkedin_url ?? "",
        bio: sp.bio ?? "",
        highlights: (sp.highlights ?? []).join("\n"),
      });
  }, [sp]);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const refresh = () => {
    qc.invalidateQueries({ queryKey: tk.siteProfile });
    qc.invalidateQueries({ queryKey: ["portfolio"] });
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase
      .from("site_profile")
      .update({
        name: f.name.trim(),
        title: f.title.trim(),
        organisation: f.organisation.trim(),
        linkedin_url: f.linkedin_url.trim(),
        bio: f.bio.trim(),
        highlights: f.highlights.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 12),
      })
      .eq("id", 1);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved. The AI for ALL page shows it now.");
    refresh();
  }

  async function photo(file: File | undefined) {
    if (!file) return;
    setPhotoMsg("Making it smaller and uploading…");
    try {
      const { EventMedia } = await workshop();
      const big = await EventMedia.resize(file, 800, 0.85);
      const path = `site/profile-${Date.now()}.${big.blob.type === "image/webp" ? "webp" : "jpg"}`;
      const up = await supabase.storage.from("event-media").upload(path, big.blob, { contentType: big.blob.type, cacheControl: "31536000" });
      if (up.error) throw up.error;
      const old = sp?.photo_path;
      const { error } = await supabase.from("site_profile").update({ photo_path: path }).eq("id", 1);
      if (error) throw error;
      if (old) await supabase.storage.from("event-media").remove([old]);
      setPhotoMsg("Photo changed.");
      refresh();
    } catch (err) {
      setPhotoMsg(`Could not change the photo: ${(err as Error).message ?? err}`);
    }
  }

  return (
    <AdminPage
      title="Programme page"
      description="The trainer card on the AI for ALL page. Gallery photos come from each training event's Gallery tab (★ to feature)."
      actions={
        <Button asChild variant="outline" size="sm">
          <a href="/ai-for-all" target="_blank" rel="noopener">
            <ExternalLink />
            <Tx>View the page</Tx>
          </a>
        </Button>
      }
    >
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <form onSubmit={save}>
          <Panel title="Trainer profile">
            <div className="mb-6 flex items-center gap-5">
              <img
                src={publicMediaUrl(sp?.photo_path) || undefined}
                alt="Profile photo"
                className="h-24 w-24 rounded-full border border-border bg-muted object-cover"
              />
              <div className="space-y-1">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted">
                  <Camera className="h-4 w-4" />
                  <Tx>Change photo</Tx>
                  <input type="file" accept="image/*" hidden onChange={(e) => (photo(e.target.files?.[0]), (e.target.value = ""))} />
                </label>
                <p className="text-xs text-muted-foreground">{photoMsg || "A square face photo works best; it is made 800 px on upload."}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name">
                <Input value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={80} required />
              </Field>
              <Field label="Title / role">
                <Input value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={120} />
              </Field>
              <Field label="Organisation">
                <Input value={f.organisation} onChange={(e) => set("organisation", e.target.value)} maxLength={120} />
              </Field>
              <Field label="LinkedIn link">
                <Input type="url" value={f.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} maxLength={200} />
              </Field>
              <Field label="Short bio" className="md:col-span-2">
                <Textarea rows={5} value={f.bio} onChange={(e) => set("bio", e.target.value)} maxLength={1500} />
              </Field>
              <Field label="Highlights (one per line, up to 12)" className="md:col-span-2">
                <Textarea rows={5} value={f.highlights} onChange={(e) => set("highlights", e.target.value)} maxLength={1500} />
              </Field>
            </div>
            <Button type="submit" className="mt-5" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </Panel>
        </form>
      )}
    </AdminPage>
  );
}
