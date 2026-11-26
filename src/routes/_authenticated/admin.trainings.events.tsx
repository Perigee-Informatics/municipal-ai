import { createFileRoute, redirect } from "@tanstack/react-router";

/* Old address of the training events list, now merged into /admin/trainings. */
export const Route = createFileRoute("/_authenticated/admin/trainings/events")({
  beforeLoad: ({ search }) => {
    const s = search as Record<string, unknown>;
    throw redirect({
      to: "/admin/trainings",
      search: { new: s["new"] ? 1 : undefined, edit: typeof s["edit"] === "string" ? s["edit"] : undefined },
      replace: true,
    });
  },
});
