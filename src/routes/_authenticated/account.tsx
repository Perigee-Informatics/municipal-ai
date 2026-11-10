import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { brandLine, useEventBrand } from "@/hooks/use-event-brand";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "मेरो खाता · AI तालिम" },
      { name: "description", content: "सहभागी खाता विवरण र साइन आउट" },
      { property: "og:title", content: "मेरो खाता · AI तालिम" },
      { property: "og:description", content: "सहभागी खाता विवरण र साइन आउट" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

const profileQuery = {
  queryKey: ["my-profile"],
  queryFn: async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("not-signed-in");
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, role, status, created_at")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (error) throw error;
    return { email: userData.user.email ?? "", profile: data };
  },
};

const STATUS_LABELS: Record<string, string> = {
  pending: "स्वीकृति बाँकी",
  approved: "स्वीकृत",
  rejected: "अस्वीकृत",
};

function AccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isPending, error } = useQuery(profileQuery);
  const brand = useEventBrand("मेरो खाता · AI तालिम");

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">{brandLine(brand)}</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">मेरो खाता</h1>

        {isPending && <p className="mt-6 text-muted-foreground">लोड हुँदैछ…</p>}
        {error && (
          <p className="mt-6 text-sm font-medium text-destructive">
            खाता विवरण ल्याउन सकिएन। फेरि प्रयास गर्नुहोस्।
          </p>
        )}

        {data && (
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">नाम</dt>
              <dd className="font-medium text-foreground">
                {data.profile?.full_name ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">इमेल</dt>
              <dd className="font-medium text-foreground">{data.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">भूमिका</dt>
              <dd className="font-medium text-foreground">
                {data.profile?.role === "trainer" ? "प्रशिक्षक" : "सहभागी"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">स्थिति</dt>
              <dd className="font-medium text-foreground">
                {STATUS_LABELS[data.profile?.status ?? ""] ?? data.profile?.status ?? "—"}
              </dd>
            </div>
          </dl>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-8 w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          साइन आउट
        </button>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {data?.profile?.role === "trainer" && data.profile.status === "approved" ? (
            <a href="/workshop/admin.html" className="underline hover:text-foreground">
              ⌂ प्रशिक्षक गृहपृष्ठ
            </a>
          ) : (
            <a href="/workshop/index.html" className="underline hover:text-foreground">
              ⌂ गृहपृष्ठ (तालिम सामग्री)
            </a>
          )}
        </p>
      </div>
    </div>
  );
}
