import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  verificationActions,
  decisionLabel,
} from "@/features/moderation/constants";
import { AdminRecipeList } from "@/features/recipes/admin-recipe-list";
export default async function AdminPage() {
  const user = await requireAdmin();
  const db = getDb();
  const visible = { status: "PUBLISHED" as const, isHidden: false };
  const [counts, recent, requests, decisions] = await Promise.all([
    Promise.all([
      db.recipe.count({ where: { ...visible, isEditorial: true } }),
      db.recipe.count({ where: { ...visible, isEditorial: false } }),
      db.recipeVerificationRequest.count({
        where: {
          status: "PENDING",
          recipe: {
            ...visible,
            isEditorial: false,
            verificationStatus: "PENDING",
          },
        },
      }),
      db.recipe.count({
        where: { ...visible, verificationStatus: "VERIFIED" },
      }),
    ]),
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
    db.recipeVerificationRequest.findMany({
      where: {
        status: "PENDING",
        recipe: {
          ...visible,
          isEditorial: false,
          verificationStatus: "PENDING",
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5,
      select: {
        id: true,
        createdAt: true,
        recipe: { select: { title: true } },
      },
    }),
    db.moderationAction.findMany({
      where: { action: { in: [...verificationActions] } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5,
      select: {
        id: true,
        action: true,
        previousVerificationStatus: true,
        nextVerificationStatus: true,
        createdAt: true,
        recipe: { select: { title: true, isEditorial: true } },
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
      <section
        className="admin-stats admin-stats--community"
        aria-label="Platform recipe statistics"
      >
        {[
          "Published by Cookly",
          "Community recipes",
          "Pending requests",
          "Cookly verified",
        ].map((label, index) => (
          <article className="glass" key={label}>
            <span>{label}</span>
            <strong>{counts[index]}</strong>
            <p>
              {index === 2
                ? "Awaiting editorial review"
                : "Published and visible"}
            </p>
          </article>
        ))}
      </section>
      <div className="admin-review-overview">
        <section className="admin-panel glass">
          <h2>Latest requests</h2>
          <p>Author requests and administrator-initiated reviews.</p>
          {requests.length ? (
            <ul>
              {requests.map((request) => (
                <li key={request.id}>
                  <strong>{request.recipe.title}</strong>
                  <time>{request.createdAt.toISOString().slice(0, 10)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p>No requests waiting.</p>
          )}
          <Link className="text-link" href="/admin/verification">
            Open review queue →
          </Link>
        </section>
        <section className="admin-panel glass">
          <h2>Recent decisions</h2>
          {decisions.length ? (
            <ul>
              {decisions.map((decision) => (
                <li key={decision.id}>
                  <strong>{decision.recipe?.title ?? "Removed recipe"}</strong>
                  <span>
                    {decision.recipe?.isEditorial
                      ? "Studio approval"
                      : decisionLabel(decision)}
                  </span>
                  <time>{decision.createdAt.toISOString().slice(0, 10)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p>No decisions yet.</p>
          )}
        </section>
      </div>
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
