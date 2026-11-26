import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, MapPinOff, ImageIcon, CalendarCheck, Globe, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AddEventDialog } from "@/components/admin/AddEventDialog";
import { GoogleSyncBar } from "@/components/admin/GoogleSyncBar";
import { adminStoriesQuery } from "@/lib/stories";
import { storyDate } from "@/components/story/StoryCard";
import { Pill } from "@/components/admin/AdminPage";
import { isOver, nepalNow, splitByTime } from "@/lib/when";
import { z } from "zod";

type When = "upcoming" | "completed" | "all";

export const Route = createFileRoute("/_authenticated/admin/stories/")({
  validateSearch: z.object({ when: z.enum(["upcoming", "completed", "all"]).optional() }),
  component: StoriesList,
});

function StoriesList() {
  const navigate = useNavigate();
  const { when = "all" } = Route.useSearch();
  const setWhen = (w: When) => navigate({ to: "/admin/stories", search: w === "all" ? {} : { when: w }, replace: true });
  const { data = [], isLoading } = useQuery(adminStoriesQuery);
  const now = nepalNow();
  const split = splitByTime(data, now);
  const ordered = when === "upcoming" ? split.upcoming : when === "completed" ? split.completed : [...split.upcoming, ...split.completed];
  const count: Record<When, number> = { upcoming: split.upcoming.length, completed: split.completed.length, all: data.length };
  const [q, setQ] = useState("");
  const [onlyReview, setOnlyReview] = useState(false);
  const [vis, setVis] = useState<"all" | "public" | "private">("all");
  const [adding, setAdding] = useState(false);
  const qc = useQueryClient();
  const rows = ordered.filter(
    (s) =>
      (!onlyReview || s.location_needs_review) &&
      (vis === "all" || (vis === "public") === s.is_public) &&
      `${s.title} ${s.organizer ?? ""} ${s.city ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  /** Public/private is enforced by RLS on `stories` and the story-media storage policy. */
  async function setPublic(id: string, is_public: boolean) {
    qc.setQueryData(adminStoriesQuery.queryKey, (old) => old?.map((x) => (x.id === id ? { ...x, is_public } : x)));
    const { error } = await supabase.from("stories").update({ is_public }).eq("id", id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["stories"] });
    qc.invalidateQueries({ queryKey: adminStoriesQuery.queryKey });
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
        <div><h1 className="text-2xl font-semibold md:text-3xl">All engagements</h1><p className="mt-1.5 text-sm text-muted-foreground">One list for the Events calendar and the Story Map. Public ones show on both.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setAdding(true)}><Plus />Add engagement</Button>
        </div>
      </div>
      <GoogleSyncBar />
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-border p-0.5 text-sm">
          {(["upcoming", "completed", "all"] as const).map((w) => (
            <button key={w} onClick={() => setWhen(w)} className={`rounded px-3 py-1.5 capitalize ${when === w ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{w} <span className="opacity-70">{count[w]}</span></button>
          ))}
        </div>
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <div className="inline-flex rounded-md border border-border p-0.5 text-sm">
          {(["all", "public", "private"] as const).map((v) => (
            <button key={v} onClick={() => setVis(v)} className={`rounded px-3 py-1.5 capitalize ${vis === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{v}</button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyReview} onChange={(e) => setOnlyReview(e.target.checked)} />Location needs review only</label>
        <span className="text-sm text-muted-foreground">{rows.length} of {data.length}</span>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {rows.map((s) => (
            <li key={s.id} className="flex items-center gap-2 pr-3">
              <Link to="/admin/stories/$id" params={{ id: s.id }} className="flex min-w-0 flex-1 items-center gap-4 p-3 hover:bg-muted/50">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                  {s.cover?.url && s.cover.media_type === "image" ? <img src={s.cover.url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium">{s.title}</span>
                    {isOver(s, now)
                      ? <Pill>Completed</Pill>
                      : s.event_date <= now.date ? <Pill tone="info">Today</Pill> : <Pill tone="ok">Upcoming</Pill>}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">{storyDate(s)} · {s.event_types?.name} · {s.roles?.name} · {[s.city, s.country].filter(Boolean).join(", ")}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs">
                  {s.location_needs_review && s.latitude != null && <span className="flex items-center gap-1 rounded bg-warning/25 px-2 py-0.5"><MapPinOff className="h-3 w-3" />location</span>}
                  {s.latitude == null && <span className="flex items-center gap-1 rounded bg-secondary px-2 py-0.5"><MapPinOff className="h-3 w-3" />no map pin</span>}
                  {s.source === "google" && <span className="rounded bg-accent/20 px-2 py-0.5">from Google</span>}
                  {s.source === "request" && <span className="rounded bg-accent/20 px-2 py-0.5">from request</span>}
                  {s.google_event_id && <CalendarCheck className="h-3.5 w-3.5 text-success" aria-label="In Google Calendar" />}
                  <span className="text-muted-foreground">{s.media.length} media</span>
                </div>
              </Link>
              <label className={`flex w-24 shrink-0 cursor-pointer items-center justify-end gap-2 text-xs font-medium ${s.is_public ? "text-success" : "text-muted-foreground"}`} title="Public engagements appear on Events, the Story Map and the Portfolio Dashboard">
                {s.is_public ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                {s.is_public ? "Public" : "Private"}
                <Switch checked={s.is_public} onCheckedChange={(v) => setPublic(s.id, v)} aria-label={`Make ${s.title} ${s.is_public ? "private" : "public"}`} />
              </label>
            </li>
          ))}
        </ul>
      )}
      <AddEventDialog open={adding} onOpenChange={setAdding} onCreated={(id) => navigate({ to: "/admin/stories/$id", params: { id } })} />
    </div>
  );
}
