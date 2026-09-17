import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { CategorySection } from "@/features/discovery/category-section";
import { getPreviewRecipes } from "@/features/discovery/demo-recipes";
import { HomeHero } from "@/features/discovery/home-hero";
import { PantryTeaser } from "@/features/discovery/pantry-teaser";
import { RecipeCard } from "@/features/discovery/recipe-card";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { recipes, q, category, isFiltered } = getPreviewRecipes(
    await searchParams,
  );
  return (
    <main className="home-container" id="main-content" tabIndex={-1}>
      <HomeHero key={q} query={q} />
      <section
        className="recipes-section"
        id="recipes"
        aria-labelledby="recipes-title"
      >
        <div className="section-heading">
          <div>
            <h2 id="recipes-title">
              {isFiltered ? "A little cooking inspiration" : "Featured recipes"}
            </h2>
            <p>
              {isFiltered
                ? `${recipes.length} sample ${recipes.length === 1 ? "recipe" : "recipes"}${q ? ` for “${q}”` : " in this category"}`
                : "A taste of our community · Sample recipes"}
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
        {recipes.length ? (
          <div className="recipe-grid">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </section>
      <CategorySection activeCategory={category} />
      <PantryTeaser />
    </main>
  );
}
