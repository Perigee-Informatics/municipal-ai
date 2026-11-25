import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PublicShell } from "@/components/site/SiteHeader";
import { StoryDialog, storyDate } from "@/components/story/StoryCard";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { publicStoriesQuery, typeColor } from "@/lib/stories";

const StoryMapCanvas = lazy(() => import("@/components/story/StoryMapCanvas"));

export const Route = createFileRoute("/story-map")({
  head: () => ({
    meta: [
      { title: "Story Map — Dr. Bhoj Raj Ghimire" },
      { name: "description", content: "An interactive map and timeline of Dr. Ghimire's lectures, keynotes, trainings and dialogues across Nepal and beyond." },
      { property: "og:title", content: "Story Map — Dr. Bhoj Raj Ghimire" },
      { property: "og:description", content: "Interactive map and timeline of past engagements." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(publicStoriesQuery),
  component: StoryMapPage,
});

const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";

function StoryMapPage() {
  const { t, pick } = useI18n();
  const { data } = useSuspenseQuery(publicStoriesQuery);
  const years = useMemo(() => [...new Set(data.map((s) => +s.event_date.slice(0, 4)))].sort(), [data]);
  const [from, setFrom] = useState(years[0] ?? 2017);
  const [to, setTo] = useState(years.at(-1) ?? 2026);
  const [type, setType] = useState("");
  const [role, setRole] = useState("");
  const [country, setCountry] = useState("");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const opts = (f: (s: (typeof data)[number]) => string | null | undefined) => [...new Set(data.map(f).filter(Boolean) as string[])].sort();
  const filtered = useMemo(
    () =>
      data.filter((s) => {
        const y = +s.event_date.slice(0, 4);
        const hay = `${s.title} ${s.title_ne ?? ""} ${s.organizer ?? ""} ${s.city ?? ""}`.toLowerCase();
        return y >= from && y <= to && (!type || s.event_types?.name === type) && (!role || s.roles?.name === role) && (!country || s.country === country) && (!q || hay.includes(q.toLowerCase()));
      }),
    [data, from, to, type, role, country, q],
  );
  const grouped = useMemo(() => {
    const g = new Map<string, typeof filtered>();
    filtered.forEach((s) => g.set(s.event_date.slice(0, 4), [...(g.get(s.event_date.slice(0, 4)) ?? []), s]));
    return [...g.entries()];
  }, [filtered]);

  // Scrolling the timeline pans the map to the story nearest the top of the list.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = vis[0]?.target.getAttribute("data-id");
        if (id) setActive(id);
      },
      { root, rootMargin: "0px 0px -70% 0px" },
    );
    root.querySelectorAll("[data-id]").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [filtered]);

  const onSelect = useCallback((id: string) => setOpen(id), []);
  const openStory = data.find((s) => s.id === open);
  const types = opts((s) => s.event_types?.name);

  return (
    <PublicShell>
      <div className="container-page py-12">
        <p className="eyebrow">{t("nav.storymap")}</p>
        <h1 className="mt-3 text-4xl font-semibold">{t("map.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("map.subtitle")}</p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("map.search")} className="w-56" />
          <label className="flex items-center gap-1 text-sm text-muted-foreground">{t("map.from")}<select className={sel} value={from} onChange={(e) => setFrom(+e.target.value)}>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
          <label className="flex items-center gap-1 text-sm text-muted-foreground">{t("map.to")}<select className={sel} value={to} onChange={(e) => setTo(+e.target.value)}>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
          <select className={sel} value={type} onChange={(e) => setType(e.target.value)}><option value="">{t("map.allTypes")}</option>{types.map((x) => <option key={x}>{x}</option>)}</select>
          <select className={sel} value={role} onChange={(e) => setRole(e.target.value)}><option value="">{t("map.allRoles")}</option>{opts((s) => s.roles?.name).map((x) => <option key={x}>{x}</option>)}</select>
          <select className={sel} value={country} onChange={(e) => setCountry(e.target.value)}><option value="">{t("map.allCountries")}</option>{opts((s) => s.country).map((x) => <option key={x}>{x}</option>)}</select>
          <button className="text-sm text-muted-foreground underline" onClick={() => { setQ(""); setType(""); setRole(""); setCountry(""); setFrom(years[0]!); setTo(years.at(-1)!); }}>{t("map.reset")}</button>
          <span className="ml-auto text-sm text-muted-foreground">{filtered.length} {t("map.count")}</span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="h-[420px] overflow-hidden rounded-xl border border-border shadow-soft lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]">
            <ClientOnly fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
              <Suspense fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
                <StoryMapCanvas stories={filtered} activeId={active} onSelect={onSelect} />
              </Suspense>
            </ClientOnly>
          </div>
          <div ref={listRef} className="max-h-[70vh] overflow-y-auto pr-2 lg:max-h-[calc(100vh-7rem)]">
            {grouped.length === 0 && <p className="p-6 text-center text-muted-foreground">{t("map.empty")}</p>}
            {grouped.map(([year, items]) => (
              <section key={year} className="mb-6">
                <h2 className="sticky top-0 z-10 bg-background/95 py-2 font-display text-2xl font-semibold text-primary backdrop-blur">{year}</h2>
                <ol className="space-y-2 border-l border-border pl-4">
                  {items.map((s) => (
                    <li key={s.id} data-id={s.id}>
                      <button onClick={() => setOpen(s.id)} className={`relative flex w-full gap-3 rounded-lg border p-3 text-left transition-colors ${active === s.id ? "border-accent bg-accent/10" : "border-transparent hover:bg-muted/60"}`}>
                        <span className="absolute -left-[1.4rem] top-4 h-2.5 w-2.5 rounded-full" style={{ background: typeColor(s.event_types?.name) }} />
                        {s.cover?.url && s.cover.media_type === "image" && <img src={s.cover.url} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded object-cover" />}
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">{storyDate(s)} · {pick(s.event_types?.name, s.event_types?.name_ne)}</div>
                          <div className="line-clamp-2 font-medium">{pick(s.title, s.title_ne)}</div>
                          <div className="truncate text-xs text-muted-foreground">{[pick(s.roles?.name, s.roles?.name_ne), s.organizer, s.city].filter(Boolean).join(" · ")}</div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {types.map((x) => <span key={x} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: typeColor(x) }} />{x}</span>)}
        </div>
      </div>
      {openStory && <StoryDialog story={openStory} onClose={() => setOpen(null)} />}
    </PublicShell>
  );
}
