import { createFileRoute, redirect } from "@tanstack/react-router";

import { loginHref } from "@/lib/login";

export const Route = createFileRoute("/auth")({
  beforeLoad: ({ search }) => {
    throw redirect({
      href: loginHref(search as Record<string, unknown>),
      replace: true,
      reloadDocument: true,
    });
  },
});
