import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, GraduationCap, Images, Inbox, LayoutDashboard, ListChecks, LogOut, UserRound, ExternalLink, MapPinned, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Dr. Bhoj Raj Ghimire" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/requests", label: "Requests", icon: Inbox },
  { to: "/admin/calendar", label: "My Calendar & schedule", icon: CalendarDays },
  { to: "/admin/catalog", label: "Event types & roles", icon: ListChecks },
  { to: "/admin/stories", label: "Engagements", icon: MapPinned },
  { to: "/admin/portfolio", label: "Portfolio content", icon: UserRound },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

function AdminLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
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

  if (isLoading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  if (!isAdmin)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">Not authorized</h1>
        <p className="text-muted-foreground">This account ({user.email}) does not have administrator access.</p>
        <Button variant="outline" onClick={signOut}>Sign out</Button>
      </div>
    );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0">
        <div className="p-5">
          <div className="font-display text-lg font-semibold">Dr. Ghimire</div>
          <div className="text-xs opacity-60">Admin portal</div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n }} className="flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent data-[status=active]:bg-sidebar-primary data-[status=active]:text-sidebar-primary-foreground">
              <n.icon className="h-4 w-4" />{n.label}
            </Link>
          ))}
          {/* AI for ALL: trainings, participants, assessments and training photos are run from the workshop console */}
          <div className="mt-3 hidden px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider opacity-50 md:block">AI for ALL</div>
          <a href="/workshop/admin.html#overview" className="flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent">
            <GraduationCap className="h-4 w-4" />Trainings console
          </a>
          <Link to="/gallery" className="flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent">
            <Images className="h-4 w-4" />Public gallery
          </Link>
        </nav>
        <div className="hidden space-y-1 px-3 md:absolute md:bottom-4 md:block md:w-64">
          <Link to="/" className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm opacity-75 hover:bg-sidebar-accent"><ExternalLink className="h-4 w-4" />View site</Link>
          <button onClick={signOut} className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm opacity-75 hover:bg-sidebar-accent"><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-5 md:p-10">
        <Outlet />
        <button onClick={signOut} className="mt-10 text-sm text-muted-foreground md:hidden">Sign out</button>
      </main>
    </div>
  );
}
