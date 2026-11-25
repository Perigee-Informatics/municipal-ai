import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, GraduationCap, Images, Mail, MapPin, MapPinned, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { PublicShell } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { portfolioQuery, publicEventsQuery } from "@/lib/queries";
import { publicStoriesQuery } from "@/lib/stories";
import { timeRange } from "@/components/site/MonthCalendar";
import { galleryQuery } from "@/lib/gallery";
import { frontPageTarget } from "@/lib/front-page";
import { loadActiveEvent, type ActiveEvent } from "@/lib/landing-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dr. Bhoj Raj Ghimire — GIS, e-Governance & Digital Transformation" },
      { name: "description", content: "Academic, technologist and advisor. Invite Dr. Ghimire for lectures, keynotes, trainings and consultations." },
      { property: "og:title", content: "Dr. Bhoj Raj Ghimire" },
      { property: "og:description", content: "GIS, e-governance and digital transformation expert. Request an engagement." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(portfolioQuery), context.queryClient.ensureQueryData(publicEventsQuery)]),
  component: Home,
});

function SectionHead({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mt-2 text-3xl font-semibold text-balance md:text-4xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function Home() {
  const { t, pick } = useI18n();
  const { data } = useSuspenseQuery(portfolioQuery);
  const { data: events } = useSuspenseQuery(publicEventsQuery);
  const { data: stories } = useQuery(publicStoriesQuery);
  const p = data.profile;
  const today = format(new Date(), "yyyy-MM-dd");
  const upcoming = events.filter((e) => e.session_date >= today).slice(0, 4);
  const career = data.experience.filter((e) => e.category !== "consulting").slice(0, 4);
  const recent = (stories ?? []).filter((s) => s.cover?.url && s.cover.media_type === "image").slice(0, 3);
  const topDegree = data.education[0];
  const socials = p
    ? ([["LinkedIn", p.linkedin], ["Scholar", p.google_scholar], ["ResearchGate", p.researchgate], ["ORCID", p.orcid]] as const).filter(([, u]) => !!u)
    : [];

  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero text-navy-foreground">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="container-page relative grid items-center gap-12 pb-28 pt-14 md:grid-cols-[1.3fr_1fr] md:pb-36 md:pt-20">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="inline-flex items-center gap-2 rounded-full border border-navy-foreground/15 bg-navy-foreground/5 px-3 py-1 text-xs">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-success" /></span>
              {t("hero.available")}
            </span>
            <p className="eyebrow mt-6">PhD · PMP · ISO 27001 Lead Auditor</p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.05] text-balance md:text-6xl">{pick(p?.full_name, p?.full_name_ne)}</h1>
            <p className="mt-5 text-xl text-navy-foreground/85 text-balance md:text-2xl">{pick(p?.headline, p?.headline_ne)}</p>
            <p className="mt-5 max-w-xl leading-relaxed text-navy-foreground/70">{pick(p?.short_bio, p?.short_bio_ne)}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="accent" size="lg" className="rounded-full"><Link to="/request">{t("hero.cta")} <ArrowRight /></Link></Button>
              <Button asChild variant="heroOutline" size="lg" className="rounded-full"><Link to="/about">{t("hero.about")}</Link></Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-navy-foreground/70">
              {p?.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{p.location}</span>}
              {p?.email && <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 hover:text-navy-foreground"><Mail className="h-4 w-4" />{p.email}</a>}
              {socials.map(([n, u]) => (
                <a key={n} href={u!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-accent">{n}<ArrowUpRight className="h-3 w-3" /></a>
              ))}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xs animate-in fade-in zoom-in-95 duration-700 md:max-w-sm">
            <div className="absolute -inset-4 rotate-3 rounded-[1.75rem] border border-accent/40" />
            <div className="absolute -inset-4 -rotate-2 rounded-[1.75rem] bg-accent/10" />
            {data.photoUrl ? (
              <img src={data.photoUrl} alt={p?.full_name ?? ""} className="relative aspect-[4/5] w-full rounded-2xl object-cover shadow-2xl" />
            ) : (
              <div className="relative flex aspect-[4/5] w-full items-center justify-center rounded-2xl bg-navy-foreground/5 shadow-2xl">
                <span className="font-display text-8xl font-semibold text-accent">BRG</span>
              </div>
            )}
            {topDegree && (
              <div className="absolute -bottom-5 -left-4 max-w-[85%] rounded-xl bg-card px-4 py-3 text-card-foreground shadow-soft">
                <div className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">{pick(topDegree.institution, topDegree.institution_ne)}</div>
                <div className="truncate font-display text-sm font-semibold">{pick(topDegree.degree, topDegree.degree_ne)}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats band */}
      {data.highlights.length > 0 && (
        <section className="container-page relative -mt-16 md:-mt-20">
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card shadow-soft md:grid-cols-4">
            {data.highlights.slice(0, 4).map((h, i) => (
              <div key={h.id} className={`p-6 md:p-8 ${i % 2 ? "border-l" : ""} ${i >= 2 ? "border-t md:border-t-0" : ""} ${i === 2 ? "md:border-l" : ""} border-border`}>
                <div className="font-display text-3xl font-semibold text-primary md:text-4xl">{h.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{pick(h.label, h.label_ne)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Flagship programme: AI for ALL */}
      <AiForAll trainings={(stories ?? []).filter((s) => s.training_event_id).length} />

      {/* Expertise */}
      <section className="container-page py-20">
        <SectionHead eyebrow={t("home.highlights")} title={t("home.expertise")} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.expertise.map((e, i) => (
            <div key={e.id} className="card-lift rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="font-display text-sm font-semibold text-accent">{String(i + 1).padStart(2, "0")}</div>
              <div className="mt-3 text-lg font-semibold">{pick(e.title, e.title_ne)}</div>
              {e.description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pick(e.description, e.description_ne)}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Career + upcoming */}
      <section className="border-y border-border bg-secondary/50">
        <div className="container-page grid gap-14 py-20 lg:grid-cols-2">
          <div>
            <SectionHead title={t("home.journey")} />
            <ol className="mt-8 space-y-1">
              {career.map((e) => (
                <li key={e.id} className="group grid grid-cols-[7rem_1fr] gap-4 rounded-xl p-3 transition-colors hover:bg-card">
                  <div className="pt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{e.period}</div>
                  <div>
                    <div className="font-medium group-hover:text-primary">{pick(e.title, e.title_ne)}</div>
                    <div className="text-sm text-muted-foreground">{pick(e.organization, e.organization_ne)}</div>
                  </div>
                </li>
              ))}
            </ol>
            <Link to="/about" className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">{t("home.viewAll")}<ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div>
            <SectionHead title={t("home.upcoming")} />
            <div className="mt-8 space-y-3">
              {upcoming.length === 0 && <p className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">{t("home.noEvents")}</p>}
              {upcoming.map((e) => (
                <div key={e.id + e.session_date} className="card-lift flex gap-4 rounded-xl border border-border bg-card p-4">
                  <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary py-2 text-primary-foreground">
                    <div className="text-[10px] uppercase tracking-wider text-accent">{format(parseISO(e.session_date), "MMM")}</div>
                    <div className="font-display text-2xl font-semibold leading-none">{format(parseISO(e.session_date), "d")}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium">{e.event_title}</div>
                    <div className="text-sm text-muted-foreground">{e.organization} · {pick(e.role, e.role_ne)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{timeRange(e.start_time, e.end_time)} {[e.city, e.country].filter(Boolean).join(", ")}</div>
                  </div>
                </div>
              ))}
              <Link to="/events" className="inline-flex items-center gap-1.5 pt-2 text-sm font-medium text-primary hover:underline"><CalendarDays className="h-4 w-4" />{t("home.allEvents")}</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Recent engagements from the story map */}
      {recent.length > 0 && (
        <section className="container-page py-20">
          <SectionHead
            title={t("home.recent")}
            action={<Link to="/story-map" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><MapPinned className="h-4 w-4" />{t("home.mapLink")}</Link>}
          />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {recent.map((s) => (
              <Link key={s.id} to="/story-map" className="card-lift group overflow-hidden rounded-2xl border border-border bg-card">
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  <img src={s.cover!.url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="p-5">
                  <div className="text-xs font-medium uppercase tracking-wide text-accent">{format(parseISO(s.event_date), "d MMM yyyy")}{s.event_types && ` · ${pick(s.event_types.name, s.event_types.name_ne)}`}</div>
                  <div className="mt-2 line-clamp-2 font-medium">{s.title}</div>
                  {(s.city || s.country) && <div className="mt-1 text-sm text-muted-foreground">{[s.city, s.country].filter(Boolean).join(", ")}</div>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Gallery strip: photos tagged to their events */}
      <GalleryStrip />

      {/* Call to action */}
      <section className="container-page pt-8">
        <div className="relative overflow-hidden rounded-3xl bg-hero px-6 py-14 text-navy-foreground md:px-14">
          <div className="bg-grid pointer-events-none absolute inset-0" />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold text-balance md:text-4xl">{t("home.ctaTitle")}</h2>
              <p className="mt-3 text-navy-foreground/75">{t("home.ctaBody")}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="accent" size="lg" className="rounded-full"><Link to="/request">{t("hero.cta")}<ArrowRight /></Link></Button>
              {p?.email && <Button asChild variant="heroOutline" size="lg" className="rounded-full"><a href={`mailto:${p.email}`}><Mail />{t("home.contact")}</a></Button>}
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

const PACKAGES = [
  "AI for Municipal Employees",
  "AI for Rural Municipal Employees",
  "AI for Municipal Representatives",
  "AI for Rural Municipal Representatives",
  "AI for CSOs",
];

/** The AI for ALL programme as the main attraction of the home page. */
function AiForAll({ trainings }: { trainings: number }) {
  const { t } = useI18n();
  const [active, setActive] = useState<ActiveEvent | null>(null);
  const [materials, setMaterials] = useState("/workshop/index.html");
  useEffect(() => {
    loadActiveEvent().then(setActive).catch(() => {});
    frontPageTarget().then(setMaterials).catch(() => {});
  }, []);
  return (
    <section className="container-page pt-20" aria-labelledby="aiforall-title">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="grid gap-10 p-6 md:grid-cols-[1.4fr_1fr] md:p-10">
          <div>
            <p className="eyebrow inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />{t("prog.eyebrow")}</p>
            <h2 id="aiforall-title" className="mt-2 text-3xl font-semibold text-balance md:text-4xl">{t("prog.title")}</h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">{t("prog.body")}</p>
            <ul className="mt-5 flex flex-wrap gap-2 text-xs">
              {PACKAGES.map((p) => (
                <li key={p} className="rounded-full border border-border bg-secondary/60 px-3 py-1">{p}</li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full"><Link to="/ai-for-all">{t("prog.cta")} <ArrowRight /></Link></Button>
              <Button asChild variant="outline" size="lg" className="rounded-full"><a href={materials}><BookOpen />{t("prog.materials")}</a></Button>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-secondary/60 p-5">
                <div className="font-display text-3xl font-semibold text-primary">{trainings || "—"}</div>
                <div className="mt-1 text-sm text-muted-foreground">{t("prog.trainings")}</div>
              </div>
              <div className="rounded-2xl bg-secondary/60 p-5">
                <div className="font-display text-3xl font-semibold text-primary">{PACKAGES.length}</div>
                <div className="mt-1 text-sm text-muted-foreground">{t("prog.packages")}</div>
              </div>
            </div>
            {active && (
              <Link to="/ai-for-all" className="card-lift rounded-2xl border border-accent/50 bg-accent/10 p-5" aria-live="polite">
                <p className="eyebrow inline-flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" />{t("prog.current")}</p>
                <p className="mt-1 text-lg font-semibold">{active.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{[active.organizedBy, active.place, active.dates].filter(Boolean).join(" · ")}</p>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** A strip of the newest gallery items; each links to the full, event-tagged gallery. */
function GalleryStrip() {
  const { t, pick } = useI18n();
  const { data } = useQuery(galleryQuery);
  const items = (data ?? []).filter((g) => g.thumbUrl).slice(0, 8);
  if (!items.length) return null;
  return (
    <section className="container-page pt-4 pb-12">
      <SectionHead
        title={t("home.gallery")}
        action={<Link to="/gallery" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><Images className="h-4 w-4" />{t("home.galleryLink")}</Link>}
      />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((g) => (
          <Link key={g.id} to="/gallery" className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
            <img src={g.thumbUrl} alt={g.caption || pick(g.title, g.titleNe)} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 py-1 text-xs text-white">{pick(g.title, g.titleNe)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
