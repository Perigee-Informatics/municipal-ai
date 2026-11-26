import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const time = z.string().regex(/^\d{2}:\d{2}$/);
export const requestSchema = z.object({
  event_type_id: z.string().uuid(),
  role_id: z.string().uuid(),
  event_title: z.string().trim().min(3).max(200),
  organization: z.string().trim().min(2).max(200),
  description: z.string().trim().max(3000).optional().default(""),
  timezone: z.string().min(1).max(60),
  sessions: z
    .array(z.object({ session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), start_time: time, end_time: time }))
    .min(1)
    .max(30)
    .refine((s) => s.every((x) => x.end_time > x.start_time), "End time must be after start time"),
  basis: z.enum(["paid", "volunteer"]),
  honorarium: z.number().nonnegative().max(1e9).nullable().optional(),
  currency: z.string().max(10).nullable().optional(),
  venue_mode: z.enum(["in_person", "online", "hybrid"]),
  venue_name: z.string().max(200).optional().default(""),
  address: z.string().max(300).optional().default(""),
  city: z.string().max(100).optional().default(""),
  country: z.string().max(100).optional().default(""),
  online_link: z.string().max(500).optional().default(""),
  requester_name: z.string().trim().min(2).max(120),
  requester_email: z.string().trim().email().max(200),
  requester_phone: z.string().max(40).optional().default(""),
  requester_designation: z.string().max(120).optional().default(""),
  attachment_path: z.string().max(300).nullable().optional(),
  website: z.string().max(0).optional().default(""), // honeypot
  started_at: z.number(),
});
export type RequestInput = z.input<typeof requestSchema>;

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const submitRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => requestSchema.parse(d))
  .handler(async ({ data }) => {
    const { sendEmail, wrap, detailsTable, OWNER_EMAIL, esc } = await import("./email.server");
    // Spam protection: honeypot + minimum fill time silently accepted-but-dropped
    if (data.website || Date.now() - data.started_at < 4000) return { ok: true };
    const sb = publicClient();
    // Admin → Invitation settings: closed for new invitations, or too little notice
    const { data: cfg } = await sb.from("invitation_settings").select("accepting, min_notice_days").eq("id", 1).maybeSingle();
    if (cfg && !cfg.accepting) return { ok: false, error: "New invitations are not being accepted at the moment." };
    if (cfg?.min_notice_days) {
      const earliest = new Date(Date.now() + cfg.min_notice_days * 864e5).toISOString().slice(0, 10);
      if (data.sessions.some((x) => x.session_date < earliest))
        return { ok: false, error: `Please allow at least ${cfg.min_notice_days} days' notice (from ${earliest}).` };
    }
    const { data: count } = await sb.rpc("recent_request_count", { _email: data.requester_email });
    if ((count ?? 0) >= 3) return { ok: false, error: "Too many requests from this email. Please try again in an hour." };

    const id = crypto.randomUUID();
    const { sessions, website: _w, started_at: _s, ...rest } = data;
    const { error } = await sb.from("appointment_requests").insert({
      id,
      ...rest,
      honorarium: data.basis === "paid" ? data.honorarium ?? null : null,
      currency: data.basis === "paid" ? data.currency ?? null : null,
      attachment_path: data.attachment_path ?? null,
    });
    if (error) {
      console.error(error);
      return { ok: false, error: "Could not save your request. Please try again." };
    }
    const { error: sErr } = await sb.from("request_sessions").insert(sessions.map((s) => ({ ...s, request_id: id })));
    if (sErr) console.error(sErr);

    const [{ data: et }, { data: role }] = await Promise.all([
      sb.from("event_types").select("name").eq("id", data.event_type_id).maybeSingle(),
      sb.from("roles").select("name").eq("id", data.role_id).maybeSingle(),
    ]);
    const schedule = sessions.map((s) => `${s.session_date} ${s.start_time}–${s.end_time}`).join("; ") + ` (${data.timezone})`;
    const rows: [string, unknown][] = [
      ["Event", data.event_title], ["Organization", data.organization], ["Type", et?.name], ["Role", role?.name],
      ["Schedule", schedule],
      ["Basis", data.basis === "paid" ? `Paid${data.honorarium ? ` — ${data.honorarium} ${data.currency ?? ""}` : ""}` : "Volunteer / Pro bono"],
      ["Mode", data.venue_mode], ["Venue", [data.venue_name, data.address, data.city, data.country].filter(Boolean).join(", ")],
      ["Online link", data.online_link], ["Description", data.description],
      ["Requester", `${data.requester_name}${data.requester_designation ? `, ${data.requester_designation}` : ""}`],
      ["Email", data.requester_email], ["Phone", data.requester_phone],
      ["Attachment", data.attachment_path ? "Yes — see admin inbox" : "None"],
    ];
    await Promise.all([
      sendEmail(OWNER_EMAIL, `New engagement request: ${data.event_title}`, wrap("New engagement request", detailsTable(rows)), data.requester_email),
      sendEmail(
        data.requester_email,
        `We received your request — ${data.event_title}`,
        wrap("Request received", `<p>Dear ${esc(data.requester_name)},</p><p>Thank you for inviting Dr. Bhoj Raj Ghimire. Your request has been received and is pending review. You will be notified once a decision is made.</p>${detailsTable(rows.slice(0, 6))}<p>Warm regards,<br/>Office of Dr. Bhoj Raj Ghimire</p>`),
        OWNER_EMAIL,
      ),
    ]);
    return { ok: true };
  });

