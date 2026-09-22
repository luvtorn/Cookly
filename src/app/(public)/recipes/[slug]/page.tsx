import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Heart, MessageCircle } from "lucide-react";
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
  return (
    <main
      id="main-content"
      className="recipe-detail home-container"
      tabIndex={-1}
    >
      <Link
        className="text-link"
        href={localizePath(locale, catalogReturn((await searchParams).from))}
      >
        ← {t("catalog.allRecipes")}
      </Link>
      <header className="recipe-detail-heading">
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
        <nav className="recipe-jump-links" aria-label={t("recipe.sections")}>
          <Link href="#ingredients" className="button-secondary">
            {t("recipe.ingredients")} ↓
          </Link>
          <Link href="#method" className="button-secondary">
            {t("recipe.method")} ↓
          </Link>
        </nav>
      </header>
      <figure>
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
        <section className="glass" id="ingredients">
          <h2>{t("recipe.ingredients")}</h2>
          <p>For {recipe.servings} servings</p>
          <ul>
            {recipe.ingredients.map((item) => (
              <li key={item.id}>
                <strong>
                  {item.amount} {item.unit}
                </strong>{" "}
                {item.name}
                {item.note && <small> — {item.note}</small>}
                {item.isOptional && <small> (optional)</small>}
              </li>
            ))}
          </ul>
        </section>
        <section className="glass" id="method">
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
      <section className="recipe-community glass" aria-labelledby="community">
        <header>
          <div>
            <p className="eyebrow">{t("recipe.communityEyebrow")}</p>
            <h2 id="community">{t("recipe.community")}</h2>
          </div>
          <dl className="recipe-social-counts">
            <div>
              <dt>
                <Heart aria-hidden="true" /> {t("recipe.likes")}
              </dt>
              <dd>{recipe.likeCount}</dd>
            </div>
            <div>
              <dt>
                <MessageCircle aria-hidden="true" /> {t("recipe.comments")}
              </dt>
              <dd>{recipe.commentCount}</dd>
            </div>
          </dl>
        </header>
        <div className="comment-composer-preview">
          <label htmlFor="future-comment">{t("recipe.joinConversation")}</label>
          <textarea
            id="future-comment"
            rows={3}
            disabled
            placeholder={t("recipe.commentPreview")}
          />
          <button className="button-primary" type="button" disabled>
            Add comment
          </button>
        </div>
        {recipe.comments.length ? (
          <ol className="comment-preview-list">
            {recipe.comments.map((comment) => (
              <li key={comment.id}>
                <div className="avatar" aria-hidden="true">
                  {comment.avatar ? (
                    <Image src={comment.avatar} alt="" width={34} height={34} />
                  ) : (
                    comment.author.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="comment-author">
                    {comment.username ? (
                      <Link
                        href={localizePath(locale, `/u/${comment.username}`)}
                      >
                        {comment.author}
                      </Link>
                    ) : (
                      comment.author
                    )}
                    <time dateTime={comment.createdAt.toISOString()}>
                      {comment.createdAt.toLocaleDateString(locale, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </time>
                  </p>
                  <p>{comment.body}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="comments-empty">{t("recipe.noComments")}</p>
        )}
      </section>
    </main>
  );
}
