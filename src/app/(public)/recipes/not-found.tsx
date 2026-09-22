import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
export default async function RecipeNotFound() {
  const { locale, t } = await getI18n();
  return (
    <main id="main-content" className="status-shell glass">
      <p className="eyebrow">404 · Off the menu</p>
      <h1>{t("recipe.notFound")}</h1>
      <p>{t("recipe.notFoundDescription")}</p>
      <Link href={localizePath(locale, "/recipes")} className="button-primary">
        {t("home.viewAll")} →
      </Link>
    </main>
  );
}
