/* The site has one sign-in and sign-up page: /workshop/login.html (it also carries the full
 * participant sign-up form). /auth only forwards there, keeping the event and the page to
 * return to, so old links, bookmarks and the admin sign-in gate all end up in the same place. */
export function loginHref(search: Record<string, unknown>): string {
  const q = new URLSearchParams();
  const back = search["redirect"] ?? search["next"];
  if (typeof back === "string") {
    let path = back;
    try {
      const u = new URL(back, "https://x.invalid");
      path =
        u.origin === "https://x.invalid" || /lovable\.app$/.test(u.hostname)
          ? u.pathname + u.search
          : "";
    } catch {
      path = "";
    }
    if (path.startsWith("/") && !path.startsWith("//")) q.set("next", path);
  }
  const event = search["event"];
  if (typeof event === "string" && event) q.set("event", event);
  const s = q.toString();
  return `/workshop/login.html${s ? `?${s}` : ""}`;
}
