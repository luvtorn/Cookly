import { ArrowRight, Search, Utensils } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { RecipePreview } from "./recipe-preview";
import { RecipeSearchField } from "./recipe-search-field";
import { getI18n } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";

export async function HomeHero({
  query,
  featured,
}: {
  query: string;
  featured?: RecipePreview;
}) {
  const { locale, t } = await getI18n();
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="hero-copy">
        <h1 id="home-title">{t("home.title")}</h1>
        <p className="hero-description">{t("home.description")}</p>
        <form
          className="recipe-search glass"
          action={localizePath(locale, "/recipes")}
          role="search"
        >
          <Search size={21} aria-hidden="true" />
          <RecipeSearchField
            id="recipe-search"
            defaultValue={query}
            placeholder={t("search.placeholder")}
            hideLabel
          />
          <button
            className="search-submit"
            type="submit"
            aria-label={t("search.label")}
          >
            <ArrowRight size={21} aria-hidden="true" />
          </button>
        </form>
      </div>
      {featured ? (
        <Link
          href={localizePath(locale, `/recipes/${featured.slug}`)}
          className="featured-hero hero-recipe glass"
        >
          <Image
            src={featured.image}
            alt={featured.title}
            fill
            sizes="(max-width: 767px) 90vw, 550px"
            priority
          />
          <div>
            <p className="eyebrow">
              {t("home.fromCookly")} · {featured.author}
            </p>
            <h2>{featured.title}</h2>
            <span>
              {featured.minutes} {t("common.minutes")} · {t("home.viewAll")} →
            </span>
          </div>
        </Link>
      ) : (
        <div className="featured-hero hero-empty glass">
          <Utensils size={36} strokeWidth={1.3} aria-hidden="true" />
          <p className="eyebrow">{t("home.community")}</p>
          <h2>{t("home.noEditorial")}</h2>
          <p>{t("home.noEditorialDescription")}</p>
        </div>
      )}
    </section>
  );
}
