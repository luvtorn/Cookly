import Link from "next/link";
import { SearchX } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";

export async function EmptyState({
  isFiltered = false,
}: {
  isFiltered?: boolean;
}) {
  const { locale, t } = await getI18n();
  return (
    <div className="empty-state glass">
      <SearchX size={30} aria-hidden="true" />
      <h3>{t("home.noEditorial")}</h3>
      <p>{t("home.noEditorialDescription")}</p>
      {isFiltered ? (
        <Link className="text-link" href={localizePath(locale, "/#recipes")}>
          {t("catalog.clearFilters")} <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}
