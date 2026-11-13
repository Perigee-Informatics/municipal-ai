import { supabase } from "@/integrations/supabase/client";

const EMPLOYEE = "/workshop/index.html";
const REPRESENTATIVE = "/workshop/representative/index.html";

/* The front page opens the materials of the active event's course (set by the trainer; both
 * levels of a course, नगरपालिका and गाउँपालिका, share its page);
 * with no active event, or if the database is slow (3 s), the employee materials. */
export async function frontPageTarget(timeoutMs = 3000): Promise<string> {
  const lookup = supabase
    .rpc("active_event_brand")
    .then(({ data }) =>
      (data?.[0]?.package_key ?? "").startsWith("representative") ? REPRESENTATIVE : EMPLOYEE,
    );
  const timeout = new Promise<string>((resolve) => setTimeout(() => resolve(EMPLOYEE), timeoutMs));
  try {
    return await Promise.race([lookup, timeout]);
  } catch {
    return EMPLOYEE;
  }
}
