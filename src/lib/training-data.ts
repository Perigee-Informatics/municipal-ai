import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

/* AI for ALL data for the admin. The same tables the workshop pages use; row-level security
 * lets the trainer account read and write them (is_trainer()). */

export type TrainingEvent = Tables<"events">;
export type TrainingPackage = Tables<"training_packages">;
export type Participant = Tables<"profiles">;
export type Feedback = Tables<"workshop_feedback">;
export type Organizer = Tables<"organizers">;
export type MediaRow = Tables<"event_media">;

export const tk = {
  all: ["training"] as const,
  events: ["training", "events"] as const,
  packages: ["training", "packages"] as const,
  people: ["training", "people"] as const,
  memberships: ["training", "memberships"] as const,
  feedback: ["training", "feedback"] as const,
  results: ["training", "results"] as const,
  media: (eventId: string) => ["training", "media", eventId] as const,
  siteProfile: ["training", "site-profile"] as const,
  organizers: ["masters", "organizers"] as const,
};

export const refreshTraining = (qc: QueryClient) => {
  qc.invalidateQueries({ queryKey: tk.all });
  qc.invalidateQueries({ queryKey: ["stories"] });
  qc.invalidateQueries({ queryKey: ["admin", "stories"] });
};

async function rows<T>(p: PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export const eventsQuery = queryOptions({
  queryKey: tk.events,
  queryFn: () => rows<TrainingEvent>(supabase.from("events").select("*").order("created_at", { ascending: false })),
});

export const packagesQuery = queryOptions({
  queryKey: tk.packages,
  queryFn: () =>
    rows<TrainingPackage>(
      supabase.from("training_packages").select("*").order("sort_order").order("created_at").order("key"),
    ),
});

/** Every profile except the trainer's own; pending, approved and rejected. */
export const peopleQuery = queryOptions({
  queryKey: tk.people,
  queryFn: async () =>
    (await rows<Participant>(supabase.from("profiles").select("*").order("created_at", { ascending: true }))).filter(
      (p) => p.role !== "trainer",
    ),
});

export const membershipsQuery = queryOptions({
  queryKey: tk.memberships,
  queryFn: () =>
    rows<{ profile_id: string; event_id: string }>(supabase.from("participant_events").select("profile_id, event_id")),
});

export const feedbackQuery = queryOptions({
  queryKey: tk.feedback,
  queryFn: () => rows<Feedback>(supabase.from("workshop_feedback").select("*").order("created_at", { ascending: false })),
});

/** Test submissions per event code: { CODE: { pre, post } }. */
export const resultsCountQuery = queryOptions({
  queryKey: tk.results,
  queryFn: async () => {
    const list = await rows<{ session_code: string | null; test: string }>(
      supabase.from("assessment_results").select("session_code, test"),
    );
    const out: Record<string, { pre: number; post: number }> = {};
    list.forEach((r) => {
      const c = (r.session_code ?? "").toUpperCase();
      if (!c) return;
      const v = out[c] ?? { pre: 0, post: 0 };
      out[c] = v;
      if (r.test === "pre") v.pre++;
      else if (r.test === "post") v.post++;
    });
    return out;
  },
});

export const organizersQuery = queryOptions({
  queryKey: tk.organizers,
  queryFn: () => rows<Organizer>(supabase.from("organizers").select("*").order("sort_order").order("name")),
});

export const mediaQuery = (eventId: string) =>
  queryOptions({
    queryKey: tk.media(eventId),
    queryFn: () =>
      rows<MediaRow>(
        supabase.from("event_media").select("*").eq("event_id", eventId).order("created_at", { ascending: false }),
      ),
  });

export const siteProfileQuery = queryOptions({
  queryKey: tk.siteProfile,
  queryFn: async () => {
    const { data, error } = await supabase.from("site_profile").select("*").eq("id", 1).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },
});

export const publicMediaUrl = (path: string | null | undefined) =>
  path ? supabase.storage.from("event-media").getPublicUrl(path).data.publicUrl : "";

/* ---------- small helpers shared by the screens ---------- */

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const lastDate = (e: Pick<TrainingEvent, "event_dates">) => [...(e.event_dates ?? [])].sort().pop() ?? "";
export const firstDate = (e: Pick<TrainingEvent, "event_dates">) => [...(e.event_dates ?? [])].sort()[0] ?? "";

export type Phase = "today" | "upcoming" | "past" | "";
export function phase(e: Pick<TrainingEvent, "event_dates">): Phase {
  const ds = [...(e.event_dates ?? [])].sort();
  if (!ds.length) return "";
  const t = today();
  if (ds.includes(t)) return "today";
  if (ds[0]! > t) return "upcoming";
  if (ds[ds.length - 1]! < t) return "past";
  return "today";
}
export const phaseLabel: Record<Phase, string> = { today: "Today", upcoming: "Upcoming", past: "Completed", "": "" };

/** Active first, then the newest by last date. */
export const sortEvents = (list: TrainingEvent[]) =>
  [...list].sort((a, b) => Number(!!b.is_active) - Number(!!a.is_active) || lastDate(b).localeCompare(lastDate(a)));

/** "Name – Organiser", so events with similar names can be told apart. */
export const eventTitle = (e: Pick<TrainingEvent, "name" | "organized_by">) =>
  e.name + (e.organized_by?.trim() ? ` – ${e.organized_by.trim()}` : "");

/** English date list: "28 Dec 2026", "14–15 Nov 2026". */
export function enDates(dates: string[] | null | undefined) {
  const ds = [...(dates ?? [])].sort();
  if (!ds.length) return "—";
  const f = (iso: string, withMonth = true, withYear = true) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      ...(withMonth ? { month: "short" } : {}),
      ...(withYear ? { year: "numeric" } : {}),
    });
  const a = ds[0]!, b = ds[ds.length - 1]!;
  if (ds.length === 1) return f(a);
  const sameMonth = a.slice(0, 7) === b.slice(0, 7);
  const contiguous = ds.length === Math.round((+new Date(b) - +new Date(a)) / 864e5) + 1;
  if (contiguous && sameMonth) return `${f(a, false, false)}–${f(b)}`;
  return ds.map((d, i) => f(d, true, i === ds.length - 1 || d.slice(0, 4) !== ds[i + 1]?.slice(0, 4))).join(", ");
}

