import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowUpRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/site/SiteHeader";
import { useI18n } from "@/lib/i18n";
import { portfolioQuery } from "@/lib/queries";
import { useAdminSession } from "@/lib/use-admin-session";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About & Portfolio — Dr. Bhoj Raj Ghimire" },
      { name: "description", content: "Education, career timeline, expertise, certifications and publications of Dr. Bhoj Raj Ghimire." },
      { property: "og:title", content: "About Dr. Bhoj Raj Ghimire" },
      { property: "og:description", content: "Education, career, expertise and certifications." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(portfolioQuery),
  component: About,
});

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border py-12 first:border-t-0 first:pt-0">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** Highlights the section currently in view in the side navigation. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  const key = ids.join(",");
  useEffect(() => {
    const els = key.split(",").map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [key]);
  return active;
}

function About() {
  const { t, pick } = useI18n();
  const { data } = useSuspenseQuery(portfolioQuery);
  // Education years are private: shown only to the signed-in admin.
  const { signedIn: showEduYears } = useAdminSession();
  const p = data.profile;
  const socials = p
    ? ([
        ["LinkedIn", p.linkedin], ["Google Scholar", p.google_scholar], ["ResearchGate", p.researchgate], ["ORCID", p.orcid],
        ["Facebook", p.facebook], ["Instagram", p.instagram], ["Website", p.website],
      ] as const).filter(([, u]) => !!u)
    : [];
  const career = data.experience.filter((e) => e.category !== "consulting");
  const consulting = data.experience.filter((e) => e.category === "consulting");
  const certs = data.certifications.filter((c) => c.kind !== "membership" && c.kind !== "honor");
  const honors = data.certifications.filter((c) => c.kind === "honor");
  const members = data.certifications.filter((c) => c.kind === "membership");

  const sections = [
    { id: "expertise", label: t("about.expertise") },
    { id: "career", label: t("about.career") },
    ...(consulting.length ? [{ id: "consulting", label: t("about.consulting") }] : []),
    { id: "education", label: t("about.education") },
    { id: "certifications", label: t("about.certs") },
    ...(honors.length ? [{ id: "honors", label: t("dash.honors") }] : []),
    { id: "memberships", label: t("about.memberships") },
    { id: "publications", label: t("about.publications") },
  ];
  const active = useActiveSection(sections.map((s) => s.id));

  return (
    <PublicShell>
      <div className="container-page grid gap-12 py-14 lg:grid-cols-[18rem_1fr] lg:gap-16 lg:py-20">
        <aside className="lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <div className="flex items-center gap-4 lg:block">
            {data.photoUrl && <img src={data.photoUrl} alt="" className="h-20 w-20 rounded-2xl object-cover shadow-soft lg:h-28 lg:w-28" />}
            <div className="lg:mt-5">
              <p className="eyebrow">{t("about.title")}</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight lg:text-3xl">{pick(p?.full_name, p?.full_name_ne)}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{pick(p?.headline, p?.headline_ne)}</p>
            </div>
          </div>
          <nav className="mt-8 hidden lg:block" aria-label={t("about.onThisPage")}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("about.onThisPage")}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className={`group flex items-center gap-3 py-1 transition-colors ${active === s.id ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    <span className={`h-px transition-all ${active === s.id ? "w-10 bg-accent" : "w-5 bg-border group-hover:w-8 group-hover:bg-foreground"}`} />
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          {socials.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("about.connect")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {socials.map(([n, u]) => (
                  <a key={n} href={u!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs hover:border-accent hover:text-primary">{n}<ArrowUpRight className="h-3 w-3" /></a>
                ))}
              </div>
            </div>
          )}
          {data.cvUrl && (
            <Button asChild variant="accent" size="sm" className="mt-6 rounded-full"><a href={data.cvUrl} target="_blank" rel="noreferrer"><Download />{t("dash.cv")}</a></Button>
          )}
        </aside>

        <div className="min-w-0">
          <p className="max-w-3xl whitespace-pre-line text-lg leading-relaxed text-muted-foreground">{pick(p?.long_bio || p?.short_bio, p?.long_bio_ne || p?.short_bio_ne)}</p>

          <div className="mt-14">
            <Section id="expertise" title={t("about.expertise")}>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.expertise.map((e) => (
                  <div key={e.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="font-medium">{pick(e.title, e.title_ne)}</div>
                    {e.description && <p className="mt-1 text-sm text-muted-foreground">{pick(e.description, e.description_ne)}</p>}
                  </div>
                ))}
              </div>
            </Section>
            <Section id="career" title={t("about.career")}>
              <ol className="space-y-2">
                {career.map((e) => (
                  <li key={e.id} className="group grid gap-1 rounded-xl p-4 transition-colors hover:bg-card hover:shadow-soft sm:grid-cols-[9rem_1fr] sm:gap-6">
                    <div className="pt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{e.period}</div>
                    <div>
                      <div className="font-medium group-hover:text-primary">{pick(e.title, e.title_ne)}</div>
                      <div className="text-sm text-muted-foreground">{pick(e.organization, e.organization_ne)}</div>
                      {e.description && <p className="mt-2 text-sm leading-relaxed">{pick(e.description, e.description_ne)}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
            {consulting.length > 0 && (
              <Section id="consulting" title={t("about.consulting")}>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {consulting.map((e) => (
                    <li key={e.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="font-medium">{pick(e.organization, e.organization_ne)}</div>
                      <div className="text-sm text-muted-foreground">{pick(e.title, e.title_ne)}</div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            <Section id="education" title={t("about.education")}>
              <ul className="space-y-5">
                {data.education.map((e) => (
                  <li key={e.id} className={showEduYears ? "grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-6" : ""}>
                    {showEduYears && <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{e.year}</div>}
                    <div>
                      <div className="font-medium">{pick(e.degree, e.degree_ne)}</div>
                      <div className="text-sm text-muted-foreground">{pick(e.institution, e.institution_ne)}{e.location ? `, ${e.location}` : ""}</div>
                      {e.notes && <div className="mt-1 text-sm italic text-muted-foreground">{pick(e.notes, e.notes_ne)}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
            <Section id="certifications" title={t("about.certs")}>
              <ul className="flex flex-wrap gap-2">
                {certs.map((c) => (
                  <li key={c.id} className="rounded-full border border-border bg-card px-3 py-1.5 text-sm"><span className="font-medium">{pick(c.name, c.name_ne)}</span>{c.issuer && <span className="text-muted-foreground"> · {c.issuer}</span>}</li>
                ))}
              </ul>
            </Section>
            {honors.length > 0 && (
              <Section id="honors" title={t("dash.honors")}>
                <ul className="space-y-2">{honors.map((c) => <li key={c.id}><span className="font-medium">{pick(c.name, c.name_ne)}</span><span className="text-muted-foreground">{[c.issuer, c.year].filter(Boolean).map((x) => ` · ${x}`).join("")}</span></li>)}</ul>
              </Section>
            )}
            <Section id="memberships" title={t("about.memberships")}>
              <ul className="space-y-2">{members.map((c) => <li key={c.id}><span className="font-medium">{pick(c.name, c.name_ne)}</span>{c.issuer && <span className="text-muted-foreground"> · {c.issuer}</span>}</li>)}</ul>
            </Section>
            <Section id="publications" title={t("about.publications")}>
              {data.publications.length === 0 ? <p className="text-muted-foreground">{t("about.noPubs")}</p> : (
                <ul className="space-y-4">
                  {data.publications.map((pub) => (
                    <li key={pub.id} className="rounded-xl p-3 transition-colors hover:bg-card">
                      {pub.url ? <a href={pub.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 font-medium hover:text-primary">{pub.title}<ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0" /></a> : <span className="font-medium">{pub.title}</span>}
                      <div className="text-sm text-muted-foreground">{[pub.authors, pub.venue, pub.year].filter(Boolean).join(" · ")}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
