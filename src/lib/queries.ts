import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function list<T>(p: PromiseLike<{ data: T[] | null; error: unknown }>) {
  const { data, error } = await p;
  if (error) throw error;
  return data ?? [];
}

/** Public profile columns. `phone` is private: anonymous visitors cannot read it (see migration 0004). */
const PUBLIC_PROFILE_COLUMNS =
  "id, full_name, full_name_ne, headline, headline_ne, short_bio, short_bio_ne, long_bio, long_bio_ne, photo_url, email, location, facebook, linkedin, instagram, google_scholar, researchgate, orcid, website, facebook_followers, linkedin_followers, linkedin_connections, cv_path, updated_at";

export const portfolioQuery = queryOptions({
  queryKey: ["portfolio"],
  queryFn: async () => {
    const [profile, highlights, expertise, education, experience, publications, certifications] = await Promise.all([
      supabase.from("profile").select(PUBLIC_PROFILE_COLUMNS).eq("id", 1).maybeSingle(),
      list(supabase.from("highlights").select("*").order("sort_order")),
      list(supabase.from("expertise").select("*").order("sort_order")),
      list(supabase.from("education").select("*").order("sort_order")),
      list(supabase.from("experience").select("*").order("sort_order")),
      list(supabase.from("publications").select("*").order("sort_order")),
      list(supabase.from("certifications").select("*").order("sort_order")),
    ]);
    const p = profile.data;
    const paths = [p?.photo_url, p?.cv_path].filter((x): x is string => !!x && x.startsWith("storage:")).map((x) => x.slice(8));
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data } = await supabase.storage.from("site-files").createSignedUrls(paths, 60 * 60 * 24);
      data?.forEach((d) => d.path && d.signedUrl && signed.set(d.path, d.signedUrl));
    }
    const resolve = (v?: string | null) => (v ? (v.startsWith("storage:") ? signed.get(v.slice(8)) ?? null : v) : null);
    // Until a portrait is uploaded in Admin → Settings, use the trainer photo of AI for ALL.
    let photoUrl = resolve(p?.photo_url);
    if (!photoUrl) {
      const { data: sp } = await supabase.from("site_profile").select("photo_path").eq("id", 1).maybeSingle();
      if (sp?.photo_path) photoUrl = supabase.storage.from("event-media").getPublicUrl(sp.photo_path).data.publicUrl;
    }
    return { profile: p, photoUrl, cvUrl: resolve(p?.cv_path), highlights, expertise, education, experience, publications, certifications };
  },
});

export const publicEventsQuery = queryOptions({
  queryKey: ["public-events"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("get_public_events");
    if (error) throw error;
    return data ?? [];
  },
});

export const lookupsQuery = queryOptions({
  queryKey: ["lookups"],
  queryFn: async () => {
    const [types, roles] = await Promise.all([
      list(supabase.from("event_types").select("*").eq("active", true).order("sort_order")),
      list(supabase.from("roles").select("*").eq("active", true).order("sort_order")),
    ]);
    return { types, roles };
  },
});

/** Whether new invitations are accepted, and the request form's options (Admin → Invitation settings). */
export const invitationSettingsQuery = queryOptions({
  queryKey: ["invitation-settings"],
  queryFn: async () => {
    const { data } = await supabase.from("invitation_settings").select("*").eq("id", 1).maybeSingle();
    return (
      data ?? {
        id: 1,
        accepting: true,
        closed_message: null,
        closed_message_ne: null,
        min_notice_days: 0,
        currencies: ["NPR", "USD", "EUR", "INR", "GBP", "THB", "JPY", "AUD"],
        default_currency: "NPR",
        updated_at: "",
      }
    );
  },
});

export type PublicEvent = Awaited<ReturnType<typeof publicEventsQuery.queryFn & {}>>[number];
