import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { brandLine, useEventBrand } from "@/hooks/use-event-brand";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "साइन इन · AI for ALL" },
      {
        name: "description",
        content: "AI तालिमका सहभागी खाता — साइन इन वा नयाँ दर्ता",
      },
      { property: "og:title", content: "साइन इन · AI for ALL" },
      {
        property: "og:description",
        content: "AI तालिमका सहभागी खाता — साइन इन वा नयाँ दर्ता",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email({ message: "मान्य इमेल ठेगाना हाल्नुहोस्" }).max(255),
  password: z.string().min(1, { message: "पासवर्ड हाल्नुहोस्" }).max(128),
});

/* The one and only sign-up form of the site: re-typed password, gender, age group, education and
 * office, which the trainer's approvals and reports rely on. Every "register" link points here. */
const SIGNUP_URL = "/workshop/login.html#signup";

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const brand = useEventBrand("साइन इन · AI for ALL");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const parsed = signInSchema.safeParse({ email, password });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "विवरण जाँच्नुहोस्");
        return;
      }
      const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (signInError) {
        setError("इमेल वा पासवर्ड मिलेन। फेरि प्रयास गर्नुहोस्।");
        return;
      }
      // Dr. Ghimire (admin of the personal portal) goes to the admin area; participants to their account.
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: signedIn.user.id,
        _role: "admin",
      });
      navigate({ to: isAdmin ? "/admin" : "/account" });
    } finally {
      setBusy(false);
    }
  }

  const tab =
    "flex-1 rounded-md border px-4 py-2 text-center text-sm font-medium transition-colors";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{brandLine(brand)}</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">सहभागी खाता</h1>
        </div>

        <div className="mt-6 flex gap-2">
          <span
            className={`${tab} border-primary bg-primary text-primary-foreground`}
            aria-current="page"
          >
            साइन इन
          </span>
          <a
            href={SIGNUP_URL}
            className={`${tab} border-input bg-background text-foreground hover:bg-accent`}
          >
            नयाँ दर्ता
          </a>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-lg border border-border bg-card p-6 shadow-sm"
        >
          <div>
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              इमेल
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              maxLength={255}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
            />
          </div>
          <div className="mt-4">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              पासवर्ड
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              maxLength={128}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
            />
          </div>

          {error && (
            <p className="mt-4 text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "पर्खनुहोस्…" : "साइन इन गर्नुहोस्"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          खाता छैन?{" "}
          <a href={SIGNUP_URL} className="font-medium underline hover:text-foreground">
            नयाँ दर्ता गर्नुहोस्
          </a>
          {" · "}
          <a href="/workshop/index.html" className="underline hover:text-foreground">
            ⌂ गृहपृष्ठ (तालिम सामग्री)
          </a>
        </p>
      </div>
    </div>
  );
}
