import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { AdminRecipeList } from "@/features/recipes/admin-recipe-list";
export default async function AdminPage() {
  const user = await requireAdmin();
  const db = getDb();
  const [counts, recent] = await Promise.all([
    db.recipe.groupBy({
      by: ["status"],
      where: { authorId: user.id },
      _count: { _all: true },
    }),
    db.recipe.findMany({
      where: { authorId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        coverImageUrl: true,
        updatedAt: true,
      },
    }),
  ]);
  return (
    <>
      <div className="admin-welcome">
        <div>
          <span className="eyebrow">Your editorial kitchen</span>
          <h1>Welcome back.</h1>
          <h2>
            Make something
            <br />
            <em>worth sharing.</em>
          </h2>
          <p>
            Create recipes, refine the details, and bring good food to more
            tables.
          </p>
          <Link href="/admin/recipes/new" className="button-primary">
            Create a recipe →
          </Link>
        </div>
        <div className="admin-banner">
          <Image
            src="/images/lemon-pasta.webp"
            alt=""
            fill
            sizes="(max-width: 800px) 100vw, 450px"
          />
          <span>
            Real food.
            <br />A little inspiration,
            <br />
            every day.
          </span>
        </div>
      </div>
      <section className="admin-stats" aria-label="Your recipe statistics">
        {["PUBLISHED", "DRAFT", "ARCHIVED"].map((status) => (
          <article className="glass" key={status}>
            <span>{status.toLowerCase()} recipes</span>
            <strong>
              {counts.find((c) => c.status === status)?._count._all ?? 0}
            </strong>
            <p>Your editorial collection</p>
          </article>
        ))}
      </section>
      <section className="admin-panel glass">
        <div className="section-heading">
          <div>
            <h2>Fresh from your kitchen</h2>
            <p>Your most recently updated recipes</p>
          </div>
          <Link className="text-link" href="/admin/recipes">
            View all →
          </Link>
        </div>
        <AdminRecipeList recipes={recent} />
      </section>
    </>
  );
}
