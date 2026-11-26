import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Images,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MailQuestion,
  MapPinned,
  Menu,
  Package,
  Presentation,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tx } from "@/lib/admin-i18n";
import { LangToggle } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { allRequestsQuery } from "@/lib/admin-data";
import { peopleQuery } from "@/lib/training-data";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Dr. Bhoj Raj Ghimire · AI for ALL" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

type Item = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
  external?: boolean;
  badge?: "requests" | "registrations";
  /** other address prefixes that belong to this item (e.g. a detail page) */
  also?: string[];
};
type Group = { id: string; label: string; items: Item[] };

/* One menu for the whole admin: personal schedule, engagements, the AI for ALL programme,
 * portfolio and master settings. Groups fold open and closed; the group of the open page is
 * always open; the choice is remembered on this device. */
const GROUPS: Group[] = [
  { id: "overview", label: "Overview", items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }] },
  {
    id: "schedule",
    label: "My schedule",
    items: [
      { to: "/admin/calendar", label: "Calendar & schedule", icon: CalendarDays },
      { to: "/admin/requests", label: "Invitations & appointments", icon: Inbox, badge: "requests" },
    ],
  },
  {
    id: "engagements",
    label: "Engagements",
    items: [
      { to: "/admin/stories", label: "All engagements", icon: MapPinned },
      { to: "/gallery", label: "Public gallery", icon: Images, external: true },
    ],
  },
  {
    id: "aiforall",
    label: "AI for ALL",
    items: [
      { to: "/admin/trainings", label: "Training events", icon: Presentation, exact: true, also: ["/admin/trainings/event/", "/admin/trainings/events"] },
      { to: "/admin/trainings/participants", label: "Participants", icon: Users, badge: "registrations" },
      { to: "/admin/trainings/results", label: "Results & feedback", icon: BarChart3 },
      { to: "/admin/trainings/materials", label: "Training materials", icon: BookOpen },
      { to: "/admin/trainings/landing", label: "Programme page", icon: UserRound },
    ],
  },
  { id: "portfolio", label: "Portfolio", items: [{ to: "/admin/portfolio", label: "Portfolio content", icon: UserRound }] },
  {
    id: "masters",
    label: "Master settings",
    items: [
      { to: "/admin/masters/packages", label: "Training packages", icon: Package },
      { to: "/admin/masters/organizers", label: "Organizers", icon: Building2 },
      { to: "/admin/masters/invitations", label: "Invitation settings", icon: MailQuestion },
      { to: "/admin/catalog", label: "Event types & roles", icon: ListChecks },
      { to: "/admin/settings", label: "Site & integrations", icon: Settings },
    ],
  },
];

const OPEN_KEY = "admin-nav-open";

function isActive(path: string, item: Item) {
  if (item.external) return false;
  if (item.also?.some((p) => path.startsWith(p))) return true;
  if (item.exact) return path === item.to || path === item.to + "/";
  return path === item.to || path.startsWith(item.to + "/");
}

function AdminLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return !!data;
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  // close the mobile menu after navigating
  useEffect(() => setMobileOpen(false), [path]);

  if (isLoading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  if (!isAdmin)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">Not authorized</h1>
        <p className="text-muted-foreground">This account ({user.email}) does not have administrator access.</p>
        <Button variant="outline" onClick={signOut}>
          <Tx>Sign out</Tx>
        </Button>
      </div>
    );

  const crumb = (() => {
    for (const g of GROUPS) for (const i of g.items) if (isActive(path, i)) return { group: g.label, page: i.label };
    return null;
  })();

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="hidden bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen md:w-[264px] md:shrink-0 md:flex-col">
        <SideNav path={path} email={user.email ?? ""} onSignOut={signOut} />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] border-0 bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Admin menu</SheetTitle>
          <div className="flex h-full flex-col">
            <SideNav path={path} email={user.email ?? ""} onSignOut={signOut} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-8">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <nav aria-label="Breadcrumb" className="min-w-0 truncate text-sm text-muted-foreground">
            <Link to="/admin" className="hover:text-foreground">
              <Tx>Admin</Tx>
            </Link>
            {crumb && crumb.group !== "Overview" && <span> › <Tx>{crumb.group}</Tx></span>}
            {crumb && <span className="text-foreground"> › <Tx>{crumb.page}</Tx></span>}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LangToggle />
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ExternalLink />
                <span className="hidden sm:inline"><Tx>View site</Tx></span>
              </Link>
            </Button>
          </div>
        </div>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SideNav({ path, email, onSignOut }: { path: string; email: string; onSignOut: () => void }) {
  const { data: requests = [] } = useQuery(allRequestsQuery);
  const { data: people = [] } = useQuery(peopleQuery);
  const badges = {
    requests: requests.filter((r) => r.status === "pending").length,
    registrations: people.filter((p) => p.status === "pending").length,
  };

  const activeGroup = useMemo(() => GROUPS.find((g) => g.items.some((i) => isActive(path, i)))?.id, [path]);
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(OPEN_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const isOpen = (id: string) => id === activeGroup || open[id] !== false;
  const toggle = (id: string) => {
    const next = { ...open, [id]: !isOpen(id) };
    setOpen(next);
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  };

  return (
    <>
      <Link to="/admin" className="flex items-center gap-3 px-5 pb-4 pt-5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-sidebar-primary font-display text-sm font-bold text-sidebar-primary-foreground">
          BG
        </span>
        <span className="leading-tight">
          <span className="block font-display text-[15px] font-semibold">Dr. Ghimire</span>
          <span className="block text-[11px] opacity-60">Admin · AI for ALL</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label="Admin">
        {GROUPS.map((g) => {
          const expanded = isOpen(g.id);
          const single = g.items.length === 1;
          if (single) return <NavItem key={g.id} item={g.items[0]!} path={path} badges={badges} />;
          return (
            <div key={g.id} className="pt-1">
              <button
                type="button"
                onClick={() => toggle(g.id)}
                aria-expanded={expanded}
                className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider opacity-60 hover:bg-sidebar-accent hover:opacity-100"
              >
                <Tx>{g.label}</Tx>
                {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              {expanded && (
                <div className="mt-0.5 space-y-0.5">
                  {g.items.map((i) => (
                    <NavItem key={i.to} item={i} path={path} badges={badges} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="space-y-0.5 border-t border-sidebar-border px-3 py-3">
        <div className="truncate px-3 pb-1 text-[11px] opacity-50" title={email}>
          {email}
        </div>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm opacity-80 hover:bg-sidebar-accent hover:opacity-100"
        >
          <LogOut className="h-4 w-4" />
          <Tx>Sign out</Tx>
        </button>
      </div>
    </>
  );
}

function NavItem({ item, path, badges }: { item: Item; path: string; badges: Record<string, number> }) {
  const active = isActive(path, item);
  const n = (item.badge ? badges[item.badge] : 0) ?? 0;
  const cls = `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
    active ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground" : "hover:bg-sidebar-accent"
  }`;
  const inner = (
    <>
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate"><Tx>{item.label}</Tx></span>
      {n > 0 && (
        <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-foreground" aria-label={`${n} waiting`}>
          {n}
        </span>
      )}
      {item.external && <ExternalLink className="h-3 w-3 opacity-50" />}
    </>
  );
  if (item.external)
    return (
      <a href={item.to} target="_blank" rel="noopener" className={cls}>
        {inner}
      </a>
    );
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link to={item.to as any} className={cls} aria-current={active ? "page" : undefined}>
      {inner}
    </Link>
  );
}
