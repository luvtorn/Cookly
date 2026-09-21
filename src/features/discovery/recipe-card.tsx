import { Clock3 } from "lucide-react";
import Image from "next/image";

import Link from "next/link";
import type { RecipePreview } from "@/features/discovery/recipe-preview";

export function RecipeCard({ recipe }: { recipe: RecipePreview }) {
  return (
    <article className="recipe-card glass">
      <div className="recipe-image">
        <Image
          src={recipe.image}
          alt={recipe.imageAlt}
          fill
          sizes="(max-width: 639px) calc(100vw - 48px), (max-width: 1023px) 45vw, 300px"
        />
      </div>
      <div className="recipe-card-body">
        <h3>
          <Link
            href={`/recipes/${recipe.slug}`}
            className="recipe-title-button"
          >
            {recipe.title}
          </Link>
        </h3>
        <p>{recipe.description}</p>
        <div className="recipe-meta">
          <span className="author">
            {!recipe.isEditorial && (
              <span className="avatar" aria-hidden="true">
                {recipe.initials}
              </span>
            )}
            {recipe.author}
          </span>
          <span className="recipe-time">
            <Clock3 size={15} aria-hidden="true" />
            {recipe.minutes} min
          </span>
        </div>
      </div>
    </article>
  );
}