/** Feedback questions per course (the order of the ratings stored with each response). */
export const FEEDBACK_QS: Record<string, string[]> = {
  cso: [
    "Overall, today was useful for my work",
    "The pace was right for me",
    "The language and examples were easy to follow",
    "There was enough hands-on practice",
    "The exercises fitted our CSO's real work",
    "The facilitator and helpers supported me well",
  ],
  hied: [
    "Overall, this session was useful for my teaching",
    "The pace was right for an 80-minute session",
    "The prompt examples were clear and relevant to postgraduate teaching",
    "There was enough hands-on practice with Claude",
    "The outputs fit Master's / MPhil / PhD level work",
    "The facilitator explained responsible use clearly",
  ],
  judiciary: [
    "Overall, this session was useful for my work in the courts",
    "The pace was right for a 2-hour session",
    "The Foundations segment (Nepali voice typing, prompt vocabulary) was clear",
    "There was enough hands-on practice in the group exercise",
    "The sample case materials fitted real court work",
    "The guardrails on what AI must not do were explained clearly",
  ],
  representative: [
    "कार्यशाला मेरो कामका लागि उपयोगी थियो",
    "सिकाइको गति मलाई ठिक्क थियो",
    "भाषा बुझ्न सजिलो थियो",
    "आफैँ गरेर सिक्ने पर्याप्त अवसर मिल्यो",
    "आयोजना छनौट अभ्यास वास्तविक जस्तो लाग्यो",
    "सहजकर्ता र सहयोगीबाट राम्रो सहयोग मिल्यो",
  ],
  employee: [
    "तालिम मेरो कामका लागि उपयोगी थियो",
    "सिकाइको गति मलाई ठिक्क थियो",
    "भाषा बुझ्न सजिलो थियो",
    "आफैँ गरेर सिक्ने पर्याप्त अवसर मिल्यो",
    "अभ्यास र उदाहरण मेरो दैनिक कामसँग मिल्दा थिए",
    "विज्ञ र सहयोगीबाट राम्रो सहयोग मिल्यो",
  ],
};

/** Course of a package key, without loading the workshop scripts (same rule as event-info.js). */
export function courseOfKey(key: string | null | undefined) {
  const k = String(key ?? "");
  if (k.startsWith("representative")) return "representative";
  if (k.startsWith("cso")) return "cso";
  if (k.startsWith("hied")) return "hied";
  if (k.startsWith("judiciary")) return "judiciary";
  return "employee";
}
/** Short training packages (one session, no pre/post test). */
export const isShortKey = (key: string | null | undefined) => ["hied", "judiciary"].includes(courseOfKey(key));
export const hasAssessmentKey = (key: string | null | undefined) => !isShortKey(key);
export const COURSE_LABEL: Record<string, string> = {
  employee: "Employees",
  representative: "Representatives",
  cso: "AI for CSOs",
  hied: "AI for Higher Education",
  judiciary: "AI in Judiciary",
};
export const COURSE_PAGE: Record<string, string> = {
  employee: "/workshop/index.html",
  representative: "/workshop/representative/index.html",
  cso: "/workshop/cso/index.html",
  hied: "/workshop/hied/index.html",
  judiciary: "/workshop/judiciary/index.html",
};
export const POOL_SIZE: Record<string, number> = { employee: 50, representative: 50, cso: 10 };
