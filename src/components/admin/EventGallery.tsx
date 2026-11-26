import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ImagePlus, Play, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Empty } from "@/components/admin/AdminPage";
import { workshop } from "@/lib/workshop-legacy";
import { mediaQuery, publicMediaUrl, tk, type MediaRow } from "@/lib/training-data";

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const ext = (type: string) => (type === "image/webp" ? "webp" : "jpg");

/**
 * Photos and short videos of a training event (bucket "event-media"). Photos are made smaller in
 * the browser before upload (the same preparation as the workshop pages); ★ puts an item on the
 * public gallery and the home page.
 */
export function EventGallery({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery(mediaQuery(eventId));
  const [status, setStatus] = useState("");
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: tk.media(eventId) });
    qc.invalidateQueries({ queryKey: ["gallery"] });
    qc.invalidateQueries({ queryKey: ["stories"] });
  };
  const bucket = () => supabase.storage.from("event-media");

  async function uploadOne(file: File) {
    const { EventMedia } = await workshop();
    const base = `${eventId}/${uid()}`;
    let row: Omit<MediaRow, "id" | "created_at" | "featured" | "caption">;
    if (file.type.startsWith("image/")) {
      const ph = await EventMedia.preparePhoto(file);
      const e = ext(ph.full.blob.type);
      const a = await bucket().upload(`${base}.${e}`, ph.full.blob, { contentType: ph.full.blob.type, cacheControl: "31536000" });
      if (a.error) throw a.error;
      const b = await bucket().upload(`${base}-t.${e}`, ph.thumb.blob, { contentType: ph.thumb.blob.type, cacheControl: "31536000" });
      if (b.error) throw b.error;
      row = { event_id: eventId, kind: "photo", path: `${base}.${e}`, thumb_path: `${base}-t.${e}`, width: ph.full.width, height: ph.full.height, bytes: ph.full.blob.size };
    } else if (file.type.startsWith("video/")) {
      const vi = await EventMedia.prepareVideo(file);
      const ve = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
      const a = await bucket().upload(`${base}.${ve}`, file, { contentType: file.type, cacheControl: "31536000" });
      if (a.error) throw a.error;
      let thumb = "";
      if (vi.thumb) {
        const t = `${base}-t.${ext(vi.thumb.blob.type)}`;
        if (!(await bucket().upload(t, vi.thumb.blob, { contentType: vi.thumb.blob.type })).error) thumb = t;
      }
      row = { event_id: eventId, kind: "video", path: `${base}.${ve}`, thumb_path: thumb, width: vi.width, height: vi.height, bytes: file.size };
    } else {
      throw new Error("Only photos and videos can be added.");
    }
    const { error } = await supabase.from("event_media").insert(row);
    if (error) {
      await bucket().remove([row.path, row.thumb_path].filter(Boolean));
      throw error;
    }
  }

  async function addFiles(list: FileList | null) {
    const files = Array.from(list ?? []);
    let ok = 0;
    for (const [i, f] of files.entries()) {
      setStatus(`Preparing and uploading ${i + 1} of ${files.length}: ${f.name}…`);
      try {
        await uploadOne(f);
        ok++;
      } catch (e) {
        toast.error(`${f.name}: ${(e as Error).message ?? e}`);
      }
    }
    setStatus("");
    if (ok) toast.success(`${ok} added. Star the ones to show on the public gallery.`);
    refresh();
  }

  async function patch(m: MediaRow, p: Partial<MediaRow>) {
    const { error } = await supabase.from("event_media").update(p).eq("id", m.id);
    if (error) toast.error(error.message);
    refresh();
  }
  async function remove(m: MediaRow) {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    const { error } = await supabase.from("event_media").delete().eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    await bucket().remove([m.path, m.thumb_path].filter(Boolean));
    refresh();
  }

  const featured = items.filter((m) => m.featured).length;
  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center text-sm ${over ? "border-accent bg-accent/10" : "border-border"}`}
      >
        <ImagePlus className="h-6 w-6 text-muted-foreground" />
        <p>
          Drop photos or short videos here, or{" "}
          <button type="button" className="font-medium text-primary underline" onClick={() => input.current?.click()}>
            choose files
          </button>
          .
        </p>
        <p className="text-xs text-muted-foreground">
          Photos are made smaller before upload (longest side 1600 px). Videos: up to 90 seconds and 40 MB. Starred items ({featured}) appear on
          the public gallery.
        </p>
        <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
        {status && <p className="text-xs font-medium text-accent" aria-live="polite">{status}</p>}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <Empty>No photos or videos yet.</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => {
            const thumb = publicMediaUrl(m.thumb_path || (m.kind === "photo" ? m.path : ""));
            return (
              <figure key={m.id} className="overflow-hidden rounded-lg border border-border bg-card">
                <a href={publicMediaUrl(m.path)} target="_blank" rel="noopener" className="relative block aspect-[4/3] bg-muted">
                  {thumb && <img src={thumb} alt={m.caption} loading="lazy" className="h-full w-full object-cover" />}
                  {m.kind === "video" && <Play className="absolute inset-0 m-auto h-8 w-8 text-white drop-shadow" />}
                </a>
                <figcaption className="space-y-2 p-2">
                  <Input
                    defaultValue={m.caption}
                    placeholder="Caption"
                    className="h-8 text-xs"
                    onBlur={(e) => e.target.value !== m.caption && patch(m, { caption: e.target.value.trim() })}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  />
                  <div className="flex items-center justify-between">
                    <Button
                      size="sm"
                      variant={m.featured ? "secondary" : "ghost"}
                      onClick={() => patch(m, { featured: !m.featured })}
                      aria-pressed={m.featured}
                      title={m.featured ? "Shown on the public gallery" : "Show on the public gallery"}
                    >
                      <Star className={m.featured ? "fill-accent text-accent" : ""} />
                      {m.featured ? "Featured" : "Feature"}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(m)} aria-label="Delete">
                      <Trash2 />
                    </Button>
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );
}
