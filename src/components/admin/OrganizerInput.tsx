import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { organizersQuery } from "@/lib/training-data";

/** A text field for an organiser, suggesting the names of Master settings → Organizers. */
export function OrganizerInput(props: React.ComponentProps<typeof Input>) {
  const id = useId();
  const { data: organizers = [] } = useQuery(organizersQuery);
  return (
    <>
      <Input {...props} list={id} autoComplete="off" />
      <datalist id={id}>
        {organizers
          .filter((o) => o.active)
          .map((o) => (
            <option key={o.id} value={o.name}>
              {o.name_ne ?? undefined}
            </option>
          ))}
      </datalist>
    </>
  );
}

/** Adds an organiser typed in a form to the master list, if it is new. Never fails the caller. */
export async function rememberOrganizer(name: string | null | undefined) {
  const n = (name ?? "").trim();
  if (!n) return;
  try {
    const { data } = await supabase.from("organizers").select("id").ilike("name", n.replace(/[\\%_]/g, "\\$&")).limit(1);
    if (data?.length) return;
    const kind = /गाउँपालिका/.test(n) ? "rural_municipality" : /नगरपालिका|Municipality|Metropolitan/i.test(n) ? "municipality" : "other";
    // a race with another tab only hits the unique index on lower(name): harmless
    await supabase.from("organizers").insert({ name: n, kind });
  } catch {
    /* the list is a convenience; the event itself is saved */
  }
}
