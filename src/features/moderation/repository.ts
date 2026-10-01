import "server-only";
import { getDb } from "@/lib/db/client";
import { reviewQuerySchema } from "./schema";
import { verificationActions } from "./constants";

export async function verificationQueue(input: unknown) {
  const query = reviewQuerySchema.parse(input);
  const db = getDb();
  const base = {
    isEditorial: false,
    status: "PUBLISHED" as const,
    isHidden: false,
  };
  const [ids, counts] = await Promise.all([
    db.$queryRaw<{ id: string }[]>`
      SELECT r.id FROM "Recipe" r
      LEFT JOIN "Profile" p ON p."userId" = r."authorId"
      LEFT JOIN LATERAL (
        SELECT min(v."createdAt") AS requested FROM "RecipeVerificationRequest" v
        WHERE v."recipeId" = r.id AND v.status = 'PENDING'
      ) request ON true
      LEFT JOIN LATERAL (
        SELECT max(a."createdAt") AS decided FROM "ModerationAction" a
        WHERE a."recipeId" = r.id AND a.action IN ('VERIFY_RECIPE', 'REJECT_VERIFICATION', 'REOPEN_VERIFICATION', 'CLEAR_VERIFICATION')
      ) decision ON true
      WHERE r.status = 'PUBLISHED' AND NOT r."isHidden" AND NOT r."isEditorial"
        AND r."verificationStatus"::text = ${query.status}
        AND (${query.status} <> 'PENDING' OR request.requested IS NOT NULL)
        AND (${query.q} = '' OR position(lower(${query.q}) in lower(r.title)) > 0
          OR position(lower(${query.q}) in lower(coalesce(p.username, ''))) > 0)
      ORDER BY CASE WHEN ${query.status} = 'PENDING' THEN request.requested END ASC,
        CASE WHEN ${query.status} <> 'PENDING' THEN decision.decided END DESC NULLS LAST, r.id
      LIMIT 13 OFFSET ${(query.page - 1) * 12}`,
    Promise.all(
      (["PENDING", "VERIFIED", "REJECTED"] as const).map(async (status) => ({
        status,
        count: await db.recipe.count({
          where: {
            ...base,
            verificationStatus: status,
            ...(status === "PENDING"
              ? {
                  verificationRequests: {
                    some: { status: "PENDING" as const },
                  },
                }
              : {}),
          },
        }),
      })),
    ),
  ]);
  const rows = await db.recipe.findMany({
    where: {
      ...base,
      verificationStatus: query.status,
      id: { in: ids.slice(0, 12).map((row) => row.id) },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      coverImageUrl: true,
      updatedAt: true,
      verificationStatus: true,
      authorId: true,
      author: {
        select: { profile: { select: { displayName: true, username: true } } },
      },
      verificationRequests: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { createdAt: true, creatorNote: true, initiatedByAdmin: true },
      },
      moderationActions: {
        where: { action: { in: [...verificationActions] } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 5,
        select: {
          id: true,
          action: true,
          previousVerificationStatus: true,
          nextVerificationStatus: true,
          note: true,
          creatorMessage: true,
          createdAt: true,
          actor: { select: { profile: { select: { displayName: true } } } },
        },
      },
    },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  return {
    query,
    counts,
    hasNext: ids.length > 12,
    recipes: ids.slice(0, 12).flatMap((row) => {
      const recipe = byId.get(row.id);
      return recipe ? [recipe] : [];
    }),
  };
}
