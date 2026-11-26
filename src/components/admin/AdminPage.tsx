import { useI18n } from "@/lib/i18n";
import { tr } from "@/lib/admin-i18n";
import type { ReactNode } from "react";

/**
 * The frame of every admin screen: title, one line of explanation, actions on the right, then
 * the content. Keeps headings, spacing and widths identical across the whole admin.
 */
export function AdminPage({
  title,
  description,
  actions,
  children,
  wide = false,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const { lang } = useI18n();
  return (
    <div className={`mx-auto w-full space-y-6 ${wide ? "max-w-[1400px]" : "max-w-6xl"}`}>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold md:text-3xl">{tr(lang, title)}</h1>
          {description && <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{tr(lang, description)}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

/** A titled card: the one container style used for every block of an admin screen. */
export function Panel({
  title,
  description,
  actions,
  children,
  className = "",
  bodyClassName = "p-5",
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const { lang } = useI18n();
  return (
    <section className={`rounded-xl border border-border bg-card shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="font-semibold">{tr(lang, title)}</h2>}
            {description && <p className="text-xs text-muted-foreground">{tr(lang, description)}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** A number tile for the top of overview screens. */
export function Stat({ label, value, hint, tone }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: "warn" | "ok" | undefined }) {
  const { lang } = useI18n();
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="text-xs font-medium text-muted-foreground">{tr(lang, label)}</div>
      <div
        className={`mt-1 font-display text-3xl font-semibold ${tone === "warn" ? "text-accent" : tone === "ok" ? "text-success" : ""}`}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{tr(lang, hint)}</div>}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "ok" | "warn" | "info" | "bad" }) {
  const { lang } = useI18n();
  const cls = {
    neutral: "border-border bg-muted text-muted-foreground",
    ok: "border-success/30 bg-success/15 text-success",
    warn: "border-warning/40 bg-warning/25 text-foreground",
    info: "border-primary/20 bg-primary/10 text-primary",
    bad: "border-destructive/30 bg-destructive/10 text-destructive",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{tr(lang, children)}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  return <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{tr(lang, children)}</p>;
}

/** Consistent form field: label above, control below, optional hint. */
export function Field({ label, hint, children, className = "" }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  const { lang } = useI18n();
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{tr(lang, label)}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
