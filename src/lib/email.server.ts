// Server-only: sends email through Resend using the RESEND_API_KEY secret.
export async function sendEmail(to: string | string[], subject: string, html: string, replyTo?: string) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) {
    console.warn("RESEND_API_KEY not configured — email skipped:", subject);
    return { sent: false, reason: "not_configured" };
  }
  const from = process.env["RESEND_FROM"] || "Dr. Bhoj Raj Ghimire <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html, reply_to: replyTo }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Resend failed [${res.status}]: ${body}`);
    return { sent: false, reason: `${res.status}` };
  }
  return { sent: true };
}

export const OWNER_EMAIL = "dr.bghimire@gmail.com";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function wrap(title: string, body: string) {
  return `<div style="font-family:Georgia,serif;max-width:620px;margin:auto;color:#1c2540">
  <div style="background:#1b2547;color:#f5efe3;padding:20px 24px;border-radius:8px 8px 0 0"><h2 style="margin:0;font-weight:600">${esc(title)}</h2></div>
  <div style="border:1px solid #e6e0d4;border-top:0;padding:24px;border-radius:0 0 8px 8px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6">${body}</div></div>`;
}

export function detailsTable(rows: [string, unknown][]) {
  return `<table style="border-collapse:collapse;width:100%">${rows
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `<tr><td style="padding:6px 8px;color:#6b7280;vertical-align:top;width:38%">${esc(k)}</td><td style="padding:6px 8px">${esc(v)}</td></tr>`)
    .join("")}</table>`;
}

export { esc };
