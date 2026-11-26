import { Empty } from "@/components/admin/AdminPage";
import { FEEDBACK_QS, type Feedback } from "@/lib/training-data";

const SCALE = ["Poor", "Needs work", "OK", "Good", "Very good"];
const TONE = ["bg-destructive/70", "bg-warning/80", "bg-muted-foreground/40", "bg-success/60", "bg-success"];

/** Ratings per question (share of each score), recommendation rate and written comments. */
export function FeedbackSummary({ rows, course }: { rows: Feedback[]; course: string }) {
  if (!rows.length) return <Empty>No feedback yet.</Empty>;
  const qs = FEEDBACK_QS[course] ?? FEEDBACK_QS["employee"] ?? [];
  const rec = rows.filter((r) => r.recommend).length;
  const comments = rows.filter((r) => r.best_session || r.improve || r.first_ai_use);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-6 text-sm">
        <div>
          <span className="font-display text-3xl font-semibold">{rows.length}</span> <span className="text-muted-foreground">responses</span>
        </div>
        <div>
          <span className="font-display text-3xl font-semibold text-success">{Math.round((rec / rows.length) * 100)}%</span>{" "}
          <span className="text-muted-foreground">would recommend it ({rec})</span>
        </div>
      </div>

      <div className="space-y-3">
        {qs.map((q, i) => {
          const vals = rows.map((r) => r.ratings?.[i]).filter((v): v is number => typeof v === "number" && v >= 1 && v <= 5);
          const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
          const counts = [1, 2, 3, 4, 5].map((s) => vals.filter((v) => v === s).length);
          return (
            <div key={i} className="grid gap-1.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_3.5rem] md:items-center md:gap-4">
              <div className="text-sm">{q}</div>
              <div className="flex h-5 overflow-hidden rounded-md bg-muted" role="img" aria-label={`Average ${avg.toFixed(1)} of 5`}>
                {counts.map((c, s) =>
                  c ? (
                    <div
                      key={s}
                      className={`${TONE[s]} h-full`}
                      style={{ width: `${(c / vals.length) * 100}%` }}
                      title={`${SCALE[s]}: ${c}`}
                    />
                  ) : null,
                )}
              </div>
              <div className="text-right text-sm font-semibold tabular-nums">{vals.length ? avg.toFixed(1) : "–"}/5</div>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-muted-foreground">
          {SCALE.map((s, i) => (
            <span key={s} className="inline-flex items-center gap-1">
              <span className={`h-2.5 w-2.5 rounded-sm ${TONE[i]}`} />
              {s}
            </span>
          ))}
        </div>
      </div>

      {comments.length > 0 && (
        <details className="rounded-lg border border-border p-4">
          <summary className="cursor-pointer text-sm font-semibold">Written comments ({comments.length})</summary>
          <ul className="mt-3 space-y-3 text-sm">
            {comments.map((r) => (
              <li key={r.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
                {r.best_session && (
                  <p>
                    <span className="font-medium">Most useful:</span> {r.best_session}
                  </p>
                )}
                {r.improve && (
                  <p>
                    <span className="font-medium">Improve:</span> {r.improve}
                  </p>
                )}
                {r.first_ai_use && (
                  <p>
                    <span className="font-medium">First AI use:</span> {r.first_ai_use}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{r.event_code}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
