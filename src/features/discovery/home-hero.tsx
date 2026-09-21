import { ArrowRight, Search, Utensils } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { RecipePreview } from "./recipe-preview";

export function HomeHero({
  query,
  featured,
}: {
  query: string;
  featured?: RecipePreview;
}) {
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="hero-copy">
        <h1 id="home-title">
          Cook better, <br />
          <em>together.</em>
        </h1>
        <p className="hero-description">
          Discover real recipes from real people.
          <br className="desktop-break" /> Simple food, a kinder, tastier world.
        </p>
        <form className="recipe-search glass" action="/#recipes" role="search">
          <Search size={21} aria-hidden="true" />
          <label htmlFor="recipe-search" className="sr-only">
            Search recipes
          </label>
          <input
            id="recipe-search"
            type="search"
            name="q"
            maxLength={100}
            defaultValue={query}
            placeholder="What would you like to cook?"
          />
          <button
            className="search-submit"
            type="submit"
            aria-label="Search recipes"
          >
            <ArrowRight size={21} aria-hidden="true" />
          </button>
        </form>
      </div>
      {featured ? (
        <Link
          href={`/recipes/${featured.slug}`}
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
            <p className="eyebrow">On the table · {featured.author}</p>
            <h2>{featured.title}</h2>
            <span>{featured.minutes} min · Discover the recipe →</span>
          </div>
        </Link>
      ) : (
        <div className="featured-hero hero-empty glass">
          <Utensils size={36} strokeWidth={1.3} aria-hidden="true" />
          <p className="eyebrow">Made to be shared</p>
          <h2>Good food starts with a story.</h2>
          <p>Community recipes and their photos will find a home here.</p>
        </div>
      )}
    </section>
  );
}
