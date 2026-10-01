import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { ReviewForm } from "@/features/moderation/review-form";
import { verificationQueue } from "@/features/moderation/repository";
import { decisionLabel } from "@/features/moderation/constants";

export const metadata = {
  title: "Recipe verification",
  robots: { index: false, follow: false },
};
const labels = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  REJECTED: "Needs changes",
};
export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin("/admin/verification");
  const { query, counts, recipes, hasNext } = await verificationQueue(
    await searchParams,
  );
  const url = (status = query.status, page = 1) =>
    `/admin/verification?${new URLSearchParams({ status, q: query.q, page: String(page) })}`;
  return (
    <>
      <header className="admin-page-heading">
        <p className="eyebrow">Community requests</p>
        <h1>Recipe verification</h1>
        <p>
          Review requests from authors, oldest first. Publication does not
          depend on verification.
        </p>
        <p>
          Cookly verified means editorial approval, not certification or a
          guarantee of cooking results. Studio publications are approved
          separately.
        </p>
      </header>
      <nav className="verification-tabs" aria-label="Verification queues">
        {counts.map(({ status, count }) => (
          <Link
            key={status}
            href={url(status)}
            aria-current={query.status === status ? "page" : undefined}
          >
            {labels[status]} <span>{count}</span>
          </Link>
        ))}
      </nav>
      <form className="verification-search" action="/admin/verification">
        <input type="hidden" name="status" value={query.status} />
        <label>
          Search by recipe or username
          <input
            type="search"
            name="q"
            defaultValue={query.q}
            maxLength={100}
          />
        </label>
        <button className="button-secondary">Search</button>
        {query.q && (
          <Link
            className="text-link"
            href={`/admin/verification?status=${query.status}`}
          >
            Clear search
          </Link>
        )}
      </form>
      <div className="verification-list">
        {recipes.map((recipe) => {
          const request = recipe.verificationRequests[0];
          return (
            <article className="verification-item glass" key={recipe.id}>
              <header className="verification-item-heading">
                <Image
                  src={recipe.coverImageUrl}
                  width={112}
                  height={84}
                  alt=""
                />
                <div>
                  <h2>
                    <Link
                      className="text-link"
                      href={`/admin/recipes/${recipe.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {recipe.title} ↗
                    </Link>
                  </h2>
                  <p>
                    {recipe.author.profile?.displayName ?? "Cookly member"} · @
                    {recipe.author.profile?.username ?? "—"}
                  </p>
                  <span className="recipe-status">
                    {labels[recipe.verificationStatus as keyof typeof labels]}
                  </span>
                </div>
              </header>
              {request && (
                <>
                  <p>
                    {request.initiatedByAdmin
                      ? "Admin-initiated review"
                      : "Author-requested review"}
                    {" · "}
                    <time dateTime={request.createdAt.toISOString()}>
                      {request.createdAt
                        .toISOString()
                        .slice(0, 16)
                        .replace("T", " ")}{" "}
                      UTC
                    </time>
                  </p>
                  {request.creatorNote && (
                    <p className="verification-feedback">
                      <b>Author note: </b>
                      {request.creatorNote}
                    </p>
                  )}
                </>
              )}
              {
                <details className="verification-review">
                  <summary>Review recipe</summary>
                  <p>
                    Check ingredient completeness, clear steps, consistent time
                    and servings. One unsuccessful cooking attempt is not
                    sufficient grounds for rejection.
                  </p>
                  <ReviewForm
                    key={recipe.updatedAt.toISOString()}
                    recipeId={recipe.id}
                    updatedAt={recipe.updatedAt.toISOString()}
                    currentStatus={recipe.verificationStatus}
                  />
                </details>
              }
              <details>
                <summary>Recent decisions (up to 5)</summary>
                <Link
                  className="text-link"
                  href={`/admin/verification/${recipe.id}/history`}
                >
                  Browse full history →
                </Link>
                {recipe.moderationActions.length ? (
                  <ol className="verification-history">
                    {recipe.moderationActions.map((action) => (
                      <li key={action.id}>
                        <time dateTime={action.createdAt.toISOString()}>
                          {action.createdAt
                            .toISOString()
                            .slice(0, 16)
                            .replace("T", " ")}{" "}
                          UTC
                        </time>{" "}
                        · {action.actor.profile?.displayName ?? "Administrator"}{" "}
                        · {decisionLabel(action)}
                        {action.creatorMessage && (
                          <p>
                            <b>Message to author: </b>
                            {action.creatorMessage}
                          </p>
                        )}
                        {action.note && (
                          <p>
                            <b>Private note: </b>
                            {action.note}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>No decisions yet.</p>
                )}
              </details>
            </article>
          );
        })}
      </div>
      {!recipes.length && (
        <p className="admin-panel glass">
          {query.q
            ? "No requests match your search."
            : "No recipes in this queue."}
        </p>
      )}
      <nav className="pagination" aria-label="Verification pages">
        {query.page > 1 && (
          <Link href={url(query.status, query.page - 1)}>Previous</Link>
        )}
        <span>Page {query.page}</span>
        {hasNext && <Link href={url(query.status, query.page + 1)}>Next</Link>}
      </nav>
    </>
  );
}
