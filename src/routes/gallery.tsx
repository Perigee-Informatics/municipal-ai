import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageIntro } from "@/components/site/PageIntro";
import { PublicShell } from "@/components/site/SiteHeader";
import { StoryDialog, storyDate } from "@/components/story/StoryCard";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { galleryQuery, type GalleryPhoto } from "@/lib/gallery";
import { useI18n } from "@/lib/i18n";
import { publicStoriesQuery } from "@/lib/stories";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — Dr. Bhoj Raj Ghimire · AI for ALL" },
      {
        name: "description",
        content:
          "Photos and videos from AI for ALL trainings, talks and engagements of Dr. Bhoj Raj Ghimire, each tagged to its event.",
      },
      { property: "og:title", content: "Gallery — Dr. Bhoj Raj Ghimire" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(galleryQuery),
  component: GalleryPage,
});

function GalleryPage() {
  const { t, pick } = useI18n();
  const { data } = useSuspenseQuery(galleryQuery);
  const { data: stories } = useQuery(publicStoriesQuery);
  const [filter, setFilter] = useState<string>("");
  const [open, setOpen] = useState<GalleryPhoto | null>(null);
  const [storyId, setStoryId] = useState<string | null>(null);

  // one chip per tagged event, newest first, with its number of items
  const events = useMemo(() => {
    const m = new Map<
      string,
      { id: string; label: string; date: string | null; n: number; training: boolean }
    >();
    data.forEach((g) => {
      const id = g.storyId ?? `t:${g.title}`;
      const e = m.get(id) ?? {
        id,
        label: pick(g.title, g.titleNe),
        date: g.date,
        n: 0,
        training: g.source === "training",
      };
      e.n += 1;
      m.set(id, e);
    });
    return [...m.values()].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }, [data, pick]);

  const shown = filter ? data.filter((g) => (g.storyId ?? `t:${g.title}`) === filter) : data;
  const story = storyId ? stories?.find((s) => s.id === storyId) : undefined;

  return (
    <PublicShell>
      <PageIntro
        eyebrow={t("nav.gallery")}
        title={t("gallery.title")}
        subtitle={t("gallery.intro")}
      />
      <section className="container-page pb-16">
        {events.length > 1 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("gallery.all")}>
            <Chip on={!filter} onClick={() => setFilter("")}>
              {t("gallery.all")} <span className="opacity-60">{data.length}</span>
            </Chip>
            {events.map((e) => (
              <Chip key={e.id} on={filter === e.id} onClick={() => setFilter(e.id)} title={e.label}>
                <span className="max-w-[16rem] truncate">{e.label}</span>{" "}
                <span className="opacity-60">{e.n}</span>
              </Chip>
            ))}
          </div>
        )}

        {shown.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
            {t("gallery.empty")}
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((g) => (
              <figure
                key={g.id}
                className="card-lift group overflow-hidden rounded-xl border border-border bg-card"
              >
                <button
                  type="button"
                  onClick={() => setOpen(g)}
                  className="relative block aspect-[4/3] w-full overflow-hidden bg-muted"
                  aria-label={g.caption || pick(g.title, g.titleNe)}
                >
                  {g.thumbUrl && (
                    <img
                      src={g.thumbUrl}
                      alt={g.caption || pick(g.title, g.titleNe)}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  {g.kind === "video" && (
                    <span className="absolute inset-0 grid place-items-center text-4xl text-white drop-shadow">
                      ▶
                    </span>
                  )}
                </button>
                <figcaption className="p-3 text-xs">
                  {g.caption && (
                    <p className="line-clamp-2 font-medium text-foreground">{g.caption}</p>
                  )}
                  <button
                    type="button"
                    className="mt-1 line-clamp-2 text-left text-muted-foreground hover:text-primary hover:underline disabled:no-underline"
                    disabled={!g.storyId}
                    onClick={() => g.storyId && setStoryId(g.storyId)}
                    title={pick(g.title, g.titleNe)}
                  >
                    {g.source === "training" && (
                      <span className="mr-1 rounded bg-accent/20 px-1 font-semibold text-accent-foreground">
                        AI for ALL
                      </span>
                    )}
                    {pick(g.title, g.titleNe)}
                    {g.date && ` · ${storyDate({ event_date: g.date, end_date: null })}`}
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-4xl border-0 bg-black p-0 text-white">
          <DialogTitle className="sr-only">
            {open?.caption || (open ? pick(open.title, open.titleNe) : "")}
          </DialogTitle>
          <DialogDescription className="sr-only">{open?.organizer ?? ""}</DialogDescription>
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
              alt={open.caption || pick(open.title, open.titleNe)}
              className="max-h-[80vh] w-full object-contain"
            />
          ) : null}
          {open && (
            <p className="px-4 pb-4 text-sm">
              {open.caption && <strong className="mr-2">{open.caption}</strong>}
              <span className="opacity-80">
                {[pick(open.title, open.titleNe), open.organizer, open.city]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </p>
          )}
        </DialogContent>
      </Dialog>

      {story && <StoryDialog story={story} onClose={() => setStoryId(null)} />}
    </PublicShell>
  );
}

function Chip({
  on,
  onClick,
  title,
  children,
}: {
  on: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}
