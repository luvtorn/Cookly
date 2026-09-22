import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { reviewQuerySchema } from "@/features/moderation/schema";
import { ReviewForm } from "@/features/moderation/review-form";

export const metadata = {
  title: "Recipe verification",
  robots: { index: false, follow: false },
};
export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin("/admin/verification");
  const { status, page } = reviewQuerySchema.parse(await searchParams);
  const recipes = await getDb().recipe.findMany({
    where: {
      status: "PUBLISHED",
      isHidden: false,
      ...(status ? { verificationStatus: status } : {}),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      updatedAt: true,
      verificationStatus: true,
      isEditorial: true,
      author: { select: { profile: { select: { displayName: true } } } },
      moderationActions: {
        where: { action: { in: ["VERIFY_RECIPE", "REJECT_VERIFICATION"] } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 10,
        select: {
          id: true,
          action: true,
          note: true,
          createdAt: true,
          actor: { select: { profile: { select: { displayName: true } } } },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * 12,
    take: 13,
  });
  const pageUrl = (p: number) =>
    `/admin/verification?${new URLSearchParams({ ...(status ? { status } : {}), page: String(p) })}`;
  return (
    <>
      <header className="admin-page-heading">
        <p className="eyebrow">Editorial review</p>
        <h1>Recipe verification</h1>
        <p>
          Review published recipes from every author. Verification never
          controls publication.
        </p>
      </header>
      <form className="verification-filter" action="/admin/verification">
        <label>
          Verification status
          <select name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            {["NONE", "PENDING", "VERIFIED", "REJECTED"].map((s) => (
              <option key={s} value={s}>
                {s.toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <button className="button-secondary">Filter</button>
      </form>
      <div className="verification-list">
        {recipes.slice(0, 12).map((r) => (
          <article key={r.id} className="verification-item glass">
            <h2>
              <Link
                className="text-link"
                href={`/recipes/${r.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                {r.title} ↗
              </Link>
            </h2>
            <p>
              {r.isEditorial
                ? "Cookly"
                : (r.author.profile?.displayName ?? "Cookly member")}{" "}
              · {r.verificationStatus.toLowerCase()}
            </p>
            <p>
              Cookly verified means editorial review, not professional
              certification or proof of cooking.
            </p>
            <details className="verification-review">
              <summary>Review recipe</summary>
              <ReviewForm
                key={r.updatedAt.toISOString()}
                recipeId={r.id}
                updatedAt={r.updatedAt.toISOString()}
                isVerified={r.verificationStatus === "VERIFIED"}
              />
            </details>
            <details>
              <summary>Recent decisions (up to 10)</summary>
              {r.moderationActions.length ? (
                <ol className="verification-history">
                  {r.moderationActions.map((a) => (
                    <li key={a.id}>
                      <time dateTime={a.createdAt.toISOString()}>
                        {a.createdAt
                          .toISOString()
                          .slice(0, 16)
                          .replace("T", " ")}{" "}
                        UTC
                      </time>{" "}
                      · {a.actor.profile?.displayName ?? "Administrator"} ·{" "}
                      {a.action === "VERIFY_RECIPE"
                        ? "Verified"
                        : "Rejected / revoked"}
                      {a.note && <p>{a.note}</p>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p>No review decisions yet.</p>
              )}
            </details>
          </article>
        ))}
      </div>
      {!recipes.length && (
        <p className="admin-panel glass">No recipes with this status.</p>
      )}
      <nav className="pagination" aria-label="Verification pages">
        {page > 1 && <Link href={pageUrl(page - 1)}>Previous</Link>}
        <span>Page {page}</span>
        {recipes.length > 12 && <Link href={pageUrl(page + 1)}>Next</Link>}
      </nav>
    </>
  );
}
