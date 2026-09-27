import Link from "next/link";
import { Leaf } from "lucide-react";

import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { getI18n } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";

export default async function NotFound() {
  const { locale, t } = await getI18n();
  return (
    <div className="public-shell">
      <SiteHeader />
      <main id="main-content" className="status-shell glass">
        <Leaf className="status-icon" size={36} aria-hidden="true" />
        <p className="eyebrow">404 · {t("error.offMenu")}</p>
        <h1>{t("error.notFoundTitle")}</h1>
        <p>{t("error.notFoundDescription")}</p>
        <Link href={localizePath(locale, "/")} className="button-primary">
          {t("common.backHome")} <span aria-hidden="true">→</span>
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
