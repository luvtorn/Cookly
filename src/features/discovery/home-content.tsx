import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { CategorySection } from "@/features/discovery/category-section";
import { discoveryQuerySchema } from "@/features/discovery/discovery-query";
import { HomeHero } from "@/features/discovery/home-hero";
import { PantryTeaser } from "@/features/discovery/pantry-teaser";
import { listPublicRecipes } from "@/features/recipes/repository";
import { RecipeCard } from "./recipe-card";

export async function HomeContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q, category, page } = discoveryQuerySchema.parse(await searchParams);
  const { recipes, hasNext, unavailable } = await listPublicRecipes(
    q,
    category,
    page,
  );
  const pageUrl = (value: number) =>
    `/?${new URLSearchParams({ ...(q ? { q } : {}), ...(category ? { category } : {}), page: String(value) })}#recipes`;
  const isFiltered = Boolean(q || category);
  return (
    <main className="home-container" id="main-content" tabIndex={-1}>
      <HomeHero key={q} query={q} featured={recipes[0]} />
      <section
        className="recipes-section"
        id="recipes"
        aria-labelledby="recipes-title"
      >
        <div className="section-heading">
          <div>
            <h2 id="recipes-title">
              {isFiltered ? "Recipe search" : "Community recipes"}
            </h2>
            <p>
              {isFiltered
                ? q
                  ? `Looking for “${q}”`
                  : "Explore this category"
                : "A place for real recipes, shared by real people"}
            </p>
          </div>
          <Link
            href={isFiltered ? "/#recipes" : "/#categories"}
            className="text-link"
          >
            {isFiltered ? "Clear filters" : "Explore more"}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {unavailable ? (
          <div className="glass catalog-error" role="status">
            <h3>The kitchen is taking a moment</h3>
            <p>Recipes could not be loaded. Please try again shortly.</p>
          </div>
        ) : recipes.length ? (
          <div className="recipe-grid">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <EmptyState isFiltered={isFiltered} />
        )}
        {(page > 1 || hasNext) && (
          <nav className="pagination" aria-label="Recipe pages">
            {page > 1 && (
              <Link className="button-secondary" href={pageUrl(page - 1)}>
                Previous
              </Link>
            )}
            <span>Page {page}</span>
            {hasNext && (
              <Link className="button-secondary" href={pageUrl(page + 1)}>
                Next
              </Link>
            )}
          </nav>
        )}
      </section>
      <CategorySection activeCategory={category} />
      <PantryTeaser />
    </main>
  );
}
