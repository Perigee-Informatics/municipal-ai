import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, ExternalLink } from "lucide-react";
import { PublicShell } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { portfolioQuery } from "@/lib/queries";
import { publicStoriesQuery, typeColor } from "@/lib/stories";

export const Route = createFileRoute("/portfolio-dashboard")({
  head: () => ({
    meta: [
      { title: "Portfolio Dashboard — Dr. Bhoj Raj Ghimire" },
      { name: "description", content: "Live statistics of engagements, roles, places and career milestones of Dr. Bhoj Raj Ghimire." },
      { property: "og:title", content: "Portfolio Dashboard — Dr. Bhoj Raj Ghimire" },
      { property: "og:description", content: "Engagements, career and reach at a glance." },
    ],
  }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(portfolioQuery), context.queryClient.ensureQueryData(publicStoriesQuery)]),
  component: Dashboard,
});

const count = (arr: (string | null | undefined)[]) => {
  const m = new Map<string, number>();
  arr.forEach((k) => k && m.set(k, (m.get(k) ?? 0) + 1));
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
};
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-border bg-card p-5 shadow-soft ${className}`}>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function HBar({ data, color = "var(--color-primary)", height }: { data: { name: string; value: number }[]; color?: string | ((n: string) => string); height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(160, data.length * 26)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((d) => <Cell key={d.name} fill={typeof color === "function" ? color(d.name) : color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Dashboard() {
  const { t, pick } = useI18n();
  const { data: pf } = useSuspenseQuery(portfolioQuery);
  const { data: stories } = useSuspenseQuery(publicStoriesQuery);
  const p = pf.profile;

  const s = useMemo(() => {
    const years = stories.map((x) => +x.event_date.slice(0, 4));
    const minY = Math.min(...years), maxY = Math.max(...years);
    const roleIs = (re: RegExp) => stories.filter((x) => re.test(x.roles?.name ?? "")).length;
    const perYear = Array.from({ length: maxY - minY + 1 }, (_, i) => ({ name: String(minY + i), value: years.filter((y) => y === minY + i).length }));
    const heat = new Map<string, number>();
    stories.forEach((x) => heat.set(x.event_date.slice(0, 7), (heat.get(x.event_date.slice(0, 7)) ?? 0) + 1));
    const heatMax = Math.max(1, ...heat.values());
    return {
      total: stories.length,
      years: new Set(years).size,
      span: `${minY}–${maxY}`,
      countries: new Set(stories.map((x) => x.country).filter(Boolean)).size,
      keynotes: roleIs(/keynote|plenary/i),
      chairs: roleIs(/chair|convener/i),
      trainings: stories.filter((x) => x.event_types?.name === "Training").length,
      jury: roleIs(/jury|judge/i),
      perYear,
      byType: count(stories.map((x) => x.event_types?.name)),
      byRole: count(stories.map((x) => x.roles?.name)).slice(0, 12),
      byPlace: count(stories.map((x) => (x.city ? `${x.city}, ${x.country ?? ""}` : x.country))).slice(0, 10),
      organizers: count(stories.map((x) => x.organizer)).slice(0, 10),
      heat, heatMax, minY, maxY,
    };
  }, [stories]);

  const career = pf.experience.filter((e) => e.start_date).sort((a, b) => a.start_date!.localeCompare(b.start_date!));
  const startYear = career.length ? +career[0]!.start_date!.slice(0, 4) : 2004;
  const endYear = new Date().getFullYear() + 1;
  const pos = (d: string | null) => {
    const dt = d ? new Date(d) : new Date();
    return ((dt.getFullYear() + dt.getMonth() / 12 - startYear) / (endYear - startYear)) * 100;
  };

  const kpis = [
    [t("dash.total"), s.total], [t("dash.years"), s.years], [t("dash.countries"), s.countries], [t("dash.keynotes"), s.keynotes],
    [t("dash.chairs"), s.chairs], [t("dash.trainings"), s.trainings], [t("dash.jury"), s.jury],
  ] as const;
  const socials = [
    { name: "Facebook", url: p?.facebook, stat: p?.facebook_followers && `${p.facebook_followers} ${t("dash.followers")}` },
    { name: "LinkedIn", url: p?.linkedin, stat: [p?.linkedin_followers && `${p.linkedin_followers} ${t("dash.followers")}`, p?.linkedin_connections && `${p.linkedin_connections} ${t("dash.connections")}`].filter(Boolean).join(" · ") },
    { name: "Instagram", url: p?.instagram }, { name: "Google Scholar", url: p?.google_scholar }, { name: "ResearchGate", url: p?.researchgate }, { name: "ORCID", url: p?.orcid },
  ].filter((x) => x.url);

  return (
    <PublicShell>
      <div className="container-page py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{t("nav.dashboard")}</p>
            <h1 className="mt-3 text-4xl font-semibold">{t("dash.title")}</h1>
            <p className="mt-2 text-muted-foreground">{t("dash.subtitle")}</p>
          </div>
          {pf.cvUrl && <Button asChild variant="accent"><a href={pf.cvUrl} target="_blank" rel="noreferrer"><Download />{t("dash.cv")}</a></Button>}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {kpis.map(([label, v]) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="font-display text-3xl font-semibold text-primary">{v}</div>
              <div className="mt-1 text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel title={t("dash.perYear")}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={s.perYear}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
          <Panel title={t("dash.heat")}>
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead><tr><th />{MONTHS.map((m, i) => <th key={i} className="w-6 font-normal text-muted-foreground">{m}</th>)}</tr></thead>
                <tbody>
                  {Array.from({ length: s.maxY - s.minY + 1 }, (_, i) => s.maxY - i).map((y) => (
                    <tr key={y}>
                      <td className="pr-2 text-muted-foreground">{y}</td>
                      {MONTHS.map((_, m) => {
                        const v = s.heat.get(`${y}-${String(m + 1).padStart(2, "0")}`) ?? 0;
                        return <td key={m} className="p-0.5"><div title={`${v}`} className="h-5 w-5 rounded-sm" style={{ background: v ? `color-mix(in oklch, var(--color-accent) ${25 + (v / s.heatMax) * 75}%, transparent)` : "var(--color-muted)" }} /></td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title={t("dash.byType")}><HBar data={s.byType} color={typeColor} /></Panel>
          <Panel title={t("dash.byRole")}><HBar data={s.byRole} /></Panel>
          <Panel title={t("dash.byPlace")}><HBar data={s.byPlace} color="var(--color-chart-3)" /></Panel>
          <Panel title={t("dash.organizers")}>
            <ol className="space-y-2 text-sm">
              {s.organizers.map((o, i) => (
                <li key={o.name} className="flex items-center gap-3"><span className="w-5 text-muted-foreground">{i + 1}</span><span className="flex-1 truncate">{o.name}</span><span className="rounded bg-secondary px-2 py-0.5 text-xs">{o.value}</span></li>
              ))}
            </ol>
          </Panel>
        </div>

        <Panel title={t("dash.career")} className="mt-6">
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="relative mb-2 ml-[16rem] h-5 text-[10px] text-muted-foreground">
                {Array.from({ length: Math.ceil((endYear - startYear) / 2) }, (_, i) => startYear + i * 2).map((y) => (
                  <span key={y} className="absolute" style={{ left: `${pos(`${y}-01-01`)}%` }}>{y}</span>
                ))}
              </div>
              <div className="space-y-1.5">
                {career.map((e) => (
                  <div key={e.id} className="flex items-center text-xs">
                    <div className="w-[16rem] shrink-0 truncate pr-3" title={`${e.title} — ${e.organization}`}><span className="font-medium">{pick(e.title, e.title_ne)}</span> <span className="text-muted-foreground">· {pick(e.organization, e.organization_ne)}</span></div>
                    <div className="relative h-4 flex-1 rounded bg-muted/50">
                      <div className={`absolute h-4 rounded ${e.end_date ? "bg-primary/70" : "bg-accent"}`} style={{ left: `${pos(e.start_date)}%`, width: `${Math.max(0.8, pos(e.end_date) - pos(e.start_date))}%` }} title={e.period ?? ""} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <Panel title={t("dash.education")}>
            <ul className="space-y-3 text-sm">{pf.education.map((e) => <li key={e.id}><div className="font-medium">{pick(e.degree, e.degree_ne)}</div><div className="text-muted-foreground">{pick(e.institution, e.institution_ne)}</div></li>)}</ul>
          </Panel>
          <Panel title={t("dash.certs")}>
            <ul className="space-y-3 text-sm">{pf.certifications.filter((c) => c.kind === "certification").map((c) => <li key={c.id}><div className="font-medium">{pick(c.name, c.name_ne)}</div><div className="text-muted-foreground">{[c.issuer, c.year].filter(Boolean).join(" · ")}</div></li>)}</ul>
          </Panel>
          <Panel title={t("dash.honors")}>
            <ul className="space-y-3 text-sm">{pf.certifications.filter((c) => c.kind === "honor").map((c) => <li key={c.id}><div className="font-medium">{pick(c.name, c.name_ne)}</div><div className="text-muted-foreground">{[c.issuer, c.year].filter(Boolean).join(" · ")}</div></li>)}</ul>
          </Panel>
        </div>

        <Panel title={t("dash.social")} className="mt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {socials.map((x) => (
              <a key={x.name} href={x.url!} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-border p-4 hover:border-accent">
                <div><div className="font-medium">{x.name}</div>{x.stat && <div className="text-sm text-muted-foreground">{x.stat}</div>}</div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            ))}
          </div>
        </Panel>
      </div>
    </PublicShell>
  );
}
