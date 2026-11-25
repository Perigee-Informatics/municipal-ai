import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const back = (msg: string) => Response.redirect(`${url.origin}/admin/settings?gcal=${encodeURIComponent(msg)}`, 302);
        const { gcalConfigured, verifyState, redirectUri } = await import("@/lib/gcal.server");
        if (!gcalConfigured()) return back("not_configured");
        const code = url.searchParams.get("code");
        const uid = verifyState(url.searchParams.get("state") ?? "");
        if (!code || !uid) return back("invalid_request");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: uid, _role: "admin" });
        if (!isAdmin) return back("forbidden");
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: process.env["GOOGLE_CLIENT_ID"]!,
            client_secret: process.env["GOOGLE_CLIENT_SECRET"]!,
            redirect_uri: redirectUri(url.origin),
            grant_type: "authorization_code",
          }),
        });
        if (!res.ok) {
          console.error(`Google token exchange failed [${res.status}]: ${await res.text()}`);
          return back("exchange_failed");
        }
        const tok = (await res.json()) as { refresh_token?: string; id_token?: string };
        if (!tok.refresh_token) return back("no_refresh_token");
        let email: string | null = null;
        try {
          email = JSON.parse(atob(tok.id_token!.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/"))).email ?? null;
        } catch { /* optional */ }
        const { data: prev } = await supabaseAdmin.from("google_calendar_auth").select("connected_email").eq("id", 1).maybeSingle();
        const sameAccount = !!prev && prev.connected_email === email;
        await supabaseAdmin.from("google_calendar_auth").upsert({
          id: 1, refresh_token: tok.refresh_token, connected_email: email, updated_at: new Date().toISOString(),
          sync_token: null, watch_channel_id: null, watch_resource_id: null, watch_expires_at: null,
          ...(sameAccount ? {} : { engagements_calendar_id: null }),
        });
        if (!sameAccount) await supabaseAdmin.from("stories").update({ google_event_id: null, google_synced_at: null }).not("google_event_id", "is", null);
        // First two-way sync: creates the Engagements calendar, sends every engagement, reads back Google.
        const { syncAll } = await import("@/lib/gcal.server");
        try {
          await syncAll(url.origin);
        } catch (e) {
          console.error("first Google sync failed", e);
          return back("connected_sync_failed");
        }
        return back("connected");
      },
    },
  },
});
