import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { AdminRecipeList } from "@/features/recipes/admin-recipe-list";
import { GlassSelect } from "@/components/shared/glass-select";
import {
  adminCatalogQuery,
  adminCatalogWhere,
} from "@/features/moderation/catalog-query";
import { verificationLabels } from "@/features/moderation/constants";

export const metadata = {
  title: "All recipes · Cookly Studio",
  robots: { index: false, follow: false },
};
export default async function AdminRecipes({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin("/admin/recipes");
  const query = adminCatalogQuery.parse(await searchParams);
  const recipes = await getDb().recipe.findMany({
    where: adminCatalogWhere(query, user.id),
    select: {
      id: true,
      title: true,
      status: true,
      verificationStatus: true,
      isHidden: true,
      isEditorial: true,
      coverImageUrl: true,
      updatedAt: true,
      author: {
        select: { profile: { select: { displayName: true, username: true } } },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    skip: (query.page - 1) * 12,
    take: 13,
  });
  const url = (page: number) =>
    `/admin/recipes?${new URLSearchParams({ ...query, page: String(page) })}`;
  const fields = [
    {
      name: "status",
      label: "Publication",
      options: [
        ["ALL", "All publications"],
        ["PUBLISHED", "Published"],
        ["DRAFT", "Draft"],
        ["ARCHIVED", "Archived"],
      ],
    },
    {
      name: "verification",
      label: "Verification",
      options: [
        ["ALL", "All verification statuses"],
        ...Object.entries(verificationLabels),
      ],
    },
    {
      name: "origin",
      label: "Origin",
      options: [
        ["ALL", "All origins"],
        ["EDITORIAL", "Cookly editorial"],
        ["COMMUNITY", "Community"],
      ],
    },
    {
      name: "visibility",
      label: "Visibility",
      options: [
        ["ALL", "All visibility"],
        ["VISIBLE", "Visible"],
        ["HIDDEN", "Hidden"],
      ],
    },
  ] as const;
  return (
    <>
      <header className="section-heading admin-page-heading">
        <div>
          <span className="eyebrow">Cookly collection</span>
          <h1>{query.view === "studio" ? "My Studio" : "All recipes"}</h1>
          <p>Publication and editorial verification are independent.</p>
        </div>
        <Link className="button-primary" href="/admin/recipes/new">
          Create a recipe →
        </Link>
      </header>
      <nav className="verification-tabs" aria-label="Recipe collections">
        <Link
          href="/admin/recipes"
          aria-current={query.view === "all" ? "page" : undefined}
        >
          All recipes
        </Link>
        <Link
          href="/admin/recipes?view=studio&status=ALL"
          aria-current={query.view === "studio" ? "page" : undefined}
        >
          My Studio
        </Link>
      </nav>
      <section className="admin-panel glass">
        <form
          className="admin-catalog-filters"
          action="/admin/recipes"
          key={url(query.page)}
        >
          <input type="hidden" name="view" value={query.view} />
          <label>
            Search by recipe or username
            <input
              name="q"
              type="search"
              defaultValue={query.q}
              maxLength={100}
            />
          </label>
          {fields
            .filter(
              (field) => query.view !== "studio" || field.name !== "origin",
            )
            .map((field) => (
              <div className="glass-select-field" key={field.name}>
                <span>{field.label}</span>
                <GlassSelect
                  name={field.name}
                  ariaLabel={field.label}
                  defaultValue={query[field.name]}
                  options={field.options.map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </div>
            ))}
          <button className="button-secondary">Apply filters</button>
          <Link
            className="button-secondary"
            href={
              query.view === "studio"
                ? "/admin/recipes?view=studio&status=ALL"
                : "/admin/recipes"
            }
          >
            Clear filters
          </Link>
        </form>
        {query.view === "studio" ? (
          <AdminRecipeList recipes={recipes.slice(0, 12)} />
        ) : (
          <div className="admin-catalog-list">
            {recipes.slice(0, 12).map((recipe) => (
              <article className="admin-catalog-row" key={recipe.id}>
                <Image
                  src={recipe.coverImageUrl}
                  alt=""
                  width={88}
                  height={66}
                />
                <div>
                  <h2>
                    <Link
                      className="text-link"
                      href={`/admin/recipes/${recipe.id}`}
                    >
                      {recipe.title}
                    </Link>
                  </h2>
                  <p>
                    {recipe.author.profile?.displayName ?? "Cookly member"} · @
                    {recipe.author.profile?.username ?? "—"}
                  </p>
                  <p>
                    {recipe.isEditorial ? "Cookly editorial" : "Community"} ·
                    Updated {recipe.updatedAt.toISOString().slice(0, 10)}
                  </p>
                </div>
                <div className="admin-catalog-statuses">
                  <span className="recipe-status">{recipe.status}</span>
                  <span className="recipe-status">
                    {verificationLabels[recipe.verificationStatus]}
                  </span>
                  {recipe.isHidden && (
                    <span className="recipe-status">Hidden</span>
                  )}
                </div>
                <Link
                  className="button-secondary"
                  href={`/admin/recipes/${recipe.id}`}
                >
                  View<span className="sr-only"> {recipe.title}</span> →
                </Link>
              </article>
            ))}
            {!recipes.length && (
              <p className="admin-empty">No recipes match these filters.</p>
            )}
          </div>
        )}
        <nav className="pagination" aria-label="Recipe pages">
          {query.page > 1 && <Link href={url(query.page - 1)}>Previous</Link>}
          <span>Page {query.page}</span>
          {recipes.length > 12 && <Link href={url(query.page + 1)}>Next</Link>}
        </nav>
      </section>
    </>
  );
}
