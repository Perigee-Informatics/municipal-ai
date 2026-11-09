// Manual registration (backup when sign-up e-mails are rate-limited).
// Only a signed-in trainer can call this. It creates approved participant accounts (username = e-mail, plus a password)
// and links each one to an event. Participants complete their own details after their first sign-in.
// The service-role key stays inside this function; the browser never sees it.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAX_BATCH = 100;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// Readable random password: no look-alike characters (0/O, 1/l/I).
function makePassword(len = 10) {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method-not-allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";

  // 1. Who is calling? Must be an approved trainer.
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: isTrainer, error: trErr } = await userClient.rpc("is_trainer");
  if (trErr || isTrainer !== true) return json({ error: "not-trainer" }, 403);

  // 2. Validate the request.
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad-json" }, 400); }
  const eventId = String(body?.event_id || "");
  const list = Array.isArray(body?.participants) ? body.participants : [];
  if (!eventId) return json({ error: "event-required" }, 400);
  if (!list.length) return json({ error: "no-participants" }, 400);
  if (list.length > MAX_BATCH) return json({ error: "too-many", max: MAX_BATCH }, 400);

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: ev, error: evErr } = await admin.from("events").select("id,name").eq("id", eventId).maybeSingle();
  if (evErr || !ev) return json({ error: "event-not-found" }, 404);

  // 3. Create each account. Passwords are returned once and not stored anywhere else.
  const results: any[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const email = String(raw?.email || "").trim().toLowerCase();
    const given = String(raw?.password || "");
    const row = { email };

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { results.push({ ...row, status: "error", message: "इमेल मिलेन" }); continue; }
    if (seen.has(email)) { results.push({ ...row, status: "error", message: "सूचीमा दोहोरिएको इमेल" }); continue; }
    seen.add(email);
    if (given && given.length < 8) { results.push({ ...row, status: "error", message: "पासवर्ड कम्तीमा ८ अक्षरको हुनुपर्छ" }); continue; }

    const password = given || makePassword();
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { manual: true },
    });
    if (cErr || !created?.user) {
      const exists = /already|registered|exists/i.test(cErr?.message || "");
      results.push({ ...row, status: exists ? "exists" : "error", message: exists ? "यो इमेल पहिल्यै दर्ता छ (पासवर्ड परिवर्तन गरिएन)" : (cErr?.message || "त्रुटि") });
      continue;
    }

    // The sign-up trigger creates the profile; make it an approved participant linked to this event.
    // full_name stays empty: the participant fills in their details after the first sign-in.
    const { error: pErr } = await admin.from("profiles").update({
      role: "participant", status: "approved", event_id: eventId,
    }).eq("id", created.user.id);
    if (pErr) {
      results.push({ ...row, status: "error", message: "खाता बन्यो तर प्रोफाइल सेट हुन सकेन: " + pErr.message, password });
      continue;
    }
    results.push({ ...row, status: "created", message: "दर्ता भयो", password: given ? "" : password });
  }

  return json({ event: ev.name, results });
});
