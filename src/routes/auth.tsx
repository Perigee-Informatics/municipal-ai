import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "साइन इन · AI तालिम सन्धिखर्क" },
      {
        name: "description",
        content: "AI तालिम सन्धिखर्कमा सहभागी खाता — साइन इन वा नयाँ दर्ता",
      },
      { property: "og:title", content: "साइन इन · AI तालिम सन्धिखर्क" },
      {
        property: "og:description",
        content: "AI तालिम सन्धिखर्कमा सहभागी खाता — साइन इन वा नयाँ दर्ता",
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

const signUpSchema = signInSchema.extend({
  fullName: z
    .string()
    .trim()
    .nonempty({ message: "पूरा नाम हाल्नुहोस्" })
    .max(100, { message: "नाम १०० अक्षरभन्दा छोटो हुनुपर्छ" }),
  password: z
    .string()
    .min(8, { message: "पासवर्ड कम्तीमा ८ अक्षरको हुनुपर्छ" })
    .max(128),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    setBusy(true);
    try {
      if (mode === "in") {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "विवरण जाँच्नुहोस्");
          return;
        }
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (signInError) {
          setError("इमेल वा पासवर्ड मिलेन। फेरि प्रयास गर्नुहोस्।");
          return;
        }
        navigate({ to: "/account" });
      } else {
        const parsed = signUpSchema.safeParse({ email, password, fullName });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "विवरण जाँच्नुहोस्");
          return;
        }
        const { error: signUpError } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            data: { full_name: parsed.data.fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        setNotice(
          "दर्ता भयो। इमेलमा पठाइएको लिङ्क क्लिक गरेर खाता पुष्टि गर्नुहोस्, अनि साइन इन गर्नुहोस्।",
        );
        setMode("in");
        setPassword("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">सन्धिखर्क नगरपालिका · AI तालिम</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">सहभागी खाता</h1>
        </div>

        <div className="mt-6 flex gap-2" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "in"}
            onClick={() => {
              setMode("in");
              setError(null);
              setNotice(null);
            }}
            className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
              mode === "in"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background text-foreground hover:bg-accent"
            }`}
          >
            साइन इन
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "up"}
            onClick={() => {
              setMode("up");
              setError(null);
              setNotice(null);
            }}
            className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
              mode === "up"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background text-foreground hover:bg-accent"
            }`}
          >
            नयाँ दर्ता
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-lg border border-border bg-card p-6 shadow-sm"
        >
          {mode === "up" && (
            <div>
              <label htmlFor="fullName" className="text-sm font-medium text-foreground">
                पूरा नाम
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                maxLength={100}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
              />
            </div>
          )}
          <div className={mode === "up" ? "mt-4" : ""}>
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
              पासवर्ड{mode === "up" ? " (कम्तीमा ८ अक्षर)" : ""}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              maxLength={128}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
            />
          </div>

          {error && (
            <p className="mt-4 text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="mt-4 text-sm font-medium text-primary" role="status">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "पर्खनुहोस्…" : mode === "in" ? "साइन इन गर्नुहोस्" : "दर्ता गर्नुहोस्"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <a href="/workshop/index.html" className="underline hover:text-foreground">
            ← तालिम सामग्रीमा फर्कनुहोस्
          </a>
        </p>
      </div>
    </div>
  );
}
