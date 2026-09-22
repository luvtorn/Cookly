import Link from "next/link";
import { Leaf } from "lucide-react";

import { localizePath } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";

export default async function LocalizedNotFound() {
  const { locale, t } = await getI18n();

  return (
    <main id="main-content" className="status-shell glass">
      <Leaf className="status-icon" size={36} aria-hidden="true" />
      <p className="eyebrow">404</p>
      <h1>{t("error.notFoundTitle")}</h1>
      <p>{t("error.notFoundDescription")}</p>
      <Link href={localizePath(locale, "/")} className="button-primary">
        {t("common.home")} <span aria-hidden="true">→</span>
      </Link>
    </main>
  );
}
