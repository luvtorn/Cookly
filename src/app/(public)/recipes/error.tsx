"use client";
import { useI18n } from "@/lib/i18n/context";
export default function RecipeError({ reset }: { reset: () => void }) {
  const { t } = useI18n();
  return (
    <main id="main-content" className="home-container catalog-error glass">
      <h1>{t("error.title")}</h1>
      <p>{t("error.description")}</p>
      <button className="button-primary" onClick={reset}>
        {t("common.tryAgain")}
      </button>
    </main>
  );
}
