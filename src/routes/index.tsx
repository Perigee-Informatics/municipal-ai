import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  useEffect(() => {
    window.location.replace("/workshop/index.html");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">लोड हुँदैछ…</p>
    </div>
  );
}
