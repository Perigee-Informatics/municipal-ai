import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { signPaths } from "@/lib/stories";

/**
 * One public gallery for the whole site: photos and videos of AI for ALL trainings (featured by
 * the trainer, public `event-media` bucket) and of public engagements (`story-media`, signed URLs).
 * Every item is tagged to its engagement (story) so the gallery can be filtered by event.
 */
export type GalleryPhoto = {
  id: string;
  source: "training" | "engagement";
  kind: "photo" | "video";
  url: string;
  thumbUrl: string;
  caption: string;
  width: number | null;
  height: number | null;
  storyId: string | null;
  title: string;
  titleNe: string | null;
  date: string | null;
  city: string | null;
  organizer: string | null;
};

export const galleryQuery = queryOptions({
  queryKey: ["gallery"],
  queryFn: async (): Promise<GalleryPhoto[]> => {
    const { data, error } = await supabase.rpc("public_gallery", { p_limit: 500 });
    if (error) throw error;
    const rows = data ?? [];
    const signed = await signPaths(
      "story-media",
      rows.filter((r) => r.bucket === "story-media").map((r) => r.path),
    );
    const pub = (p: string) =>
      p ? supabase.storage.from("event-media").getPublicUrl(p).data.publicUrl : "";
    return rows.map((r) => {
      const isPublic = r.bucket === "event-media";
      const url = isPublic ? pub(r.path) : (signed.get(r.path) ?? "");
      const kind = r.kind === "video" ? "video" : "photo";
      const thumb = isPublic
        ? pub(r.thumb_path || (kind === "photo" ? r.path : ""))
        : kind === "photo"
          ? url
          : "";
      return {
        id: r.id,
        source: r.source === "training" ? "training" : "engagement",
        kind,
        url,
        thumbUrl: thumb,
        caption: r.caption ?? "",
        width: r.width,
        height: r.height,
        storyId: r.story_id,
        title: r.story_title ?? "",
        titleNe: r.story_title_ne,
        date: r.event_date,
        city: r.city,
        organizer: r.organizer,
      };
    });
  },
});
