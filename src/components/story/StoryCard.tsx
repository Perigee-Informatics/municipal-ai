import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, ExternalLink, MapPin, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { typeColor, type StoryView } from "@/lib/stories";

export function storyDate(s: { event_date: string; end_date: string | null }) {
  const a = format(parseISO(s.event_date), "d MMM yyyy");
  return s.end_date && s.end_date !== s.event_date ? `${a} – ${format(parseISO(s.end_date), "d MMM yyyy")}` : a;
}

export function StoryDialog({ story, onClose }: { story: StoryView; onClose: () => void }) {
  const { t, pick } = useI18n();
  const [lb, setLb] = useState<number | null>(null);
  const media = story.media.filter((m) => m.url);
  const cur = lb != null ? media[lb] : null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-foreground/50 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {story.cover?.url && (story.cover.media_type === "image" ? <img src={story.cover.url} alt="" className="aspect-video w-full object-cover" /> : <video src={story.cover.url} controls className="aspect-video w-full bg-foreground" />)}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full px-2 py-0.5 font-medium text-primary-foreground" style={{ background: typeColor(story.event_types?.name) }}>{pick(story.event_types?.name, story.event_types?.name_ne)}</span>
                <span className="text-muted-foreground">{storyDate(story)}</span>
              </div>
              <h2 className="mt-2 text-2xl font-semibold leading-snug">{pick(story.title, story.title_ne)}</h2>
            </div>
            <button onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-muted"><X /></button>
          </div>
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            {story.roles && <div><span className="font-medium text-foreground">{pick(story.roles.name, story.roles.name_ne)}</span>{story.organizer && <> · {story.organizer}</>}</div>}
            {!story.roles && story.organizer && <div>{story.organizer}</div>}
            {(story.city || story.country) && <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[story.city, story.country].filter(Boolean).join(", ")}</div>}
          </div>
          {(story.description || story.description_ne) && <p className="mt-4 whitespace-pre-wrap leading-relaxed">{pick(story.description, story.description_ne)}</p>}
          {media.length > 0 && (
            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {media.map((m, i) => (
                <button key={m.id} onClick={() => setLb(i)} className="relative aspect-square overflow-hidden rounded-md bg-muted">
                  {m.media_type === "image" ? <img src={m.url} alt={m.caption ?? ""} loading="lazy" className="h-full w-full object-cover" /> : <video src={m.url} muted className="h-full w-full object-cover" />}
                  {m.media_type === "video" && <span className="absolute inset-0 flex items-center justify-center text-2xl text-primary-foreground">▶</span>}
                </button>
              ))}
            </div>
          )}
          {story.facebook_post_url && (
            <a href={story.facebook_post_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">{t("map.viewFb")}<ExternalLink className="h-3.5 w-3.5" /></a>
          )}
        </div>
      </div>
      {cur && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-foreground/90" onClick={(e) => { e.stopPropagation(); setLb(null); }}>
          <button className="absolute left-3 p-3 text-primary-foreground" onClick={(e) => { e.stopPropagation(); setLb((lb! - 1 + media.length) % media.length); }}><ChevronLeft className="h-8 w-8" /></button>
          <figure className="max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            {cur.media_type === "image" ? <img src={cur.url} alt={cur.caption ?? ""} className="max-h-[82vh] max-w-[90vw] object-contain" /> : <video src={cur.url} controls autoPlay className="max-h-[82vh] max-w-[90vw]" />}
            {cur.caption && <figcaption className="mt-2 text-center text-sm text-primary-foreground/80">{cur.caption}</figcaption>}
          </figure>
          <button className="absolute right-3 p-3 text-primary-foreground" onClick={(e) => { e.stopPropagation(); setLb((lb! + 1) % media.length); }}><ChevronRight className="h-8 w-8" /></button>
        </div>
      )}
    </div>
  );
}
