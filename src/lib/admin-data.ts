import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Req = Tables<"appointment_requests"> & {
  request_sessions: Tables<"request_sessions">[];
  event_types: { name: string } | null;
  roles: { name: string } | null;
};

export const allRequestsQuery = queryOptions({
  queryKey: ["admin", "requests"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("appointment_requests")
      .select("*, request_sessions(*), event_types(name), roles(name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as unknown as Req[];
  },
});

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** The fields of an engagement needed to check for clashes. Empty times mean all day. */
export type Busy = { id: string; title: string; event_date: string; end_date: string | null; start_time: string | null; end_time: string | null; source_request_id?: string | null };

/** Engagements that overlap any day/time of the request. All-day engagements clash with the whole day. */
export function findConflicts(req: Req, engagements: Busy[]) {
  const out: { other: Busy; date: string }[] = [];
  for (const s of req.request_sessions) {
    for (const o of engagements) {
      if (o.source_request_id === req.id) continue;
      const last = o.end_date && o.end_date > o.event_date ? o.end_date : o.event_date;
      if (s.session_date < o.event_date || s.session_date > last) continue;
      const allDay = !o.start_time;
      if (allDay || (toMin(o.start_time!) < toMin(s.end_time) && toMin(s.start_time) < toMin(o.end_time ?? "23:59"))) out.push({ other: o, date: s.session_date });
    }
  }
  return out;
}

export const statusTone: Record<string, string> = {
  pending: "bg-warning/25 text-foreground",
  accepted: "bg-success/20 text-success",
  declined: "bg-destructive/15 text-destructive",
  tentative: "bg-secondary text-secondary-foreground",
};
