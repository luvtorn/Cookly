import Link from "next/link";
import { SocialScope } from "@/features/social/social-scope";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { HomeHero } from "./home-hero";
import { RecipeCard } from "./recipe-card";
import { listPublicRecipes } from "@/features/recipes/repository";
import { legacyCatalogUrl } from "@/features/recipes/catalog-query";
import { getI18n } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";

export async function HomeContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, t } = await getI18n();
  const params = await searchParams;
  if (params.q || params.category || params.page)
    redirect(localizePath(locale, legacyCatalogUrl(params)));
  const [cookly, community] = await Promise.all([
    listPublicRecipes({ q: "", page: 1 }, true),
    listPublicRecipes({ q: "", page: 1 }, "community"),
  ]);
  return (
    <SocialScope recipes={[...cookly.recipes, ...community.recipes]}>
      <main className="home-container" id="main-content" tabIndex={-1}>
        <HomeHero query="" featured={cookly.recipes[0]} />
        <section
          className="recipes-section"
          id="recipes"
          aria-labelledby="recipes-title"
        >
          <div className="section-heading">
            <div>
              <h2 id="recipes-title">{t("home.fromCookly")}</h2>
              <p>{t("home.fromCooklyDescription")}</p>
            </div>
            <Link href={localizePath(locale, "/recipes")} className="text-link">
              {t("home.viewAll")} →
            </Link>
          </div>
          {cookly.unavailable ? (
            <p role="status" className="glass catalog-error">
              {t("error.description")}
            </p>
          ) : cookly.recipes.length ? (
            <div className="recipe-grid">
              {cookly.recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          ) : (
            <EmptyState isFiltered={false} />
          )}
        </section>
        <section className="recipes-section" aria-labelledby="community-title">
          <div className="section-heading">
            <div>
              <h2 id="community-title">{t("home.community")}</h2>
              <p>{t("home.communityDescription")}</p>
            </div>
            <Link
              href={localizePath(locale, "/recipes/new")}
              className="button-secondary"
            >
              {t("nav.createRecipe")} →
            </Link>
          </div>
          {community.unavailable ? (
            <p role="status" className="glass catalog-error">
              {t("error.description")}
            </p>
          ) : community.recipes.length ? (
            <div className="recipe-grid">
              {community.recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          ) : (
            <div className="community-empty glass">
              <div>
                <h3>{t("home.noCommunity")}</h3>
                <p>{t("home.noCommunityDescription")}</p>
              </div>
              <Link
                href={localizePath(locale, "/recipes/new")}
                className="button-primary"
              >
                {t("nav.createRecipe")} →
              </Link>
            </div>
          )}
        </section>
      </main>
    </SocialScope>
  );
}
