import Image from "next/image";
import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";

export async function MyRecipeList({
  recipes,
}: {
  recipes: {
    id: string;
    slug: string;
    title: string;
    status: string;
    coverImageUrl: string;
    updatedAt: Date;
  }[];
}) {
  const { locale, t } = await getI18n();
  if (!recipes.length)
    return (
      <div className="creator-empty">
        <h2>{t("myRecipes.first")}</h2>
        <p>{t("myRecipes.firstDescription")}</p>
        <Link
          className="button-primary"
          href={localizePath(locale, "/recipes/new")}
        >
          {t("nav.createRecipe")} →
        </Link>
      </div>
    );
  return (
    <ul className="creator-recipe-list">
      {recipes.map((recipe) => (
        <li key={recipe.id}>
          <Image src={recipe.coverImageUrl} alt="" width={120} height={84} />
          <div>
            <h2>{recipe.title}</h2>
            <p>Updated {recipe.updatedAt.toISOString().slice(0, 10)}</p>
          </div>
          <span
            className={`recipe-status status-${recipe.status.toLowerCase()}`}
          >
            {t(
              `status.${recipe.status.toLowerCase()}` as
                "status.draft" | "status.published" | "status.archived",
            )}
          </span>
          {recipe.status === "PUBLISHED" ? (
            <Link
              className="text-link"
              href={localizePath(locale, `/recipes/${recipe.slug}`)}
            >
              View
            </Link>
          ) : null}
          <Link
            className="button-secondary"
            href={localizePath(locale, `/my-recipes/${recipe.id}/edit`)}
          >
            Edit <span className="sr-only">{recipe.title}</span>→
          </Link>
        </li>
      ))}
    </ul>
  );
}
