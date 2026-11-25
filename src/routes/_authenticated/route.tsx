import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

// Session lives in localStorage, which the server cannot read — the gate must
// run client-side only, otherwise hard refresh redirect-loops.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href },
      });
    }
    // The admin pages read the user from the route context; whether that user may see
    // them is checked by the admin layout (has_role 'admin') and enforced by RLS.
    return { user: data.user };
  },
  component: () => <Outlet />,
});
