import { supabase } from "@/integrations/supabase/client";

const EMPLOYEE = "/workshop/index.html";
const REPRESENTATIVE = "/workshop/representative/index.html";
const CSO = "/workshop/cso/index.html";

/* The materials page of a package key (mirrors public/workshop/event-info.js courseOf). Both levels
 * of a municipal course, नगरपालिका and गाउँपालिका, share its page; AI for CSOs ("cso") has its own. */
export function coursePage(key: string | null | undefined): string {
  const k = key ?? "";
  if (k.startsWith("representative")) return REPRESENTATIVE;
  if (k.startsWith("cso")) return CSO;
  return EMPLOYEE;
}

/* The front page opens the materials of the active event's course (set by the trainer);
 * with no active event, or if the database is slow (3 s), the employee materials. */
export async function frontPageTarget(timeoutMs = 3000): Promise<string> {
  const lookup = supabase
    .rpc("active_event_brand")
    .then(({ data }) => coursePage(data?.[0]?.package_key));
  const timeout = new Promise<string>((resolve) => setTimeout(() => resolve(EMPLOYEE), timeoutMs));
  try {
    return await Promise.race([lookup, timeout]);
  } catch {
    return EMPLOYEE;
  }
}
