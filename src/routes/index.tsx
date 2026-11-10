import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { frontPageTarget } from "@/lib/front-page";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  useEffect(() => {
    void frontPageTarget().then((target) => window.location.replace(target));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">लोड हुँदैछ…</p>
    </div>
  );
}
