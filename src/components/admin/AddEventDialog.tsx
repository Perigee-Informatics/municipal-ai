import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useEffect, useState } from "react";
import { Globe, Lock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { OrganizerInput, rememberOrganizer } from "@/components/admin/OrganizerInput";
import { pushEngagement } from "@/lib/admin.functions";
import { formatBs } from "@/lib/nepali-date";
import { supabase } from "@/integrations/supabase/client";
import { lookupsQuery } from "@/lib/queries";

const LocationPicker = lazy(() => import("@/components/admin/LocationPicker"));

const sel = "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring";
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

export const engagementSchema = z
  .object({
    title: z.string().trim().min(2, "Add a title").max(200),
    organizer: z.string().trim().max(200).nullable(),
    event_type_id: z.string().uuid().nullable(),
    role_id: z.string().uuid().nullable(),
    description: z.string().max(3000).nullable(),
    event_date: day,
    end_date: day.nullable(),
    start_time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    end_time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    venue_mode: z.enum(["in_person", "online", "hybrid"]),
    venue_name: z.string().max(200).nullable(),
    city: z.string().max(100).nullable(),
    country: z.string().max(100).nullable(),
    online_link: z.string().max(500).nullable(),
    is_public: z.boolean(),
    private_notes: z.string().max(3000).nullable(),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
  })
  .refine((x) => !x.end_date || x.end_date >= x.event_date, { message: "End date is before the start date", path: ["end_date"] })
  .refine((x) => !x.start_time || !x.end_time || (x.end_date && x.end_date > x.event_date) || x.end_time > x.start_time, { message: "End time must be after start time", path: ["end_time"] });

/**
 * Quick form to add an engagement from the calendar (the + on a date or the Add button).
 * It is the same record as a Story Map entry: add photos and a map pin later in its editor.
 */
export function AddEventDialog({ open, onOpenChange, date, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; date?: string | undefined; onCreated?: (id: string) => void }) {
  const qc = useQueryClient();
  const push = useServerFn(pushEngagement);
  const { data: lookups } = useQuery(lookupsQuery);
  const [busy, setBusy] = useState(false);
  const [isPublic, setPublic] = useState(false);
  const [allDay, setAllDay] = useState(false);
  const [mode, setMode] = useState<"in_person" | "online" | "hybrid">("in_person");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPublic(false);
    setAllDay(false);
    setMode("in_person");
    setFrom(date ?? "");
    setTo("");
    setPin(null);
    setShowMap(false);
  }, [open, date]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) ?? "").trim() || null;
    const parsed = engagementSchema.safeParse({
      title: g("title") ?? "", organizer: g("organizer"), event_type_id: g("event_type_id"), role_id: g("role_id"),
      description: g("description"), event_date: from, end_date: to && to !== from ? to : null,
      start_time: allDay ? null : g("start_time"), end_time: allDay ? null : g("end_time"),
      venue_mode: mode, venue_name: mode === "online" ? null : g("venue_name"), city: mode === "online" ? null : g("city"),
      country: mode === "online" ? null : g("country"), online_link: mode === "in_person" ? null : g("online_link"),
      is_public: isPublic, private_notes: g("private_notes"),
      latitude: pin?.lat ?? null, longitude: pin?.lng ?? null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    try {
      const { data: row, error } = await supabase
        .from("stories")
        .insert({ ...parsed.data, location_needs_review: mode !== "online" && !pin, source: "site" })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      const r = await push({ data: { id: row.id } }).catch(() => ({ synced: false as boolean | null }));
      void rememberOrganizer(parsed.data.organizer);
      toast.success(`Engagement added${isPublic ? " · public" : " · private"}${r.synced ? " · in Google Calendar" : ""}`);
      qc.invalidateQueries({ queryKey: ["admin", "stories"] });
      qc.invalidateQueries({ queryKey: ["stories"] });
      qc.invalidateQueries({ queryKey: ["public-events"] });
      onOpenChange(false);
      onCreated?.(row.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the engagement");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add engagement</DialogTitle>
          <DialogDescription>Goes on your calendar, the Story Map list and Google Calendar (when connected). No email is sent.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Visibility">
            {([
              [false, Lock, "Private", "Only you see it. It still blocks your calendar."],
              [true, Globe, "Public", "Shown on Events, the home page and the Story Map."],
            ] as const).map(([v, Icon, title, hint]) => (
              <button
                key={title}
                type="button"
                role="radio"
                aria-checked={isPublic === v}
                onClick={() => setPublic(v)}
                className={`flex gap-3 rounded-xl border p-3 text-left transition-colors ${isPublic === v ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-secondary/60"}`}
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isPublic === v ? "text-primary" : "text-muted-foreground"}`} />
                <span><span className="block text-sm font-medium">{title}</span><span className="block text-xs text-muted-foreground">{hint}</span></span>
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ae-title">Title *</Label><Input id="ae-title" name="title" required maxLength={200} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ae-org">Organizer</Label><OrganizerInput id="ae-org" name="organizer" maxLength={200} /></div>
            <div className="space-y-1.5">
              <Label htmlFor="ae-type">Event type</Label>
              <select id="ae-type" name="event_type_id" className={sel} defaultValue="">
                <option value="">—</option>
                {lookups?.types.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ae-role">My role</Label>
              <select id="ae-role" name="role_id" className={sel} defaultValue="">
                <option value="">—</option>
                {lookups?.roles.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label>Date and time *</Label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={allDay} onCheckedChange={setAllDay} />All day</label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="ae-from" className="text-xs text-muted-foreground">From</Label>
                <Input id="ae-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
                {from && <div className="mt-0.5 text-[11px] text-muted-foreground">{formatBs(from, false)} BS</div>}
              </div>
              <div>
                <Label htmlFor="ae-to" className="text-xs text-muted-foreground">To (for several days)</Label>
                <Input id="ae-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
                {to && <div className="mt-0.5 text-[11px] text-muted-foreground">{formatBs(to, false)} BS</div>}
              </div>
              {!allDay && (
                <>
                  <div><Label htmlFor="ae-st" className="text-xs text-muted-foreground">Starts</Label><Input id="ae-st" name="start_time" type="time" defaultValue="10:00" /></div>
                  <div><Label htmlFor="ae-et" className="text-xs text-muted-foreground">Ends</Label><Input id="ae-et" name="end_time" type="time" defaultValue="12:00" /></div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(["in_person", "online", "hybrid"] as const).map((m) => (
                <button type="button" key={m} onClick={() => setMode(m)} className={`rounded-md border px-3 py-1.5 text-sm ${mode === m ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
                  {m === "in_person" ? "In person" : m === "online" ? "Online" : "Hybrid"}
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {mode !== "online" && (
                <>
                  <Input name="venue_name" placeholder="Venue" aria-label="Venue" />
                  <Input name="city" placeholder="City" aria-label="City" />
                  <Input name="country" placeholder="Country" defaultValue="Nepal" aria-label="Country" />
                </>
              )}
              {mode !== "in_person" && <Input name="online_link" placeholder="Online link (kept private)" aria-label="Online link" className="sm:col-span-3" />}
            </div>
            {mode !== "online" && (
              <div className="space-y-2">
                <button type="button" onClick={() => setShowMap((v) => !v)} className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                  <MapPin className="h-4 w-4" />
                  {pin ? `Pin set: ${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)} — ${showMap ? "hide" : "change"} the map` : showMap ? "Hide the map" : "Place it on the Story Map"}
                </button>
                {showMap && (
                  <>
                    <p className="text-xs text-muted-foreground">Click the map or drag the pin. Without a pin it is saved as "location needs review" and does not appear on the Story Map until you set one.</p>
                    <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
                      <LocationPicker lat={pin?.lat ?? 27.7172} lng={pin?.lng ?? 85.324} onChange={(lat, lng) => setPin({ lat: +lat.toFixed(5), lng: +lng.toFixed(5) })} />
                    </Suspense>
                    {pin && <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setPin(null)}>Remove the pin</button>}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="ae-desc">Description</Label><Textarea id="ae-desc" name="description" rows={3} /></div>
            <div className="space-y-1.5"><Label htmlFor="ae-notes">Private notes</Label><Textarea id="ae-notes" name="private_notes" rows={3} /></div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Add engagement"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
