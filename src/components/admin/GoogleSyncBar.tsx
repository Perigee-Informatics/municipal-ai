import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CalendarCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getGcalStatus, syncGoogleIfStale, syncGoogleNow } from "@/lib/admin.functions";

type Result = { added?: number; updated?: number; removed?: number; pushed?: number; waiting?: number; skipped?: boolean } | null;

export function syncSummary(r: Result) {
  if (!r || r.skipped) return "Already up to date";
  const parts = [
    r.pushed && `${r.pushed} sent to Google`,
    r.added && `${r.added} new from Google`,
    r.updated && `${r.updated} updated from Google`,
    r.removed && `${r.removed} removed in Google`,
    r.waiting && `${r.waiting} more on the next sync`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Everything matches";
}

/**
 * Google Calendar status for the admin calendar and engagement list. On open it runs a quiet
 * two-way sync if the last one is more than 2 minutes old; "Sync now" runs one straight away.
 */
export function GoogleSyncBar() {
  const qc = useQueryClient();
  const status = useServerFn(getGcalStatus);
  const stale = useServerFn(syncGoogleIfStale);
  const now = useServerFn(syncGoogleNow);
  const { data: s, refetch } = useQuery({ queryKey: ["admin", "gcal"], queryFn: () => status() });
  const [busy, setBusy] = useState(false);

  const after = () => {
    qc.invalidateQueries({ queryKey: ["admin", "stories"] });
    qc.invalidateQueries({ queryKey: ["stories"] });
    qc.invalidateQueries({ queryKey: ["public-events"] });
    refetch();
  };
  useEffect(() => {
    if (!s?.connected) return;
    stale().then((r) => { if (r && !("skipped" in r && r.skipped)) after(); }).catch(() => undefined);
  }, [s?.connected]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run() {
    setBusy(true);
    try {
      toast.success(syncSummary(await now()));
      after();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  if (!s) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border p-4 text-sm">
      {s.connected ? (
        <>
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-success" />
            <span>
              Two-way sync with Google Calendar ({s.useMain ? "main calendar" : "Engagements calendar"}{s.email ? `, ${s.email}` : ""}).
              <span className="text-muted-foreground"> {s.lastSync ? `Last synced ${formatDistanceToNow(new Date(s.lastSync), { addSuffix: true })}.` : "Not synced yet."}</span>
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={run} disabled={busy}><RefreshCw className={busy ? "animate-spin" : ""} />{busy ? "Syncing…" : "Sync now"}</Button>
        </>
      ) : (
        <>
          <span className="text-muted-foreground">Google Calendar is not connected. Connect it to sync engagements both ways.</span>
          <Button size="sm" variant="outline" asChild><Link to="/admin/settings">Open Settings</Link></Button>
        </>
      )}
    </div>
  );
}
