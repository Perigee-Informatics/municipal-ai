import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Browser-only view of who is signed in, used to switch the header button between
 * "Sign in", "Admin dashboard" (Dr. Ghimire, `admin` role) and "My training" (an AI for ALL
 * participant). It is a display hint only: access is enforced by the admin layout and by RLS.
 */
export function useAdminSession() {
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let alive = true;
    const check = async (userId: string | undefined) => {
      if (!userId) {
        if (alive) setIsAdmin(false);
        return;
      }
      const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (alive) setIsAdmin(!!data);
    };
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSignedIn(!!data.session);
      void check(data.session?.user.id);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
      void check(session?.user.id);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return { signedIn, isAdmin };
}
