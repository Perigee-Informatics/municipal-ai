import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { PublicShell } from "./SiteHeader";
import { useI18n, type DictKey } from "@/lib/i18n";

export function ComingSoon({ titleKey }: { titleKey: DictKey }) {
  const { t } = useI18n();
  return (
    <PublicShell>
      <div className="container-page flex flex-col items-center py-28 text-center">
        <Sparkles className="h-10 w-10 text-accent" />
        <p className="eyebrow mt-6">{t("soon.title")}</p>
        <h1 className="mt-3 text-4xl font-semibold">{t(titleKey)}</h1>
        <p className="mt-4 max-w-md text-muted-foreground">{t("soon.body")}</p>
        <Link to="/" className="mt-8 text-sm font-medium text-primary hover:underline">← {t("nav.home")}</Link>
      </div>
    </PublicShell>
  );
}
