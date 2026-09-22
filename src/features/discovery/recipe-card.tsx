import { Clock3 } from "lucide-react";
import Image from "next/image";

import Link from "next/link";
import type { RecipePreview } from "@/features/discovery/recipe-preview";
import { VerifiedIcon } from "@/features/recipes/verified-badge";
import { getI18n } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";

export async function RecipeCard({
  recipe,
  returnTo,
}: {
  recipe: RecipePreview;
  returnTo?: string;
}) {
  const { locale, t } = await getI18n();
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
        <h3 className="recipe-title-row">
          <Link
            href={localizePath(
              locale,
              `/recipes/${recipe.slug}${returnTo ? `?from=${encodeURIComponent(localizePath(locale, returnTo))}` : ""}`,
            )}
            className="recipe-title-button"
          >
            {recipe.title}
          </Link>
          {recipe.isVerified ? <VerifiedIcon /> : null}
        </h3>
        <p>{recipe.description}</p>
        <div className="recipe-meta">
          {recipe.authorUsername ? (
            <Link
              className="author author-link"
              href={localizePath(locale, `/u/${recipe.authorUsername}`)}
            >
              {recipe.authorAvatar ? (
                <span className="avatar avatar-image">
                  <Image
                    src={recipe.authorAvatar}
                    alt=""
                    width={30}
                    height={30}
                  />
                </span>
              ) : (
                <span className="avatar" aria-hidden="true">
                  {recipe.initials}
                </span>
              )}
              {recipe.author}
            </Link>
          ) : (
            <span className="author">{recipe.author}</span>
          )}
          <span className="recipe-time">
            <Clock3 size={15} aria-hidden="true" />
            {recipe.minutes} {t("common.minutes")}
          </span>
        </div>
      </div>
    </article>
  );
}
