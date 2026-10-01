import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  verificationActions,
  decisionLabel,
} from "@/features/moderation/constants";

export const metadata = {
  title: "Verification history",
  robots: { index: false, follow: false },
};

export default async function VerificationHistory({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin("/admin/verification");
  const { id } = await params;
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .catch(1)
    .parse((await searchParams).page);
  const recipe = await getDb().recipe.findUnique({
    where: { id },
    select: {
      title: true,
      moderationActions: {
        where: { action: { in: [...verificationActions] } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * 20,
        take: 21,
        select: {
          id: true,
          createdAt: true,
          action: true,
          previousVerificationStatus: true,
          nextVerificationStatus: true,
          note: true,
          creatorMessage: true,
          actor: { select: { profile: { select: { displayName: true } } } },
        },
      },
    },
  });
  if (!recipe) notFound();
  return (
    <>
      <header className="admin-page-heading">
        <Link className="text-link" href="/admin/verification">
          ← Verification queue
        </Link>
        <h1>Verification history</h1>
        <p>{recipe.title}</p>
      </header>
      <section className="admin-panel glass">
        <ol className="verification-history">
          {recipe.moderationActions.slice(0, 20).map((decision) => (
            <li key={decision.id}>
              <time dateTime={decision.createdAt.toISOString()}>
                {decision.createdAt
                  .toISOString()
                  .slice(0, 16)
                  .replace("T", " ")}{" "}
                UTC
              </time>
              <p>
                <strong>{decisionLabel(decision)}</strong> ·{" "}
                {decision.actor.profile?.displayName ?? "Administrator"}
              </p>
              {decision.creatorMessage && (
                <p>
                  <b>Message to author: </b>
                  {decision.creatorMessage}
                </p>
              )}
              {decision.note && (
                <p>
                  <b>Private note: </b>
                  {decision.note}
                </p>
              )}
            </li>
          ))}
        </ol>
        {!recipe.moderationActions.length && <p>No decisions on this page.</p>}
      </section>
      <nav className="pagination" aria-label="History pages">
        {page > 1 && <Link href={`?page=${page - 1}`}>Previous</Link>}
        <span>Page {page}</span>
        {recipe.moderationActions.length > 20 && (
          <Link href={`?page=${page + 1}`}>Next</Link>
        )}
      </nav>
    </>
  );
}
