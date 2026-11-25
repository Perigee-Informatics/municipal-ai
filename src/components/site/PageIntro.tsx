/** Shared page heading: eyebrow, title, subtitle and an optional action on the right. */
export function PageIntro({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="border-b border-border bg-secondary/40">
      <div className="container-page flex flex-wrap items-end justify-between gap-6 py-12 md:py-16">
        <div className="max-w-2xl">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="mt-3 text-4xl font-semibold text-balance md:text-5xl">{title}</h1>
          {subtitle && <p className="mt-3 text-lg text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
