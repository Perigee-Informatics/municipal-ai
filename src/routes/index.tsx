import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { frontPageTarget } from "@/lib/front-page";
import {
  type ActiveEvent,
  DEFAULT_PROFILE,
  destinationAfterSignIn,
  type GalleryItem,
  loadActiveEvent,
  loadGallery,
  loadProfile,
  type SiteProfile,
} from "@/lib/landing-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI तालिम · स्थानीय तहका कर्मचारी र जनप्रतिनिधिका लागि" },
      {
        name: "description",
        content:
          "नगरपालिका र गाउँपालिकाका कर्मचारी तथा जनप्रतिनिधिका लागि व्यावहारिक AI तालिम: तालिम सामग्री, परीक्षा र कार्यक्रमका झलक।",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Mukta:wght@400;500;700;800&family=Rozha+One&display=swap",
      },
    ],
  }),
  component: Landing,
});

/* Colours of the workshop materials, so the site reads as one place. */
const C = {
  ink: "#142440",
  muted: "#556275",
  accent: "#B3123A",
  navy: "#1C3A66",
  soft: "#E6ECF4",
  bg: "#F4F6F9",
  line: "#D6DDE6",
};
const body = { fontFamily: "'Mukta', 'Nirmala UI', 'Noto Sans Devanagari', system-ui, sans-serif" };
const display = { fontFamily: "'Rozha One', 'Mukta', 'Noto Serif Devanagari', Georgia, serif" };

const COURSES = [
  {
    course: "कर्मचारीका लागि AI",
    level: "नगरपालिका",
    text: "पत्र, टिप्पणी, प्रतिवेदन, तथ्याङ्क विश्लेषण, प्रस्तुतीकरण र सेवा प्रवाहमा AI को सुरक्षित प्रयोग: नगर कार्यपालिकाको कार्यालयका शाखाहरूको दैनिक काम अनुसार।",
  },
  {
    course: "कर्मचारीका लागि AI",
    level: "गाउँपालिका",
    text: "उही दुई दिने व्यावहारिक तालिम, गाउँ कार्यपालिकाको कार्यालय र गाउँपालिकाको सन्दर्भमा।",
  },
  {
    course: "जनप्रतिनिधिका लागि AI",
    level: "नगरपालिका",
    text: "नगर प्रमुख, उपप्रमुख, वडाध्यक्ष र सदस्यहरूका लागि सूचना, माइन्युट, भाषण र नगर सभाका लागि आयोजना छनौटमा AI।",
  },
  {
    course: "जनप्रतिनिधिका लागि AI",
    level: "गाउँपालिका",
    text: "अध्यक्ष, उपाध्यक्ष, वडाध्यक्ष र सदस्यहरूका लागि सोही एकदिने कार्यशाला, गाउँ सभा र गाउँ कार्यपालिकाको सन्दर्भमा।",
  },
];

function initials(name: string): string {
  const parts = name
    .replace(/^डा\.\s*/, "")
    .trim()
    .split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "");
}

