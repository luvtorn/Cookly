import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db/client";
import { commentSchema, reactionSchema, type SocialErrorCode } from "./schema";

export class SocialError extends Error {
  constructor(public code: SocialErrorCode) {
    super(code);
  }
}

// Serializable reads protect availability/ownership checks against concurrent edits.
async function transaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await getDb().$transaction(work, {
        isolationLevel: "Serializable",
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2002"].includes(error.code) &&
        attempt < 2
      )
        continue;
      throw error;
    }
  }
}
async function actor(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") throw new SocialError("AUTH");
  return user;
}
async function recipe(
  tx: Prisma.TransactionClient,
  id: string,
  mustBePublic: boolean,
) {
  const row = await tx.recipe.findUnique({
    where: { id },
    select: { slug: true, status: true, isHidden: true },
  });
  if (!row || (mustBePublic && (row.status !== "PUBLISHED" || row.isHidden)))
    throw new SocialError("UNAVAILABLE");
  return row;
}
export async function setReaction(userId: string, raw: unknown) {
  const input = reactionSchema.parse(raw);
  return transaction(async (tx) => {
    await actor(tx, userId);
    const target = await recipe(tx, input.recipeId, input.active);
    const where = { userId, recipeId: input.recipeId };
    if (input.kind === "like") {
      if (input.active)
        await tx.recipeLike.upsert({
          where: { userId_recipeId: where },
          create: where,
          update: {},
        });
      else await tx.recipeLike.deleteMany({ where });
    } else {
      if (input.active)
        await tx.favorite.upsert({
          where: { userId_recipeId: where },
          create: where,
          update: {},
        });
      else await tx.favorite.deleteMany({ where });
    }
    const [like, save, likeCount] = await Promise.all([
      tx.recipeLike.findUnique({
        where: { userId_recipeId: where },
        select: { userId: true },
      }),
      tx.favorite.findUnique({
        where: { userId_recipeId: where },
        select: { userId: true },
      }),
      tx.recipeLike.count({ where: { recipeId: input.recipeId } }),
    ]);
    return {
      slug: target.slug,
      state: { isLiked: !!like, isSaved: !!save, likeCount },
    };
  });
}
export async function changeComment(userId: string, raw: unknown) {
  const input = commentSchema.parse(raw);
  return transaction(async (tx) => {
    const user = await actor(tx, userId);
    const target = await recipe(
      tx,
      input.recipeId,
      input.operation !== "delete",
    );
    if (input.operation === "create") {
      await tx.comment.create({
        data: {
          recipeId: input.recipeId,
          userId,
          body: input.body,
          isEditorial: user.role === "ADMIN",
        },
      });
    } else {
      const previous = await tx.comment.findFirst({
        where: { id: input.id, recipeId: input.recipeId, userId },
        select: { body: true, isHidden: true, updatedAt: true },
      });
      if (!previous) throw new SocialError("UNAVAILABLE");
      if (input.operation === "delete") {
        if (!previous.isHidden)
          await tx.comment.update({
            where: { id: input.id },
            data: { isHidden: true },
          });
      } else {
        if (previous.isHidden) throw new SocialError("UNAVAILABLE");
        if (previous.updatedAt.toISOString() !== input.updatedAt)
          throw new SocialError("CONFLICT");
        if (previous.body !== input.body)
          await tx.comment.update({
            where: { id: input.id },
            data: { body: input.body },
          });
      }
    }
    return { slug: target.slug };
  });
}
