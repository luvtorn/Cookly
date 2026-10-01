import Link from "next/link";
import { SocialScope } from "@/features/social/social-scope";
import { X } from "lucide-react";
import {
  catalogQuerySchema,
  catalogUrl,
} from "@/features/recipes/catalog-query";
import {
  listPublicRecipes,
  recipeOptions,
} from "@/features/recipes/repository";
import { RecipeCard } from "@/features/discovery/recipe-card";
import { RecipeSearchField } from "@/features/discovery/recipe-search-field";
import { getI18n } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { GlassSelect } from "@/components/shared/glass-select";

export const metadata = {
  title: "Recipes",
  description:
    "Find your next favourite meal. Browse recipes by category, cuisine and cooking time.",
};
export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, t } = await getI18n();
  const query = catalogQuerySchema.parse(await searchParams);
  const [result, options] = await Promise.all([
    listPublicRecipes(query),
    process.env.DATABASE_URL?.trim() ? recipeOptions().catch(() => null) : null,
  ]);
  const currentUrl = catalogUrl(query);
  const selections = [
    query.q && `Search: ${query.q}`,
    query.category &&
      `Category: ${options?.categories.find((c) => c.slug === query.category)?.name ?? query.category}`,
    query.cuisine &&
      `Cuisine: ${options?.cuisines.find((c) => c.slug === query.cuisine)?.name ?? query.cuisine}`,
    query.tag &&
      `Tag: ${options?.tags.find((t) => t.slug === query.tag)?.name ?? query.tag}`,
    query.difficulty &&
      `${t("catalog.difficulty")}: ${t(`difficulty.${query.difficulty.toLowerCase()}` as "difficulty.easy" | "difficulty.medium" | "difficulty.hard")}`,
    query.maxTime &&
      `${t("catalog.maxTime")}: ${query.maxTime} ${t("common.minutes")}`,
  ].filter(Boolean);
  return (
    <SocialScope recipes={result.recipes}>
      <main
        className="home-container catalog-page"
        id="main-content"
        tabIndex={-1}
      >
        <header className="catalog-heading">
          <p className="eyebrow">{t("catalog.eyebrow")}</p>
          <h1>{t("catalog.title")}</h1>
          <p>{t("catalog.description")}</p>
        </header>
        <form
          key={currentUrl}
          action={localizePath(locale, "/recipes")}
          className="catalog-filters glass"
          role="search"
        >
          <div className="catalog-filter-row">
            <RecipeSearchField
              id="catalog-recipe-search"
              defaultValue={query.q}
            />
            <div className="glass-select-field">
              <span>{t("catalog.category")}</span>
              <GlassSelect
                name="category"
                ariaLabel={t("catalog.category")}
                defaultValue={query.category ?? ""}
                options={[
                  { value: "", label: t("catalog.allCategories") },
                  ...(options?.categories.map((c) => ({
                    value: c.slug,
                    label: c.name,
                  })) ?? []),
                ]}
              />
            </div>
            <button className="button-primary">{t("catalog.find")}</button>
          </div>
          <details
            open={Boolean(
              query.cuisine || query.tag || query.difficulty || query.maxTime,
            )}
          >
            <summary>{t("catalog.moreFilters")}</summary>
            <div className="catalog-filter-row">
              <div className="glass-select-field">
                <span>{t("catalog.cuisine")}</span>
                <GlassSelect
                  name="cuisine"
                  ariaLabel={t("catalog.cuisine")}
                  defaultValue={query.cuisine ?? ""}
                  options={[
                    { value: "", label: t("catalog.allCuisines") },
                    ...(options?.cuisines.map((c) => ({
                      value: c.slug,
                      label: c.name,
                    })) ?? []),
                  ]}
                />
              </div>
              <div className="glass-select-field">
                <span>{t("catalog.difficulty")}</span>
                <GlassSelect
                  name="difficulty"
                  ariaLabel={t("catalog.difficulty")}
                  defaultValue={query.difficulty ?? ""}
                  options={[
                    { value: "", label: t("catalog.anyDifficulty") },
                    { value: "EASY", label: t("difficulty.easy") },
                    { value: "MEDIUM", label: t("difficulty.medium") },
                    { value: "HARD", label: t("difficulty.hard") },
                  ]}
                />
              </div>
              <label>
                {t("catalog.maxTime")}
                <input
                  name="maxTime"
                  type="number"
                  min={1}
                  max={1440}
                  defaultValue={query.maxTime}
                  placeholder={t("catalog.anyTime")}
                />
              </label>
              <div className="glass-select-field">
                <span>{t("catalog.tag")}</span>
                <GlassSelect
                  name="tag"
                  ariaLabel={t("catalog.tag")}
                  defaultValue={query.tag ?? ""}
                  options={[
                    { value: "", label: t("catalog.allTags") },
                    ...(options?.tags.map((tag) => ({
                      value: tag.slug,
                      label: tag.name,
                    })) ?? []),
                  ]}
                />
              </div>
            </div>
          </details>
        </form>
        <section className="recipes-section" aria-labelledby="catalog-results">
          <div className="section-heading">
            <h2 id="catalog-results">
              {selections.length
                ? t("catalog.results")
                : t("catalog.allRecipes")}
            </h2>
            {selections.length > 0 && (
              <Link
                href={localizePath(locale, "/recipes")}
                className="clear-filters-button"
              >
                <X size={17} aria-hidden="true" /> {t("catalog.clearFilters")} (
                {selections.length})
              </Link>
            )}
          </div>
          {selections.length > 0 && (
            <ul
              className="filter-summary"
              aria-label={t("catalog.activeFilters")}
            >
              {selections.map((s) => (
                <li key={String(s)}>{s}</li>
              ))}
            </ul>
          )}
          {result.unavailable ? (
            <p className="catalog-error glass" role="status">
              {t("error.description")}
            </p>
          ) : result.recipes.length ? (
            <div key={currentUrl} className="recipe-grid recipe-grid--enter">
              {result.recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  returnTo={currentUrl}
                />
              ))}
            </div>
          ) : (
            <div className="catalog-error glass">
              <h3>{t("catalog.noResults")}</h3>
              <p>{t("catalog.noResultsDescription")}</p>
              <Link
                href={localizePath(locale, "/recipes")}
                className="text-link"
              >
                {t("home.viewAll")} →
              </Link>
            </div>
          )}
          {(query.page > 1 || result.hasNext) && (
            <nav className="pagination" aria-label="Recipe pages">
              {query.page > 1 && (
                <Link
                  href={localizePath(
                    locale,
                    catalogUrl({ ...query, page: query.page - 1 }),
                  )}
                >
                  {t("common.previous")}
                </Link>
              )}
              <span>Page {query.page}</span>
              {result.hasNext && (
                <Link
                  href={localizePath(
                    locale,
                    catalogUrl({ ...query, page: query.page + 1 }),
                  )}
                >
                  {t("common.next")}
                </Link>
              )}
            </nav>
          )}
        </section>
      </main>
    </SocialScope>
  );
}
