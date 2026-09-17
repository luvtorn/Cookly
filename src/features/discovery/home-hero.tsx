import Link from "next/link";
import { ArrowRight, Clock3, Search } from "lucide-react";
import Image from "next/image";

import { PreviewNotice } from "@/components/shared/preview-notice";
import { featuredRecipe } from "@/features/discovery/demo-recipes";

export function HomeHero({ query }: { query: string }) {
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
            Search sample recipes
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
        <div className="search-suggestions" aria-label="Recipe suggestions">
          <Link href="/?q=pasta#recipes">Pasta</Link>
          <Link href="/?q=salmon#recipes">Salmon</Link>
          <Link href="/?category=fresh#recipes">Fresh & green</Link>
          <Link href="/?category=quick#recipes">30 mins</Link>
          <Link href="/?category=vegetarian#recipes">Vegetarian</Link>
        </div>
      </div>
      <article className="featured-hero">
        <Image
          src={featuredRecipe.image}
          alt={featuredRecipe.imageAlt}
          fill
          sizes="(max-width: 767px) 94vw, (max-width: 1023px) 54vw, 690px"
          preload
          className="hero-food"
        />
        <div className="featured-caption glass">
          <p className="eyebrow">Featured recipe · Preview</p>
          <h2>
            <PreviewNotice
              className="recipe-title-button"
              title={featuredRecipe.title}
              description="A bright bowl of inspiration from our sample collection. Full recipes, ingredients and instructions are coming in the recipe-details milestone."
            >
              Creamy Lemon <br />
              Herb Pasta
            </PreviewNotice>
          </h2>
          <p className="featured-description">{featuredRecipe.description}</p>
          <div className="featured-author">
            <span className="avatar" aria-hidden="true">
              EC
            </span>
            <div>
              <span>by {featuredRecipe.author}</span>
              <small>Something fresh for your table</small>
            </div>
          </div>
        </div>
        <span className="featured-time glass">
          <Clock3 size={16} aria-hidden="true" />
          20 min
        </span>
      </article>
    </section>
  );
}
