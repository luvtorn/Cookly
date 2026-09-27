import type { Metadata } from "next";
import Image from "next/image";
import { Clock3, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "My Ingredients",
  description:
    "See how Cookly will match the ingredients you have with recipes you can make.",
};

export default async function PantryPreviewPage() {
  const { t } = await getI18n();
  return (
    <main className="pantry-page home-container" id="main-content">
      <section className="pantry-hero">
        <div className="pantry-copy">
          <p className="eyebrow">{t("pantry.eyebrow")}</p>
          <h1>
            {t("pantry.titleBefore")} <em>{t("pantry.titleAccent")}</em>
          </h1>
          <p>{t("pantry.description")}</p>
        </div>
        <div className="pantry-photo glass">
          <Image
            src="/images/kitchen.webp"
            alt={t("pantry.imageAlt")}
            fill
            sizes="(max-width: 767px) 100vw, 48vw"
            priority
          />
          <div className="pantry-photo-note glass">
            <Sparkles aria-hidden="true" />
            <strong>{t("pantry.lessWaste")}</strong>
          </div>
        </div>
      </section>
      <section className="pantry-preview glass" aria-labelledby="matcher-title">
        <div className="pantry-preview-heading">
          <div>
            <p className="eyebrow">{t("pantry.preview")}</p>
            <h2 id="matcher-title">{t("pantry.coming")}</h2>
          </div>
          <span className="recipe-status">{t("pantry.inactive")}</span>
        </div>
        <div className="pantry-search-preview" aria-disabled="true">
          <Search aria-hidden="true" />
          <span>{t("pantry.addIngredient")}</span>
          <button className="button-primary" type="button" disabled>
            {t("editor.addIngredient")}
          </button>
        </div>
        <div className="pantry-filter-preview" aria-label={t("pantry.filters")}>
          <span>
            <Clock3 aria-hidden="true" /> {t("editor.cookTime")}
          </span>
          <span>
            <SlidersHorizontal aria-hidden="true" /> {t("catalog.difficulty")}
          </span>
          <span>{t("pantry.maxMissing")}</span>
        </div>
        <p className="pantry-disclaimer">{t("pantry.disclaimer")}</p>
      </section>
    </main>
  );
}
