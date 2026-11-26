import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, GraduationCap, LayoutDashboard, LogIn, Mail, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { portfolioQuery } from "@/lib/queries";
import { useAdminSession } from "@/lib/use-admin-session";
import { Button } from "@/components/ui/button";

export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`inline-flex rounded-full border border-border bg-background/60 p-0.5 text-xs ${className}`} role="group" aria-label="Language">
      {(["en", "ne"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-2.5 py-1 transition-colors ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {l === "en" ? "EN" : "नेपाली"}
        </button>
      ))}
    </div>
  );
}

/** Sign in when signed out; the admin dashboard for Dr. Ghimire; "My training" for a participant. */
function AccountButton({ compact = false, onClick }: { compact?: boolean; onClick?: () => void }) {
  const { t } = useI18n();
  const { signedIn, isAdmin } = useAdminSession();
  const Icon = !signedIn ? LogIn : isAdmin ? LayoutDashboard : GraduationCap;
  const label = !signedIn ? t("nav.signin") : isAdmin ? t("nav.adminDash") : t("nav.myTraining");
  if (signedIn && !isAdmin)
    return (
      <Button asChild variant="outline" size={compact ? "icon" : "sm"} className="rounded-full" title={label}>
        <a href="/workshop/login.html" onClick={onClick} aria-label={label}>
          <Icon />{!compact && <span>{label}</span>}
        </a>
      </Button>
    );
  return (
    <Button asChild variant="outline" size={compact ? "icon" : "sm"} className="rounded-full" title={label}>
      {isAdmin ? (
        <Link to="/admin" onClick={onClick} aria-label={label}>
          <Icon />{!compact && <span>{label}</span>}
        </Link>
      ) : (
        <a href="/workshop/login.html" onClick={onClick} aria-label={label}>
          <Icon />{!compact && <span>{label}</span>}
        </a>
      )}
    </Button>
  );
}

function useNavLinks() {
  const { t } = useI18n();
  return [
    { to: "/", label: t("nav.home") },
    { to: "/about", label: t("nav.about") },
    { to: "/ai-for-all", label: t("nav.aiforall") },
    { to: "/events", label: t("nav.events") },
    { to: "/story-map", label: t("nav.storymap") },
    { to: "/gallery", label: t("nav.gallery") },
    { to: "/portfolio-dashboard", label: t("nav.dashboard") },
  ] as const;
}

export function SiteHeader() {
  const { t } = useI18n();
  const links = useNavLinks();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={`sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] ${scrolled || open ? "border-border/70 bg-background/90 shadow-soft backdrop-blur" : "border-transparent bg-background/60 backdrop-blur-sm"}`}>
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="group flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-display text-sm font-semibold text-primary-foreground transition-transform group-hover:-rotate-3">BG</span>
          <span className="leading-tight">
            <span className="block font-display text-base font-semibold text-foreground">Dr. Bhoj Raj Ghimire</span>
            <span className="hidden text-[11px] text-muted-foreground sm:block">GIS · e-Governance · Digital Transformation</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm xl:flex" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:font-medium data-[status=active]:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <LangToggle />
          <AccountButton />
          <Button asChild variant="accent" size="sm" className="rounded-full">
            <Link to="/request">{t("nav.request")}</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 xl:hidden">
          <AccountButton compact />
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} aria-label={t("nav.menu")} aria-expanded={open}>
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="animate-in fade-in slide-in-from-top-2 border-t border-border bg-background xl:hidden">
          <nav className="container-page flex flex-col gap-1 py-4 text-sm" aria-label="Mobile">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 hover:bg-secondary data-[status=active]:bg-secondary data-[status=active]:font-medium"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border px-3 pt-4">
              <LangToggle />
              <AccountButton onClick={() => setOpen(false)} />
            </div>
            <Button asChild variant="accent" className="mt-3 rounded-full">
              <Link to="/request" onClick={() => setOpen(false)}>{t("nav.request")}</Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  const links = useNavLinks();
  const { data } = useQuery(portfolioQuery);
  const p = data?.profile;
  const email = p?.email || "dr.bghimire@gmail.com";
  const socials = p
    ? ([
        ["LinkedIn", p.linkedin], ["Google Scholar", p.google_scholar], ["ResearchGate", p.researchgate], ["ORCID", p.orcid],
        ["Facebook", p.facebook], ["Instagram", p.instagram], ["Website", p.website],
      ] as const).filter(([, u]) => !!u)
    : [];

  return (
    <footer className="mt-24 bg-hero text-navy-foreground">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-display text-sm font-semibold text-accent-foreground">BG</span>
            <span className="font-display text-lg font-semibold">Dr. Bhoj Raj Ghimire</span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-navy-foreground/70">{t("footer.tagline")}</p>
          <a href={`mailto:${email}`} className="mt-5 inline-flex items-center gap-2 text-sm text-navy-foreground/85 hover:text-accent">
            <Mail className="h-4 w-4" />{email}
          </a>
        </div>
        <div>
          <p className="eyebrow">{t("footer.explore")}</p>
          <ul className="mt-4 space-y-2 text-sm">
            {links.map((l) => (
              <li key={l.to}><Link to={l.to} className="text-navy-foreground/75 hover:text-navy-foreground">{l.label}</Link></li>
            ))}
            <li><Link to="/request" className="text-navy-foreground/75 hover:text-navy-foreground">{t("nav.request")}</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">{t("footer.connect")}</p>
          <ul className="mt-4 space-y-2 text-sm">
            {socials.map(([n, u]) => (
              <li key={n}>
                <a href={u!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-navy-foreground/75 hover:text-navy-foreground">{n}<ArrowUpRight className="h-3 w-3" /></a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-foreground/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-navy-foreground/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Dr. Bhoj Raj Ghimire. {t("footer.rights")}</p>
          <a href="/workshop/login.html" className="hover:text-navy-foreground">{t("nav.signin")}</a>
        </div>
      </div>
    </footer>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">Skip to content</a>
      <SiteHeader />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
