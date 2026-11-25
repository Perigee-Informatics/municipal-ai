import { createFileRoute } from "@tanstack/react-router";
import { TableEditor, type FieldDef } from "@/components/admin/TableEditor";

export const Route = createFileRoute("/_authenticated/admin/catalog")({ component: Catalog });

const fields: FieldDef[] = [
  { key: "name", label: "Name (English)", required: true },
  { key: "name_ne", label: "Name (नेपाली)" },
  { key: "active", label: "Active", type: "bool" },
];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const show = (r: any) => (
  <span className={r.active ? "" : "text-muted-foreground line-through"}>
    {String(r.name)} {r.name_ne ? <span className="text-muted-foreground">· {String(r.name_ne)}</span> : null}
  </span>
);

function Catalog() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Event types & roles</h1>
      <p className="text-sm text-muted-foreground">Inactive items are hidden from the public request form but kept on existing requests.</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <TableEditor table="event_types" title="Event types" fields={fields} display={show} />
        <TableEditor table="roles" title="Roles" fields={fields} display={show} />
      </div>
    </div>
  );
}
