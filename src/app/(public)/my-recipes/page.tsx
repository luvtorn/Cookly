import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { MyRecipeList } from "@/features/recipes/my-recipe-list";
import { getI18n } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: "My recipes",
  robots: { index: false, follow: false },
};
const querySchema = z.object({
  status: z
    .enum(["DRAFT", "PUBLISHED", "ARCHIVED"])
    .optional()
    .catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

export default async function MyRecipes({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, t } = await getI18n();
  const user = await requireUser(localizePath(locale, "/my-recipes"));
  if (user.role === "ADMIN") redirect("/admin/recipes");
  const { status, page } = querySchema.parse(await searchParams);
  const recipes = await getDb().recipe.findMany({
    where: {
      authorId: user.id,
      isEditorial: false,
      ...(status ? { status } : {}),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      coverImageUrl: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * 12,
    take: 13,
  });
  const pageUrl = (nextPage: number) =>
    localizePath(
      locale,
      `/my-recipes?${new URLSearchParams({ status: status ?? "", page: String(nextPage) })}`,
    );
  return (
    <main className="creator-page home-container" id="main-content">
      <header className="creator-heading">
        <div>
          <p className="eyebrow">{t("myRecipes.eyebrow")}</p>
          <h1>{t("myRecipes.title")}</h1>
          <p>{t("myRecipes.description")}</p>
        </div>
        <Link
          className="button-primary"
          href={localizePath(locale, "/recipes/new")}
        >
          {t("nav.createRecipe")} →
        </Link>
      </header>
      <section className="creator-panel glass">
        <form
          className="creator-filters"
          action={localizePath(locale, "/my-recipes")}
        >
          <label>
            Status
            <select name="status" defaultValue={status ?? ""}>
              <option value="">{t("status.all")}</option>
              <option value="DRAFT">{t("status.draft")}</option>
              <option value="PUBLISHED">{t("status.published")}</option>
              <option value="ARCHIVED">{t("status.archived")}</option>
            </select>
          </label>
          <button className="button-secondary">{t("common.filter")}</button>
        </form>
        <MyRecipeList recipes={recipes.slice(0, 12)} />
        {(page > 1 || recipes.length > 12) && (
          <nav className="pagination" aria-label="My recipe pages">
            {page > 1 ? (
              <Link href={pageUrl(page - 1)}>{t("common.previous")}</Link>
            ) : null}
            <span>Page {page}</span>
            {recipes.length > 12 ? (
              <Link href={pageUrl(page + 1)}>{t("common.next")}</Link>
            ) : null}
          </nav>
        )}
      </section>
    </main>
  );
}
