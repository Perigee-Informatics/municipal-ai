import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-import-token",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const schema = z.object({
  items: z
    .array(
      z.object({
        event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        facebook_post_url: z.string().url().max(1000).optional(),
        urls: z.array(z.string().url().max(4000)).max(60),
      }),
    )
    .min(1)
    .max(50),
});

export const Route = createFileRoute("/api/public/import-story-media")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const token = request.headers.get("x-import-token") ?? "";
        const { data: secret } = await supabaseAdmin.from("app_secrets").select("value").eq("key", "import_token").maybeSingle();
        if (!secret || !token || token !== secret.value) return json({ error: "Unauthorized" }, 401);

        let body: z.infer<typeof schema>;
        try {
          body = schema.parse(await request.json());
        } catch (e) {
          return json({ error: "Invalid body", detail: e instanceof Error ? e.message : String(e) }, 400);
        }

        const results = [];
        for (const item of body.items) {
          const { data: matches } = await supabaseAdmin.from("stories").select("id, facebook_post_url, cover_media_id").eq("event_date", item.event_date);
          let story = matches?.[0];
          if ((matches?.length ?? 0) > 1) story = matches!.find((m) => m.facebook_post_url && m.facebook_post_url === item.facebook_post_url) ?? undefined;
          if (!story) {
            results.push({ event_date: item.event_date, status: (matches?.length ?? 0) > 1 ? "ambiguous — several stories on this date; include a matching facebook_post_url" : "no story on this date", added: 0 });
            continue;
          }
          if (item.facebook_post_url) await supabaseAdmin.from("stories").update({ facebook_post_url: item.facebook_post_url }).eq("id", story.id);

          const { data: existing } = await supabaseAdmin.from("story_media").select("source_url, sort_order").eq("story_id", story.id);
          const seen = new Set((existing ?? []).map((e) => e.source_url));
          let n = (existing ?? []).reduce((m, e) => Math.max(m, e.sort_order), 0);
          let added = 0, skipped = 0;
          const errors: string[] = [];
          let firstId: string | null = null;
          for (const url of item.urls) {
            if (seen.has(url)) { skipped++; continue; }
            try {
              const res = await fetch(url);
              if (!res.ok) throw new Error(`download ${res.status}`);
              const type = res.headers.get("content-type") ?? "image/jpeg";
              const isVideo = type.startsWith("video/");
              n++;
              const path = `stories/${story.id}/${n}.${isVideo ? "mp4" : "jpg"}`;
              const { error: upErr } = await supabaseAdmin.storage.from("story-media").upload(path, await res.arrayBuffer(), { contentType: type, upsert: true });
              if (upErr) throw new Error(upErr.message);
              const { data: row, error: insErr } = await supabaseAdmin.from("story_media").insert({ story_id: story.id, storage_path: path, media_type: isVideo ? "video" : "image", sort_order: n, source_url: url }).select("id").single();
              if (insErr) throw new Error(insErr.message);
              if (!firstId && !isVideo) firstId = row.id;
              seen.add(url);
              added++;
            } catch (e) {
              errors.push(`${url.slice(0, 80)}…: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
          if (!story.cover_media_id && firstId) await supabaseAdmin.from("stories").update({ cover_media_id: firstId }).eq("id", story.id);
          results.push({ event_date: item.event_date, story_id: story.id, status: "ok", added, skipped, errors });
        }
        return json({ results });
      },
    },
  },
});
