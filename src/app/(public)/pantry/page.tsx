import Image from "next/image";
import Link from "next/link";
import { Leaf } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { SignInLink } from "@/features/auth/sign-in-link";
import { readPantry } from "@/features/pantry/repository";
import { pantryQuerySchema, pantryUrl } from "@/features/pantry/schema";
import { PantryIngredientList } from "@/features/pantry/ingredient-list";
import { PantryFilters } from "@/features/pantry/filters";
import { RecipeCard } from "@/features/discovery/recipe-card";
import { SocialScope } from "@/features/social/social-scope";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { t } = await getI18n();
  return {
    title: t("pantryLive.title"),
    description: t("pantryLive.description"),
    robots: { index: false, follow: false },
  };
}
export default async function PantryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, t } = await getI18n();
  const query = pantryQuerySchema.parse(await searchParams);
  const user = await getCurrentUser();
  const result = user
    ? await readPantry(query).catch(() => {
        console.error("[pantry] Read failed.");
        return null;
      })
    : null;
  const href = (path: string) => localizePath(locale, path);
  return (
    <main className="pantry-page home-container" id="main-content">
      <section className="pantry-hero">
        <div className="pantry-copy">
          <p className="eyebrow">{t("pantryLive.title")}</p>
          <h1>
            {t("pantry.titleBefore")} <em>{t("pantry.titleAccent")}</em>
          </h1>
          <p>{t("pantryLive.description")}</p>
        </div>
        <div className="pantry-photo glass">
          <Image
            src="/images/kitchen.webp"
            alt={t("pantry.imageAlt")}
            fill
            sizes="(max-width: 767px) 100vw, 48vw"
            priority
          />
          <div className="pantry-photo-note glass">
            <Leaf aria-hidden="true" />
            <strong>{t("pantry.lessWaste")}</strong>
          </div>
        </div>
      </section>
      {!user ? (
        <section className="pantry-empty glass">
          <h2>{t("pantryLive.products")}</h2>
          <p>{t("pantryLive.signIn")}</p>
          <SignInLink className="button-primary" />
        </section>
      ) : !result ? (
        <section className="pantry-empty glass" role="alert">
          <p>{t("pantryLive.loadError")}</p>
          <a className="button-secondary" href={href(pantryUrl(query))}>
            {t("pantryLive.retry")}
          </a>
        </section>
      ) : (
        <>
          <PantryIngredientList items={result.items} query={query} />
          <PantryFilters query={query} cuisines={result.cuisines} />
          <section
            className="pantry-results"
            aria-labelledby="pantry-results-title"
          >
            <h2 id="pantry-results-title">{t("pantryLive.matches")}</h2>
            <p className="pantry-disclaimer">{t("pantryLive.disclaimer")}</p>
            {!result.items.length ? (
              <p className="pantry-empty glass">{t("pantryLive.empty")}</p>
            ) : !result.matches.length ? (
              <p className="pantry-empty glass">{t("pantryLive.noMatches")}</p>
            ) : (
              <SocialScope
                recipes={result.matches.map((match) => match.recipe)}
              >
                <div className="recipe-grid" key={pantryUrl(query)}>
                  {result.matches.map((match) => (
                    <div className="pantry-match" key={match.recipe.id}>
                      <RecipeCard
                        recipe={match.recipe}
                        returnTo={pantryUrl(query)}
                      />
                      <div className="pantry-match-details">
                        <div className="pantry-match-score">
                          <strong>
                            {t("pantryLive.have")
                              .replace(
                                "{matched}",
                                String(match.matched.length),
                              )
                              .replace(
                                "{required}",
                                String(match.requiredCount),
                              )}
                          </strong>
                          <span>
                            {t("pantryLive.percentage").replace(
                              "{percent}",
                              String(match.percentage),
                            )}
                          </span>
                        </div>
                        <p>
                          <strong>{t("pantryLive.missing")}: </strong>
                          {match.missing.length
                            ? match.missing.map((item) => item.name).join(", ")
                            : t("pantryLive.complete")}
                        </p>
                        <details>
                          <summary>{t("pantryLive.matched")}</summary>
                          <p>
                            {match.matched.map((item) => item.name).join(", ")}
                          </p>
                        </details>
                        {match.optional.length ? (
                          <details>
                            <summary>{t("pantryLive.optional")}</summary>
                            <p>
                              {match.optional
                                .map((item) => item.name)
                                .join(", ")}
                            </p>
                          </details>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </SocialScope>
            )}
            {result.items.length > 0 ? (
              <nav className="pagination" aria-label={t("common.pages")}>
                {query.page > 1 ? (
                  <Link
                    className="button-secondary"
                    href={href(pantryUrl({ ...query, page: query.page - 1 }))}
                  >
                    {t("common.previous")}
                  </Link>
                ) : null}
                <span>
                  {t("common.page")} {query.page}
                </span>
                {result.hasNext ? (
                  <Link
                    className="button-secondary"
                    href={href(pantryUrl({ ...query, page: query.page + 1 }))}
                  >
                    {t("common.next")}
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </section>
        </>
      )}
    </main>
  );
}