export const setRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["accepted", "declined", "tentative", "pending"]), message: z.string().max(2000).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { sendEmail, wrap, OWNER_EMAIL, esc } = await import("./email.server");
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: req, error } = await context.supabase
      .from("appointment_requests")
      .update({ status: data.status })
      .eq("id", data.id)
      .select("event_title, requester_name, requester_email")
      .single();
    if (error) throw new Error(error.message);
    let emailed = false;
    if (data.status === "accepted" || data.status === "declined") {
      const accepted = data.status === "accepted";
      const r = await sendEmail(
        req.requester_email,
        `${accepted ? "Accepted" : "Update"}: ${req.event_title}`,
        wrap(
          accepted ? "Your request has been accepted" : "Regarding your request",
          `<p>Dear ${esc(req.requester_name)},</p><p>${
            accepted
              ? `I'm pleased to confirm my participation in <b>${esc(req.event_title)}</b>. I look forward to working with you.`
              : `Thank you for your kind invitation to <b>${esc(req.event_title)}</b>. Unfortunately I am unable to accept it at this time.`
          }</p>${data.message ? `<p>${esc(data.message)}</p>` : ""}<p>Best regards,<br/>Dr. Bhoj Raj Ghimire</p>`,
        ),
        OWNER_EMAIL,
      );
      emailed = r.sent;
    }
    // Accepted → it becomes an engagement (Events + Story Map) and goes to Google Calendar.
    // Any other status → its engagement is removed (or, if it already has photos, kept but made private).
    const sb = context.supabase;
    let calendar: boolean | null = null;
    const { data: linked } = await sb.from("stories").select("id, google_event_id, story_media!story_media_story_id_fkey(id)").eq("source_request_id", data.id).maybeSingle();
    const gcal = await import("./gcal.server");
    if (data.status === "accepted") {
      const { data: r } = await sb.from("appointment_requests").select("*, request_sessions(session_date, start_time, end_time)").eq("id", data.id).single();
      if (r) {
        const days = [...r.request_sessions].sort((a, b) => (a.session_date + a.start_time).localeCompare(b.session_date + b.start_time));
        const first = days[0];
        const last = days.at(-1);
        const fields = {
          title: r.event_title, organizer: r.organization, event_type_id: r.event_type_id, role_id: r.role_id,
          description: r.description || null, event_date: first?.session_date ?? new Date().toISOString().slice(0, 10),
          end_date: last && first && last.session_date !== first.session_date ? last.session_date : null,
          start_time: first?.start_time ?? null, end_time: days.reduce<string | null>((m, x) => (!m || x.end_time > m ? x.end_time : m), null),
          venue_mode: r.venue_mode, venue_name: r.venue_name || null, online_link: r.online_link || null,
          city: r.city || null, country: r.country || null, is_public: r.show_publicly, private_notes: r.private_notes || null, google_sync: true,
        };
        let storyId = linked?.id;
        if (storyId) {
          await sb.from("stories").update(fields).eq("id", storyId);
        } else {
          const { data: row, error: sErr } = await sb.from("stories")
            .insert({ ...fields, source: "request", source_request_id: data.id, location_needs_review: true, latitude: null, longitude: null })
            .select("id").single();
          if (sErr) throw new Error(sErr.message);
          storyId = row.id;
        }
        try {
          calendar = await gcal.pushStory(storyId);
        } catch (e) {
          console.error("calendar sync failed", e);
        }
      }
    } else if (linked) {
      try {
        if (linked.google_event_id) calendar = await gcal.deleteGoogleEvent(linked.google_event_id);
      } catch (e) {
        console.error("calendar removal failed", e);
      }
      if (linked.story_media.length === 0) await sb.from("stories").delete().eq("id", linked.id);
      else await sb.from("stories").update({ is_public: false, google_event_id: null, google_synced_at: null, google_sync: false }).eq("id", linked.id);
    }
    return { ok: true, emailed, calendar };
  });
