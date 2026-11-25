import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, CalendarCheck, CalendarOff, Star, Trash2, Upload, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { adminStoriesQuery } from "@/lib/stories";
import { importMediaFromUrl, pushEngagement, removeEngagementFromGoogle } from "@/lib/admin.functions";
import { formatBs } from "@/lib/nepali-date";

const LocationPicker = lazy(() => import("@/components/admin/LocationPicker"));

export const Route = createFileRoute("/_authenticated/admin/stories/$id")({ component: StoryEditor });

type Form = Partial<Tables<"stories">>;
const sel = "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

function L({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={wide ? "md:col-span-2" : ""}><label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>{children}</div>;
}

function StoryEditor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const importUrl = useServerFn(importMediaFromUrl);
  const push = useServerFn(pushEngagement);
  const unpush = useServerFn(removeEngagementFromGoogle);
  const { data: stories = [] } = useQuery(adminStoriesQuery);
  const { data: lookups } = useQuery({
    queryKey: ["admin", "lookups-all"],
    queryFn: async () => ({
      types: (await supabase.from("event_types").select("id,name").order("name")).data ?? [],
      roles: (await supabase.from("roles").select("id,name").order("name")).data ?? [],
    }),
  });
  const story = stories.find((s) => s.id === id);
  const [f, setF] = useState<Form>({});
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  useEffect(() => {
    if (story) {
      const { event_types: _a, roles: _b, story_media: _c, media: _d, cover: _e, ...rest } = story;
      setF(rest);
    }
  }, [story?.id, story?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin", "stories"] }); qc.invalidateQueries({ queryKey: ["stories"] }); };
  if (!story) return <p className="text-muted-foreground">Loading… <Link to="/admin/stories" className="underline">Back</Link></p>;
  const set = (k: keyof Form, v: unknown) => setF((x) => ({ ...x, [k]: v === "" ? null : v }));

  async function save() {
    if (!f.title || !f.event_date) { toast.error("Title and date are required"); return; }
    if (f.start_time && f.end_time && (f.end_date ?? f.event_date) === f.event_date && f.end_time <= f.start_time) { toast.error("End time must be after start time"); return; }
    // Sync bookkeeping is owned by the server; never overwrite it from the form.
    const { id: _id, created_at: _c, updated_at: _u, google_event_id: _g, google_synced_at: _gs, source: _s, source_request_id: _r, ...patch } = f;
    const { error } = await supabase.from("stories").update({ ...patch, end_date: patch.end_date && patch.end_date > f.event_date ? patch.end_date : null }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    const g = await push({ data: { id } }).catch(() => ({ synced: false as boolean | null }));
    toast.success(g.synced ? "Saved · Google Calendar updated" : "Saved");
    refresh();
  }
  async function remove() {
    if (!confirm("Delete this engagement, its photos and its Google Calendar entry? It disappears from Events and the Story Map.")) return;
    await unpush({ data: { id } }).catch(() => undefined);
    const paths = story!.media.map((m) => m.storage_path);
    if (paths.length) await supabase.storage.from("story-media").remove(paths);
    await supabase.from("stories").delete().eq("id", id);
    refresh();
    navigate({ to: "/admin/stories" });
  }
  async function upload(files: FileList | File[]) {
    setBusy(true);
    let n = story!.media.reduce((m, x) => Math.max(m, x.sort_order), 0);
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      if (!isVideo && !file.type.startsWith("image/")) { toast.error(`${file.name}: not an image or video`); continue; }
      if (file.size > 200 * 1024 * 1024) { toast.error(`${file.name}: larger than 200 MB`); continue; }
      n++;
      const ext = file.name.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "jpg");
      const path = `stories/${id}/${n}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("story-media").upload(path, file, { contentType: file.type });
      if (error) { toast.error(`${file.name}: ${error.message}`); continue; }
      const { data: row } = await supabase.from("story_media").insert({ story_id: id, storage_path: path, media_type: isVideo ? "video" : "image", sort_order: n }).select("id").single();
      if (!story!.cover_media_id && !isVideo && row) await supabase.from("stories").update({ cover_media_id: row.id }).eq("id", id);
    }
    setBusy(false);
    refresh();
  }
  async function fromUrl() {
    if (!url) return;
    setBusy(true);
    try {
      const r = await importUrl({ data: { storyId: id, url } });
      toast.success(r.skipped ? "Already imported" : "Imported");
      setUrl("");
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Import failed"); }
    setBusy(false);
  }
  const media = story.media;
  async function move(i: number, d: -1 | 1) {
    const a = media[i], b = media[i + d];
    if (!a || !b) return;
    await Promise.all([supabase.from("story_media").update({ sort_order: b.sort_order }).eq("id", a.id), supabase.from("story_media").update({ sort_order: a.sort_order }).eq("id", b.id)]);
    refresh();
  }
  async function delMedia(m: (typeof media)[number]) {
    await supabase.storage.from("story-media").remove([m.storage_path]);
    await supabase.from("story_media").delete().eq("id", m.id);
    refresh();
  }

  return (
    <div className="space-y-6">
      <Link to="/admin/stories" className="text-sm text-muted-foreground hover:underline">← All engagements</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{story.title}</h1>
        <div className="flex gap-2"><Button variant="destructive" size="sm" onClick={remove}><Trash2 />Delete</Button><Button onClick={save}>Save</Button></div>
      </div>

      <section className="grid gap-4 rounded-xl border border-border bg-card p-6 md:grid-cols-2">
        <L label="Title *" wide><Input value={f.title ?? ""} onChange={(e) => set("title", e.target.value)} /></L>
        <L label="Title (नेपाली)" wide><Input value={f.title_ne ?? ""} onChange={(e) => set("title_ne", e.target.value)} /></L>
        <L label="Date *"><Input type="date" value={f.event_date ?? ""} onChange={(e) => set("event_date", e.target.value)} /></L>
        <L label="End date"><Input type="date" value={f.end_date ?? ""} onChange={(e) => set("end_date", e.target.value)} /></L>
        <L label="Event type"><select className={sel} value={f.event_type_id ?? ""} onChange={(e) => set("event_type_id", e.target.value)}><option value="">—</option>{lookups?.types.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></L>
        <L label="Role"><select className={sel} value={f.role_id ?? ""} onChange={(e) => set("role_id", e.target.value)}><option value="">—</option>{lookups?.roles.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></L>
        <L label="Organizer"><Input value={f.organizer ?? ""} onChange={(e) => set("organizer", e.target.value)} /></L>
        <L label="Facebook post URL"><Input value={f.facebook_post_url ?? ""} onChange={(e) => set("facebook_post_url", e.target.value)} /></L>
        <L label="Description" wide><Textarea rows={4} value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} /></L>
        <L label="Description (नेपाली)" wide><Textarea rows={3} value={f.description_ne ?? ""} onChange={(e) => set("description_ne", e.target.value)} /></L>
        <label className="flex items-center gap-3 text-sm md:col-span-2"><Switch checked={!!f.is_public} onCheckedChange={(v) => set("is_public", v)} />{f.is_public ? "Public: shown on the Events calendar, Story Map and Portfolio Dashboard" : "Private: only you can see it (it still blocks your calendar)"}</label>
      </section>

      <section className="grid gap-4 rounded-xl border border-border bg-card p-6 md:grid-cols-2">
        <div className="flex flex-wrap items-center justify-between gap-2 md:col-span-2">
          <h2 className="font-semibold">When</h2>
          <span className="text-xs text-muted-foreground">{f.event_date && `${formatBs(f.event_date, false)} BS`}{f.end_date && f.end_date > (f.event_date ?? "") ? ` – ${formatBs(f.end_date, false)} BS` : ""}</span>
        </div>
        <label className="flex items-center gap-3 text-sm md:col-span-2">
          <Switch checked={!f.start_time} onCheckedChange={(v) => setF((x) => ({ ...x, start_time: v ? null : "10:00", end_time: v ? null : "12:00" }))} />
          {f.start_time ? "Set times" : "All day"}
        </label>
        {f.start_time && (
          <>
            <L label="Start time"><Input type="time" value={(f.start_time ?? "").slice(0, 5)} onChange={(e) => set("start_time", e.target.value)} /></L>
            <L label="End time"><Input type="time" value={(f.end_time ?? "").slice(0, 5)} onChange={(e) => set("end_time", e.target.value)} /></L>
          </>
        )}
        <L label="Mode">
          <select className={sel} value={f.venue_mode ?? "in_person"} onChange={(e) => set("venue_mode", e.target.value)}>
            <option value="in_person">In person</option><option value="online">Online</option><option value="hybrid">Hybrid</option>
          </select>
        </L>
        <L label="Venue"><Input value={f.venue_name ?? ""} onChange={(e) => set("venue_name", e.target.value)} placeholder="Hall, hotel or building" /></L>
        {f.venue_mode !== "in_person" && <L label="Online link (private)" wide><Input value={f.online_link ?? ""} onChange={(e) => set("online_link", e.target.value)} /></L>}
        <L label="Private notes (only you)" wide><Textarea rows={3} value={f.private_notes ?? ""} onChange={(e) => set("private_notes", e.target.value)} /></L>
        <div className="flex items-center gap-2 text-xs text-muted-foreground md:col-span-2">
          {story.google_event_id ? <><CalendarCheck className="h-4 w-4 text-success" />In Google Calendar. Edits here or in Google are synced both ways.</>
            : story.google_sync ? <><CalendarOff className="h-4 w-4" />Not in Google Calendar yet. It is sent on save once Google is connected (Settings).</>
            : <><CalendarOff className="h-4 w-4" />Deleted in Google Calendar, so it is no longer synced.<button type="button" className="underline" onClick={() => set("google_sync", true)}>Sync again</button></>}
          {story.source !== "site" && <span className="ml-auto rounded bg-secondary px-2 py-0.5">{story.source === "google" ? "Added in Google Calendar" : "From an engagement request"}</span>}
        </div>
      </section>

      <section className="grid gap-4 rounded-xl border border-border bg-card p-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="font-semibold">Place on the Story Map</h2>
          {f.latitude == null && <p className="mt-1 text-xs font-medium text-muted-foreground">No map pin yet, so it is not on the Story Map. Click the map to place it.</p>}
        </div>
        <L label="City"><Input value={f.city ?? ""} onChange={(e) => set("city", e.target.value)} /></L>
        <L label="Country"><Input value={f.country ?? ""} onChange={(e) => set("country", e.target.value)} /></L>
        <L label="Latitude"><Input type="number" step="any" value={f.latitude ?? ""} onChange={(e) => set("latitude", e.target.value === "" ? null : +e.target.value)} /></L>
        <L label="Longitude"><Input type="number" step="any" value={f.longitude ?? ""} onChange={(e) => set("longitude", e.target.value === "" ? null : +e.target.value)} /></L>
        <div className="md:col-span-2">
          <p className="mb-2 text-xs text-muted-foreground">Click the map or drag the pin to set the exact location.</p>
          <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
            <LocationPicker lat={f.latitude ?? 27.7172} lng={f.longitude ?? 85.324} onChange={(la, ln) => setF((x) => ({ ...x, latitude: +la.toFixed(5), longitude: +ln.toFixed(5), location_needs_review: false }))} />
          </Suspense>
        </div>
        <label className="flex items-center gap-3 text-sm"><Switch checked={!!f.location_needs_review} onCheckedChange={(v) => set("location_needs_review", v)} />Location needs review (admin only)</label>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Photos & videos</h2>
        <label
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-sm ${drag ? "border-accent bg-accent/10" : "border-border"}`}
        >
          <Upload className="h-6 w-6 text-muted-foreground" />
          <span>{busy ? "Uploading…" : "Drop photos or MP4 videos here, or click to choose (up to 200 MB each)"}</span>
          <input type="file" multiple accept="image/*,video/mp4" className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />
        </label>
        <div className="flex gap-2">
          <Input placeholder="Import from URL (image or video link)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button variant="outline" onClick={fromUrl} disabled={busy || !url}><Link2 />Import</Button>
        </div>
        <ul className="space-y-2">
          {media.map((m, i) => (
            <li key={m.id} className="flex items-center gap-3 rounded-lg border border-border p-2">
              <div className="flex flex-col">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-30" aria-label="Up"><ArrowUp className="h-4 w-4" /></button>
                <button onClick={() => move(i, 1)} disabled={i === media.length - 1} className="disabled:opacity-30" aria-label="Down"><ArrowDown className="h-4 w-4" /></button>
              </div>
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded bg-muted">
                {m.media_type === "image" ? <img src={m.url} alt="" className="h-full w-full object-cover" /> : <video src={m.url} className="h-full w-full object-cover" />}
              </div>
              <Input
                defaultValue={m.caption ?? ""}
                placeholder="Caption"
                onBlur={async (e) => { if (e.target.value !== (m.caption ?? "")) { await supabase.from("story_media").update({ caption: e.target.value || null }).eq("id", m.id); refresh(); } }}
              />
              <Button size="icon" variant={story.cover_media_id === m.id ? "accent" : "ghost"} title="Use as cover" onClick={async () => { await supabase.from("stories").update({ cover_media_id: m.id }).eq("id", id); refresh(); }}><Star /></Button>
              <Button size="icon" variant="ghost" onClick={() => delMedia(m)} aria-label="Delete"><Trash2 /></Button>
            </li>
          ))}
        </ul>
      </section>
      <div className="flex justify-end"><Button onClick={save}>Save engagement</Button></div>
    </div>
  );
}
