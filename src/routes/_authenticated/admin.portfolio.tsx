import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableEditor } from "@/components/admin/TableEditor";

export const Route = createFileRoute("/_authenticated/admin/portfolio")({ component: Portfolio });

const s = (v: unknown) => (v ? String(v) : "");

function Portfolio() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Portfolio content</h1>
      <Tabs defaultValue="profile">
        <TabsList className="flex h-auto flex-wrap">
          {["profile", "highlights", "expertise", "education", "experience", "publications", "certifications"].map((t) => <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="profile"><ProfileForm /></TabsContent>
        <TabsContent value="highlights">
          <TableEditor table="highlights" title="Highlights (home stats)" fields={[{ key: "value", label: "Value", required: true }, { key: "label", label: "Label", required: true }, { key: "label_ne", label: "Label (नेपाली)" }]} display={(r) => <><b>{s(r.value)}</b> {s(r.label)}</>} />
        </TabsContent>
        <TabsContent value="expertise">
          <TableEditor table="expertise" title="Expertise" fields={[{ key: "title", label: "Title", required: true }, { key: "title_ne", label: "Title (नेपाली)" }, { key: "description", label: "Description", type: "textarea" }, { key: "description_ne", label: "Description (नेपाली)", type: "textarea" }]} display={(r) => s(r.title)} />
        </TabsContent>
        <TabsContent value="education">
          <TableEditor table="education" title="Education" fields={[{ key: "degree", label: "Degree", required: true }, { key: "degree_ne", label: "Degree (नेपाली)" }, { key: "institution", label: "Institution", required: true }, { key: "institution_ne", label: "Institution (नेपाली)" }, { key: "location", label: "Location" }, { key: "year", label: "Year" }, { key: "notes", label: "Notes" }, { key: "notes_ne", label: "Notes (नेपाली)" }]} display={(r) => <><b>{s(r.degree)}</b> · {s(r.institution)} {s(r.year)}</>} />
        </TabsContent>
        <TabsContent value="experience">
          <TableEditor table="experience" title="Experience" fields={[{ key: "title", label: "Title", required: true }, { key: "title_ne", label: "Title (नेपाली)" }, { key: "organization", label: "Organization", required: true }, { key: "organization_ne", label: "Organization (नेपाली)" }, { key: "period", label: "Period" }, { key: "category", label: "Category", type: "select", options: ["career", "consulting"] }, { key: "description", label: "Description", type: "textarea" }, { key: "description_ne", label: "Description (नेपाली)", type: "textarea" }]} display={(r) => <><b>{s(r.title)}</b> · {s(r.organization)} <span className="text-muted-foreground">{s(r.period)} [{s(r.category)}]</span></>} />
        </TabsContent>
        <TabsContent value="publications">
          <TableEditor table="publications" title="Publications" fields={[{ key: "title", label: "Title", required: true }, { key: "authors", label: "Authors" }, { key: "venue", label: "Journal / venue" }, { key: "year", label: "Year" }, { key: "url", label: "URL" }]} display={(r) => <><b>{s(r.title)}</b> <span className="text-muted-foreground">{s(r.year)}</span></>} />
        </TabsContent>
        <TabsContent value="certifications">
          <TableEditor table="certifications" title="Certifications & memberships" fields={[{ key: "name", label: "Name", required: true }, { key: "name_ne", label: "Name (नेपाली)" }, { key: "issuer", label: "Issuer / body" }, { key: "year", label: "Year" }, { key: "kind", label: "Kind", type: "select", options: ["certification", "membership"] }]} display={(r) => <><b>{s(r.name)}</b> <span className="text-muted-foreground">[{s(r.kind)}]</span></>} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Profile = Tables<"profile">;
const textFields: [keyof Profile, string, boolean?][] = [
  ["full_name", "Full name"], ["full_name_ne", "Full name (नेपाली)"], ["headline", "Headline"], ["headline_ne", "Headline (नेपाली)"],
  ["short_bio", "Short bio", true], ["short_bio_ne", "Short bio (नेपाली)", true], ["long_bio", "Long bio", true], ["long_bio_ne", "Long bio (नेपाली)", true],
  ["photo_url", "Photo URL (leave empty for default)"], ["email", "Email"], ["phone", "Phone"], ["location", "Location"],
  ["linkedin", "LinkedIn"], ["facebook", "Facebook"], ["instagram", "Instagram"], ["google_scholar", "Google Scholar"],
  ["researchgate", "ResearchGate"], ["orcid", "ORCID"], ["website", "Website"],
];

function ProfileForm() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "profile"], queryFn: async () => (await supabase.from("profile").select("*").eq("id", 1).maybeSingle()).data });
  const [form, setForm] = useState<Partial<Profile>>({});
  useEffect(() => { if (data) setForm(data); }, [data]);
  async function save() {
    const { id: _id, updated_at: _u, ...rest } = form as Profile;
    const { error } = await supabase.from("profile").upsert({ id: 1, ...rest, full_name: rest.full_name || "Dr. Bhoj Raj Ghimire" });
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["portfolio"] });
    qc.invalidateQueries({ queryKey: ["admin", "profile"] });
  }
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="grid gap-4 md:grid-cols-2">
        {textFields.map(([k, label, long]) => (
          <div key={k} className={long ? "md:col-span-1" : ""}>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
            {long ? <Textarea rows={4} value={s(form[k])} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /> : <Input value={s(form[k])} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />}
          </div>
        ))}
      </div>
      <Button className="mt-6" onClick={save}>Save profile</Button>
    </div>
  );
}
