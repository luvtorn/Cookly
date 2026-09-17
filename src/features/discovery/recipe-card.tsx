import { Clock3 } from "lucide-react";
import Image from "next/image";

import { PreviewNotice } from "@/components/shared/preview-notice";
import type { RecipePreview } from "@/features/discovery/demo-recipes";

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
          <PreviewNotice
            className="recipe-title-button"
            title={recipe.title}
            description={`${recipe.description} This sample recipe introduces the visual design. Full ingredients and cooking instructions will arrive with recipe details.`}
          >
            {recipe.title}
          </PreviewNotice>
        </h3>
        <p>{recipe.description}</p>
        <div className="recipe-meta">
          <span className="author">
            <span className="avatar" aria-hidden="true">
              {recipe.initials}
            </span>
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
