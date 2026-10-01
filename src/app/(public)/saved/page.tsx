import Link from "next/link";
import { Bookmark, Heart } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { requireUser } from "@/lib/auth/session";
import { listSaved } from "@/features/social/repository";
import { savedQuery, savedUrl } from "@/features/social/schema";
import { SocialScope } from "@/features/social/social-scope";
import { RecipeCard } from "@/features/discovery/recipe-card";

export const dynamic = "force-dynamic";
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { t } = await getI18n();
  const { view } = savedQuery.parse(await searchParams);
  return {
    title: t(view === "liked" ? "social.liked" : "social.saved"),
    robots: { index: false, follow: false },
  };
}
export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, t } = await getI18n();
  const query = savedQuery.parse(await searchParams);
  const liked = query.view === "liked";
  const href = (path: string) => localizePath(locale, path);
  const current = savedUrl(query);
  const user = await requireUser(href(current));
  const result = await listSaved(user.id, query).catch(() => null);
  return (
    <SocialScope recipes={result?.recipes ?? []}>
      <main id="main-content" className="home-container catalog-page">
        <header className="catalog-heading">
          <h1>{t(liked ? "social.liked" : "social.saved")}</h1>
          <p>
            {t(liked ? "social.likedDescription" : "social.savedDescription")}
          </p>
        </header>
        <nav className="saved-tabs" aria-label={t("social.library")}>
          <Link
            href={href(savedUrl({ q: query.q, page: 1 }))}
            aria-current={!liked ? "page" : undefined}
          >
            <Bookmark size={20} aria-hidden="true" />
            {t("social.saved")}
          </Link>
          <Link
            href={href(savedUrl({ q: query.q, page: 1, view: "liked" }))}
            aria-current={liked ? "page" : undefined}
          >
            <Heart size={20} aria-hidden="true" />
            {t("social.liked")}
          </Link>
        </nav>
        <form className="saved-search glass" action={href("/saved")}>
          {liked && <input type="hidden" name="view" value="liked" />}
          <label htmlFor="saved-search">
            {t(liked ? "social.searchLiked" : "social.search")}
          </label>
          <input
            id="saved-search"
            name="q"
            type="search"
            maxLength={100}
            defaultValue={query.q}
          />
          <button className="button-primary">{t("catalog.find")}</button>
          {query.q && (
            <Link
              className="button-secondary"
              href={href(savedUrl({ q: "", page: 1, view: query.view }))}
            >
              {t("catalog.clearFilters")}
            </Link>
          )}
        </form>
        {!result ? (
          <p className="catalog-error glass" role="alert">
            {t("social.error.FAILED")}
          </p>
        ) : result.recipes.length ? (
          <div className="recipe-grid recipe-grid--enter" key={current}>
            {result.recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} returnTo={current} />
            ))}
          </div>
        ) : (
          <div className="catalog-error glass">
            <p>
              {t(
                query.q
                  ? liked
                    ? "social.noLikedResults"
                    : "social.noResults"
                  : liked
                    ? "social.emptyLiked"
                    : "social.empty",
              )}
            </p>
            <Link className="text-link" href={href("/recipes")}>
              {t("home.viewAll")}
            </Link>
          </div>
        )}
        {result && (query.page > 1 || result.hasNext) && (
          <nav className="pagination" aria-label={t("common.pages")}>
            {query.page > 1 && (
              <Link href={href(savedUrl({ ...query, page: query.page - 1 }))}>
                {t("common.previous")}
              </Link>
            )}
            <span>
              {t("common.page")} {query.page}
            </span>
            {result.hasNext && (
              <Link href={href(savedUrl({ ...query, page: query.page + 1 }))}>
                {t("common.next")}
              </Link>
            )}
          </nav>
        )}
      </main>
    </SocialScope>
  );
}
