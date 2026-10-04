import Image from "next/image";
import { RecipeMotion } from "@/components/shared/recipe-motion";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Community } from "@/features/social/community";
import { SocialScope } from "@/features/social/social-scope";
import { RecipeReactions } from "@/features/social/recipe-reactions";
import { getPublicRecipe } from "@/features/recipes/repository";
import { VerifiedBadge } from "@/features/recipes/verified-badge";
import { catalogReturn } from "@/features/recipes/catalog-query";
import { getI18n } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const recipe = await getPublicRecipe((await params).slug);
  const { t } = await getI18n();
  return recipe
    ? { title: recipe.title, description: recipe.description }
    : { title: t("recipe.notFound") };
}
export default async function RecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const recipe = await getPublicRecipe((await params).slug);
  const { locale, t } = await getI18n();
  if (!recipe) notFound();
  const returnPath = catalogReturn((await searchParams).from);
  return (
    <SocialScope recipes={[recipe]}>
      <main
        id="main-content"
        className="recipe-detail home-container"
        tabIndex={-1}
      >
        <Link className="text-link" href={localizePath(locale, returnPath)}>
          ←{" "}
          {t(
            returnPath.startsWith("/saved")
              ? new URLSearchParams(returnPath.split("?")[1]).get("view") ===
                "liked"
                ? "social.liked"
                : "social.saved"
              : returnPath.startsWith("/pantry")
                ? "pantryLive.title"
                : "catalog.allRecipes",
          )}
        </Link>
        <RecipeMotion key={recipe.slug} />
        <header className="recipe-detail-heading" data-recipe-reveal>
          <span className="eyebrow recipe-byline">
            {recipe.categories[0]} ·{" "}
            {recipe.authorUsername ? (
              <Link href={localizePath(locale, `/u/${recipe.authorUsername}`)}>
                {recipe.author}
              </Link>
            ) : (
              recipe.author
            )}
          </span>
          <h1>{recipe.title}</h1>
          {recipe.isVerified && <VerifiedBadge />}
          <p>{recipe.description}</p>
          <p className="recipe-taxonomy">
            {[recipe.cuisine, ...recipe.tags].filter(Boolean).join(" · ")}
          </p>
          <dl className="recipe-facts glass">
            <div>
              <dt>{t("recipe.prep")}</dt>
              <dd>
                {recipe.prepMinutes} {t("common.minutes")}
              </dd>
            </div>
            <div>
              <dt>{t("recipe.cook")}</dt>
              <dd>
                {recipe.cookMinutes} {t("common.minutes")}
              </dd>
            </div>
            <div>
              <dt>{t("recipe.total")}</dt>
              <dd>
                {recipe.minutes} {t("common.minutes")}
              </dd>
            </div>
            <div>
              <dt>{t("recipe.serves")}</dt>
              <dd>{recipe.servings}</dd>
            </div>
            <div>
              <dt>{t("catalog.difficulty")}</dt>
              <dd>
                {t(
                  `difficulty.${recipe.difficulty.toLowerCase()}` as
                    "difficulty.easy" | "difficulty.medium" | "difficulty.hard",
                )}
              </dd>
            </div>
          </dl>
          <RecipeReactions recipeId={recipe.id} likeCount={recipe.likeCount} />
          <nav className="recipe-jump-links" aria-label={t("recipe.sections")}>
            <Link href="#ingredients" className="button-secondary">
              {t("recipe.ingredients")} ↓
            </Link>
            <Link href="#method" className="button-secondary">
              {t("recipe.method")} ↓
            </Link>
          </nav>
        </header>
        <figure data-recipe-reveal>
          <div className="recipe-cover">
            <Image
              src={recipe.image}
              alt={recipe.title}
              fill
              sizes="(max-width: 900px) 100vw, 1100px"
              priority
            />
          </div>
          {recipe.coverImageIsAi && (
            <figcaption>{t("recipe.aiImage")}</figcaption>
          )}
        </figure>
        <div className="recipe-instructions">
          <section className="glass" id="ingredients" data-recipe-reveal>
            <h2>{t("recipe.ingredients")}</h2>
            <p>
              {t("recipe.forServings")} {recipe.servings}
            </p>
            <ul>
              {recipe.ingredients.map((item) => (
                <li key={item.id}>
                  <strong>
                    {item.amount} {item.unit}
                  </strong>{" "}
                  {item.name}
                  {item.note && <small> — {item.note}</small>}
                  {item.isOptional && <small> ({t("recipe.optional")})</small>}
                </li>
              ))}
            </ul>
          </section>
          <section className="glass" id="method" data-recipe-reveal>
            <h2>{t("recipe.letsCook")}</h2>
            <ol>
              {recipe.steps.map((step) => (
                <li key={step.id}>
                  <span>{String(step.position + 1).padStart(2, "0")}</span>
                  <p>{step.instruction}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <Community recipeId={recipe.id} />
      </main>
    </SocialScope>
  );
}
