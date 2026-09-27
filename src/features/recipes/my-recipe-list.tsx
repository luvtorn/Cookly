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
            <p>
              {t("common.updated")}{" "}
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeZone: "UTC",
              }).format(recipe.updatedAt)}
            </p>
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
              {t("common.view")}
            </Link>
          ) : null}
          <Link
            className="button-secondary"
            href={localizePath(locale, `/my-recipes/${recipe.id}/edit`)}
          >
            {t("common.edit")} <span className="sr-only">{recipe.title}</span>→
          </Link>
        </li>
      ))}
    </ul>
  );
}
