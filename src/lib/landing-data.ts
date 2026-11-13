import { supabase } from "@/integrations/supabase/client";
import { bsRange } from "@/lib/bs-date";

/* Data for the landing page: the trainer's profile, the active event and the gallery items the
 * trainer marked for it. Everything here is readable without signing in. */

export type SiteProfile = {
  name: string;
  title: string;
  organisation: string;
  bio: string;
  highlights: string[];
  linkedinUrl: string;
  photoUrl: string;
};

export type GalleryItem = {
  id: string;
  kind: "photo" | "video";
  url: string;
  thumbUrl: string;
  caption: string;
  eventName: string;
  organizedBy: string;
  width: number | null;
  height: number | null;
};

export type ActiveEvent = {
  name: string;
  organizedBy: string;
  place: string;
  dates: string;
  course: "employee" | "representative";
  level: "municipal" | "rural";
};

export const DEFAULT_PROFILE: SiteProfile = {
  name: "डा. भोजराज घिमिरे",
  title: "AI तालिम विज्ञ",
  organisation: "",
  bio: "",
  highlights: [],
  linkedinUrl: "https://np.linkedin.com/in/drbghimire",
  photoUrl: "",
};

const BUCKET = "event-media";
export const mediaUrl = (path: string): string =>
  path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : "";

export async function loadProfile(): Promise<SiteProfile> {
  const { data } = await supabase.from("site_profile").select("*").eq("id", 1).maybeSingle();
  if (!data) return DEFAULT_PROFILE;
  return {
    name: data.name || DEFAULT_PROFILE.name,
    title: data.title,
    organisation: data.organisation,
    bio: data.bio,
    highlights: data.highlights ?? [],
    linkedinUrl: data.linkedin_url || DEFAULT_PROFILE.linkedinUrl,
    photoUrl: mediaUrl(data.photo_path),
  };
}

export async function loadGallery(limit = 24): Promise<GalleryItem[]> {
  const { data } = await supabase.rpc("landing_gallery", { p_limit: limit });
  return (data ?? []).map((m) => ({
    id: m.id,
    kind: m.kind === "video" ? "video" : "photo",
    url: mediaUrl(m.path),
    thumbUrl: mediaUrl(m.thumb_path || (m.kind === "photo" ? m.path : "")),
    caption: m.caption,
    eventName: m.event_name,
    organizedBy: m.organized_by ?? "",
    width: m.width,
    height: m.height,
  }));
}

export async function loadActiveEvent(): Promise<ActiveEvent | null> {
  const { data } = await supabase.rpc("active_event_brand");
  const e = data?.[0];
  if (!e) return null;
  const key = e.package_key ?? "";
  const course = key.startsWith("representative") ? "representative" : "employee";
  const level = key.endsWith("-rural")
    ? "rural"
    : key.endsWith("-municipal")
      ? "municipal"
      : course === "representative"
        ? "rural"
        : "municipal";
  return {
    name: e.name,
    organizedBy: (e.organized_by ?? "").replace(/\s+/g, " ").trim(),
    place: (e.address ?? "").trim(),
    dates: bsRange(e.event_dates),
    course,
    level,
  };
}

/* After signing in on the landing page: the trainer goes to the console; everyone else to the
 * workshop sign-in page, which completes the profile, explains a pending approval, and lets a
 * participant of several events choose one. */
export async function destinationAfterSignIn(userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", userId)
    .maybeSingle();
  if (data?.role === "trainer" && data.status === "approved") return "/workshop/admin.html";
  return "/workshop/login.html";
}
