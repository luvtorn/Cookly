import "server-only";
import { getDb } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/session";
import { publicCard, publicCardSelect } from "@/features/recipes/repository";
import { commentQuery, savedQuery, type CommentPage } from "./schema";
import { SocialError } from "./service";

export async function readComments(raw: unknown): Promise<CommentPage> {
  const { recipeId, cursor } = commentQuery.parse(raw);
  const user = await getCurrentUser();
  const db = getDb();
  const visible = {
    recipeId,
    isHidden: false,
    recipe: { status: "PUBLISHED" as const, isHidden: false },
  };
  const [rows, count] = await Promise.all([
    db.comment.findMany({
      where: {
        ...visible,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: new Date(cursor.createdAt) } },
                {
                  createdAt: new Date(cursor.createdAt),
                  id: { lt: cursor.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 11,
      select: {
        id: true,
        userId: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        isEditorial: true,
        user: {
          select: {
            profile: {
              select: { displayName: true, username: true, avatarUrl: true },
            },
          },
        },
      },
    }),
    db.comment.count({ where: visible }),
  ]);
  const items = rows.slice(0, 10).map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: row.isEditorial
      ? "Cookly"
      : (row.user.profile?.displayName ?? "Cookly member"),
    username: row.isEditorial ? null : (row.user.profile?.username ?? null),
    avatar: row.isEditorial ? null : (row.user.profile?.avatarUrl ?? null),
    canEdit: user?.id === row.userId,
  }));
  const last = items.at(-1);
  return {
    items,
    count,
    cursor:
      rows.length > 10 && last
        ? { id: last.id, createdAt: last.createdAt }
        : null,
  };
}
export async function listSaved(userId: string, raw: unknown) {
  const { q, page, view } = savedQuery.parse(raw);
  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });
  if (user?.status !== "ACTIVE") throw new SocialError("AUTH");
  const args = {
    where: {
      userId,
      recipe: {
        status: "PUBLISHED" as const,
        isHidden: false,
        ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
      },
    },
    select: { recipe: { select: publicCardSelect } },
    orderBy: [{ createdAt: "desc" as const }, { recipeId: "desc" as const }],
    skip: (page - 1) * 12,
    take: 13,
  };
  const rows =
    view === "liked"
      ? await db.recipeLike.findMany(args)
      : await db.favorite.findMany(args);
  return {
    recipes: rows.slice(0, 12).map((row) => publicCard(row.recipe)),
    hasNext: rows.length > 12,
  };
}