function Landing() {
  const [profile, setProfile] = useState<SiteProfile>(DEFAULT_PROFILE);
  const [gallery, setGallery] = useState<GalleryItem[] | null>(null);
  const [active, setActive] = useState<ActiveEvent | null>(null);
  const [materials, setMaterials] = useState("/workshop/index.html");
  const [open, setOpen] = useState<GalleryItem | null>(null);

  useEffect(() => {
    loadProfile()
      .then(setProfile)
      .catch(() => {});
    loadGallery()
      .then(setGallery)
      .catch(() => setGallery([]));
    loadActiveEvent()
      .then(setActive)
      .catch(() => {});
    frontPageTarget()
      .then(setMaterials)
      .catch(() => {});
  }, []);

  return (
    <div style={{ ...body, background: C.bg, color: C.ink }} className="min-h-screen">
      <header
        className="sticky top-0 z-20 border-b backdrop-blur"
        style={{ borderColor: C.line, background: "rgba(255,255,255,.92)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <a href="/" className="flex items-baseline gap-2 no-underline" style={{ color: C.ink }}>
            <span style={{ ...display, color: C.accent }} className="text-2xl">
              AI तालिम
            </span>
            <span className="hidden text-sm sm:inline" style={{ color: C.muted }}>
              स्थानीय तहका लागि
            </span>
          </a>
          <nav className="ml-auto flex items-center gap-1 text-[15px] sm:gap-4">
            <a href="#gallery" className="hidden px-2 sm:inline" style={{ color: C.navy }}>
              ग्यालरी
            </a>
            <a href={materials} className="hidden px-2 sm:inline" style={{ color: C.navy }}>
              तालिम सामग्री
            </a>
            <a
              href="#signin"
              className="rounded-full px-4 py-1.5 font-semibold text-white"
              style={{ background: C.navy }}
            >
              साइन इन
            </a>
          </nav>
        </div>
      </header>

      <main>
        {/* hero: the programme on the left, the trainer on the right */}
        <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-10 md:grid-cols-[1.25fr_1fr] md:pt-16">
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-wide" style={{ color: C.accent }}>
              नगरपालिका र गाउँपालिकाका लागि व्यावहारिक तालिम
            </p>
            <h1 style={display} className="mt-2 text-4xl leading-tight sm:text-5xl">
              कर्मचारी र जनप्रतिनिधिका लागि कृत्रिम बौद्धिकता (AI)
            </h1>
            <p className="mt-4 max-w-xl text-lg" style={{ color: C.muted }}>
              आफ्नै मोबाइलमा, नेपाली भाषामै, निःशुल्क AI उपकरण प्रयोग गरी पत्र, सूचना, प्रतिवेदन,
              माइन्युट र योजना छनौटजस्ता दैनिक काम छिटो, शुद्ध र जिम्मेवार ढंगले गर्ने सीप।
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#signin"
                className="rounded-lg px-5 py-2.5 font-semibold text-white"
                style={{ background: C.accent }}
              >
                प्रशिक्षक / सहभागी साइन इन
              </a>
              <a
                href={materials}
                className="rounded-lg border px-5 py-2.5 font-semibold"
                style={{ borderColor: C.navy, color: C.navy }}
              >
                तालिम सामग्री हेर्नुहोस्
              </a>
            </div>

            {active && (
              <div
                className="mt-8 rounded-2xl border bg-white p-5"
                style={{ borderColor: C.line }}
                aria-live="polite"
              >
                <p className="text-xs font-bold tracking-wider" style={{ color: C.accent }}>
                  अहिलेको तालिम
                </p>
                <p className="mt-1 text-xl font-bold">{active.name}</p>
                <p className="mt-1 text-[15px]" style={{ color: C.muted }}>
                  {[active.organizedBy, active.place, active.dates].filter(Boolean).join(" · ")}
                </p>
              </div>
            )}
          </div>

          <TrainerCard profile={profile} />
        </section>

        <section className="border-y bg-white" style={{ borderColor: C.line }}>
          <div className="mx-auto max-w-6xl px-4 py-12">
            <h2 style={display} className="text-3xl">
              चार तालिम प्याकेज
            </h2>
            <p className="mt-2 max-w-2xl" style={{ color: C.muted }}>
              पाठ उही, सन्दर्भ फरक: नगरपालिका र गाउँपालिकाका पद, कार्यपालिका र सभा अनुसार शब्द र
              उदाहरण मिलाइएका छन्।
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {COURSES.map((c) => (
                <article
                  key={c.course + c.level}
                  className="rounded-2xl border p-5"
                  style={{ borderColor: C.line, background: C.bg }}
                >
                  <p className="text-sm font-bold" style={{ color: C.accent }}>
                    {c.level}
                  </p>
                  <h3 className="mt-1 text-xl font-bold">{c.course}</h3>
                  <p className="mt-2 text-[15px]" style={{ color: C.muted }}>
                    {c.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 style={display} className="text-3xl">
            कसरी सहभागी हुने?
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["दर्ता", "तालिममा आउनुअघि आफ्नो इमेलबाट नयाँ खाता बनाउनुहोस्।"],
              ["स्वीकृति", "प्रशिक्षकले तपाईंलाई तपाईंको तालिम इभेन्टमा स्वीकृत गर्नुहुन्छ।"],
              [
                "सामग्री र परीक्षा",
                "साइन इन गरेपछि तालिम सामग्री, अभ्यास र पूर्व/पश्च परीक्षा। धेरै तालिममा भए एउटा छान्नुहोस्।",
              ],
            ].map(([t, d], i) => (
              <li
                key={t}
                className="rounded-2xl border bg-white p-5"
                style={{ borderColor: C.line }}
              >
                <span
                  className="grid h-9 w-9 place-items-center rounded-full font-bold text-white"
                  style={{ background: C.navy }}
                >
                  {["१", "२", "३"][i]}
                </span>
                <p className="mt-3 text-lg font-bold">{t}</p>
                <p className="mt-1 text-[15px]" style={{ color: C.muted }}>
                  {d}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section id="gallery" className="border-t bg-white" style={{ borderColor: C.line }}>
          <div className="mx-auto max-w-6xl px-4 py-12">
            <h2 style={display} className="text-3xl">
              तालिमका झलक
            </h2>
            {gallery === null ? (
              <p className="mt-4" style={{ color: C.muted }}>
                लोड हुँदैछ…
              </p>
            ) : gallery.length === 0 ? (
              <p className="mt-4" style={{ color: C.muted }}>
                तालिमका फोटो र भिडियो छिट्टै यहाँ देखिनेछन्।
              </p>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {gallery.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setOpen(g)}
                    className="group relative overflow-hidden rounded-xl text-left"
                    style={{ background: C.soft, aspectRatio: "4 / 3" }}
                    aria-label={g.caption || g.eventName}
                  >
                    {g.thumbUrl && (
                      <img
                        src={g.thumbUrl}
                        alt={g.caption || g.eventName}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                    {g.kind === "video" && (
                      <span className="absolute inset-0 grid place-items-center text-4xl text-white drop-shadow">
                        ▶
                      </span>
                    )}
                    <span
                      className="absolute inset-x-0 bottom-0 truncate px-2 py-1 text-xs text-white"
                      style={{ background: "linear-gradient(transparent, rgba(0,0,0,.65))" }}
                    >
                      {g.caption || g.eventName}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="signin" className="mx-auto max-w-6xl px-4 py-12">
          <SignIn />
        </section>
      </main>

      <footer
        className="border-t py-8 text-center text-sm"
        style={{ borderColor: C.line, color: C.muted }}
      >
        AI तालिम · {profile.name}
        {profile.linkedinUrl && (
          <>
            {" · "}
            <a
              href={profile.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: C.navy }}
            >
              LinkedIn
            </a>
          </>
        )}
      </footer>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-4xl border-0 bg-black p-0 text-white">
          <DialogTitle className="sr-only">
            {open?.caption || open?.eventName || "तालिमको झलक"}
          </DialogTitle>
          <DialogDescription className="sr-only">{open?.eventName}</DialogDescription>
          {open?.kind === "video" ? (
            <video
              src={open.url}
              poster={open.thumbUrl || undefined}
              controls
              autoPlay
              playsInline
              className="max-h-[80vh] w-full"
            />
          ) : open ? (
            <img
              src={open.url}
              alt={open.caption || open.eventName}
              className="max-h-[80vh] w-full object-contain"
            />
          ) : null}
          {open && (
            <p className="px-4 pb-4 text-sm" style={body}>
              {open.caption && <strong className="mr-2">{open.caption}</strong>}
              <span className="opacity-80">
                {[open.eventName, open.organizedBy].filter(Boolean).join(" · ")}
              </span>
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TrainerCard({ profile }: { profile: SiteProfile }) {
  return (
    <aside
      className="h-fit rounded-3xl border bg-white p-6 shadow-sm"
      style={{ borderColor: C.line }}
      aria-label="प्रशिक्षकको परिचय"
    >
      <div className="flex items-center gap-4">
        {profile.photoUrl ? (
          <img
            src={profile.photoUrl}
            alt={profile.name}
            className="h-24 w-24 shrink-0 rounded-full object-cover"
            style={{ border: `3px solid ${C.soft}` }}
          />
        ) : (
          <span
            className="grid h-24 w-24 shrink-0 place-items-center rounded-full text-3xl text-white"
            style={{ ...display, background: C.navy }}
            aria-hidden
          >
            {initials(profile.name)}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wider" style={{ color: C.accent }}>
            प्रशिक्षक
          </p>
          <p className="text-2xl font-bold leading-tight">{profile.name}</p>
          {(profile.title || profile.organisation) && (
            <p className="text-[15px]" style={{ color: C.muted }}>
              {[profile.title, profile.organisation].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>
      {profile.bio && (
        <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed">{profile.bio}</p>
      )}
      {profile.highlights.length > 0 && (
        <ul className="mt-4 grid gap-2 text-[15px]">
          {profile.highlights.map((h) => (
            <li key={h} className="flex gap-2">
              <span style={{ color: C.accent }} aria-hidden>
                ●
              </span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      )}
      {profile.linkedinUrl && (
        <a
          href={profile.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
          style={{ borderColor: C.line, color: C.navy }}
        >
          LinkedIn मा हेर्नुहोस् ↗
        </a>
      )}
    </aside>
  );
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err || !data.user) {
        setError("इमेल वा पासवर्ड मिलेन। फेरि प्रयास गर्नुहोस्।");
        return;
      }
      window.location.href = await destinationAfterSignIn(data.user.id);
    } catch {
      setError("जडानमा समस्या। इन्टरनेट जाँचेर फेरि प्रयास गर्नुहोस्।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="mx-auto grid max-w-4xl gap-8 rounded-3xl border bg-white p-6 md:grid-cols-2 md:p-8"
      style={{ borderColor: C.line }}
    >
      <div>
        <h2 style={display} className="text-3xl">
          साइन इन
        </h2>
        <p className="mt-2 text-[15px]" style={{ color: C.muted }}>
          प्रशिक्षक र स्वीकृत सहभागी यहीँबाट साइन इन गर्नुहोस्। प्रशिक्षक सिधै नियन्त्रण पृष्ठमा
          पुग्नुहुन्छ; सहभागी आफ्नो तालिमको सामग्री र परीक्षामा। धेरै तालिममा सहभागी हुनुहुन्छ भने
          साइन इनपछि एउटा तालिम छान्नुहोस्।
        </p>
        <p className="mt-4 text-[15px]">
          खाता छैन?{" "}
          <a
            href="/workshop/login.html#signup"
            className="font-semibold underline"
            style={{ color: C.navy }}
          >
            नयाँ दर्ता गर्नुहोस्
          </a>
        </p>
      </div>
      <form onSubmit={submit} className="grid gap-3" noValidate>
        <label className="grid gap-1 text-sm font-semibold">
          इमेल
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border px-3 py-2 text-base font-normal"
            style={{ borderColor: C.line }}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          पासवर्ड
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border px-3 py-2 text-base font-normal"
            style={{ borderColor: C.line }}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm font-semibold" style={{ color: C.accent }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !email || !password}
          className="mt-1 rounded-lg px-5 py-2.5 font-semibold text-white disabled:opacity-60"
          style={{ background: C.navy }}
        >
          {busy ? "साइन इन हुँदैछ…" : "साइन इन गर्नुहोस्"}
        </button>
      </form>
    </div>
  );
}
