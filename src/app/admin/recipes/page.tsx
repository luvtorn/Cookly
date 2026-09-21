import Link from "next/link";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { AdminRecipeList } from "@/features/recipes/admin-recipe-list";
const filters = z.object({
  q: z.string().trim().max(100).catch(""),
  status: z
    .enum(["DRAFT", "PUBLISHED", "ARCHIVED"])
    .optional()
    .catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});
export default async function AdminRecipes({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdmin("/admin/recipes");
  const { q, status, page } = filters.parse(await searchParams);
  const recipes = await getDb().recipe.findMany({
    where: {
      authorId: user.id,
      ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
      ...(status ? { status } : {}),
    },
    select: {
      id: true,
      title: true,
      status: true,
      coverImageUrl: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * 12,
    take: 13,
  });
  const pageUrl = (p: number) =>
    `/admin/recipes?${new URLSearchParams({ q, status: status ?? "", page: String(p) })}`;
  return (
    <>
      <div className="section-heading admin-page-heading">
        <div>
          <span className="eyebrow">Cookly collection</span>
          <h1>Your recipes</h1>
          <p>From a first idea to a place at the table.</p>
        </div>
        <Link className="button-primary" href="/admin/recipes/new">
          Create a recipe →
        </Link>
      </div>
      <section className="admin-panel glass">
        <form className="admin-filters" action="/admin/recipes">
          <label>
            Search recipes
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Find a recipe…"
              maxLength={100}
            />
          </label>
          <label>
            Status
            <select name="status" defaultValue={status ?? ""}>
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
          <button className="button-secondary">Filter</button>
        </form>
        <AdminRecipeList recipes={recipes.slice(0, 12)} />
        <nav className="pagination" aria-label="Recipe pages">
          {page > 1 && <Link href={pageUrl(page - 1)}>Previous</Link>}
          <span>Page {page}</span>
          {recipes.length > 12 && <Link href={pageUrl(page + 1)}>Next</Link>}
        </nav>
      </section>
    </>
  );
}
