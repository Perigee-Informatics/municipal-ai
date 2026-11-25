import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type StoryMedia = Tables<"story_media"> & { url: string };
export type Story = Tables<"stories"> & {
  event_types: { name: string; name_ne: string | null } | null;
  roles: { name: string; name_ne: string | null } | null;
  story_media: Tables<"story_media">[];
};
/** One engagement: shown on the Events calendar and, when it has a place, on the Story Map. */
export type StoryView = Story & { media: StoryMedia[]; cover: StoryMedia | null };

/** Signs storage paths in batch (buckets are private; read is allowed by policy). */
export async function signPaths(bucket: string, paths: string[], ttl = 60 * 60 * 6) {
  const map = new Map<string, string>();
  const uniq = [...new Set(paths.filter(Boolean))];
  for (let i = 0; i < uniq.length; i += 100) {
    const { data } = await supabase.storage.from(bucket).createSignedUrls(uniq.slice(i, i + 100), ttl);
    data?.forEach((d) => d.path && d.signedUrl && map.set(d.path, d.signedUrl));
  }
  return map;
}

/**
 * Photos and videos of AI for ALL trainings live in the public `event-media` bucket, tagged to
 * the training (`event_media.event_id`); each training has one engagement (stories.training_event_id).
 * For visitors they are shown with that engagement, after its own media. Only the ones the trainer
 * marked "featured" are readable by visitors (RLS on event_media).
 */
async function trainingMedia(rows: Story[]): Promise<Map<string, StoryMedia[]>> {
  const byEvent = new Map<string, string>();
  rows.forEach((r) => r.training_event_id && byEvent.set(r.training_event_id, r.id));
  const out = new Map<string, StoryMedia[]>();
  if (!byEvent.size) return out;
  const { data } = await supabase
    .from("event_media")
    .select("id, event_id, kind, path, thumb_path, caption, created_at")
    .in("event_id", [...byEvent.keys()])
    .eq("featured", true)
    .order("created_at");
  (data ?? []).forEach((m, i) => {
    const storyId = byEvent.get(m.event_id);
    if (!storyId) return;
    const item: StoryMedia = {
      id: m.id,
      story_id: storyId,
      storage_path: m.path,
      media_type: m.kind === "video" ? "video" : "image",
      caption: m.caption || null,
      sort_order: 1000 + i,
      source_url: null,
      created_at: m.created_at,
      url: supabase.storage.from("event-media").getPublicUrl(m.path).data.publicUrl,
    };
    out.set(storyId, [...(out.get(storyId) ?? []), item]);
  });
  return out;
}

export async function hydrateStories(rows: Story[], withTrainingMedia = false): Promise<StoryView[]> {
  const [urls, extra] = await Promise.all([
    signPaths("story-media", rows.flatMap((r) => r.story_media.map((m) => m.storage_path))),
    withTrainingMedia ? trainingMedia(rows) : Promise.resolve(new Map<string, StoryMedia[]>()),
  ]);
  return rows.map((r) => {
    const media = [...r.story_media]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => ({ ...m, url: urls.get(m.storage_path) ?? "" }))
      .concat(extra.get(r.id) ?? []);
    const cover = media.find((m) => m.id === r.cover_media_id) ?? media.find((m) => m.media_type === "image") ?? null;
    return { ...r, media, cover };
  });
}

const SELECT = "*, event_types(name,name_ne), roles(name,name_ne), story_media!story_media_story_id_fkey(*)";
/** Visitors may not read private notes, online links or sync fields (column grants, db-setup/merge-hub.sql). */
const PUBLIC_SELECT =
  "id, created_at, updated_at, event_date, end_date, event_type_id, role_id, title, title_ne, organizer, city, country, latitude, longitude, location_needs_review, description, description_ne, facebook_post_url, is_public, cover_media_id, start_time, end_time, venue_mode, venue_name, training_event_id, event_types(name,name_ne), roles(name,name_ne), story_media!story_media_story_id_fkey(*)";

export const publicStoriesQuery = queryOptions({
  queryKey: ["stories", "public"],
  queryFn: async () => {
    const { data, error } = await supabase.from("stories").select(PUBLIC_SELECT).eq("is_public", true).order("event_date", { ascending: false });
    if (error) throw error;
    return hydrateStories(data as unknown as Story[], true);
  },
});

/** Number of AI for ALL trainings in the public list (one engagement per training). */
export const trainingsCountQuery = queryOptions({
  queryKey: ["stories", "trainings-count"],
  queryFn: async () => {
    const { count, error } = await supabase
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("is_public", true)
      .not("training_event_id", "is", null);
    if (error) throw error;
    return count ?? 0;
  },
});

export const adminStoriesQuery = queryOptions({
  queryKey: ["admin", "stories"],
  queryFn: async () => {
    const { data, error } = await supabase.from("stories").select(SELECT).order("event_date", { ascending: false });
    if (error) throw error;
    return hydrateStories(data as unknown as Story[]);
  },
});

const PALETTE = ["#d4913b", "#1f3a6e", "#3f8f6b", "#b5473a", "#7a5aa6", "#2a8fb0", "#c06a9a", "#6b7d2a", "#8a6a3a", "#4a5568"];
export function typeColor(name?: string | null) {
  if (!name) return PALETTE[9]!;
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}
