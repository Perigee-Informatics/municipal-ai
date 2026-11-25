import { createFileRoute } from "@tanstack/react-router";

/**
 * Google Calendar push notifications. Google calls this when the synced calendar changes;
 * the request carries no event data, so we verify the channel and run an incremental sync.
 */
export const Route = createFileRoute("/api/public/google/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { gcalConfigured, watchToken, syncAll } = await import("@/lib/gcal.server");
        if (!gcalConfigured()) return new Response(null, { status: 204 });
        const channel = request.headers.get("x-goog-channel-id");
        const token = request.headers.get("x-goog-channel-token");
        if (!channel || token !== watchToken()) return new Response("Forbidden", { status: 403 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin.from("google_calendar_auth").select("watch_channel_id").eq("id", 1).maybeSingle();
        if (data?.watch_channel_id !== channel) return new Response(null, { status: 204 });
        if (request.headers.get("x-goog-resource-state") === "sync") return new Response(null, { status: 204 });
        try {
          await syncAll(new URL(request.url).origin);
        } catch (e) {
          console.error("webhook sync failed", e);
        }
        return new Response(null, { status: 204 });
      },
    },
  },
});
