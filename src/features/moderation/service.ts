import "server-only";
import { getDb } from "@/lib/db/client";
import { verificationSchema, requestVerificationSchema } from "./schema";

export class StaleReviewError extends Error {}
export async function reviewRecipe(adminId: string, input: unknown) {
  const data = verificationSchema.parse(input);
  return getDb().$transaction(async (tx) => {
    const admin = await tx.user.findFirst({
      where: { id: adminId, role: "ADMIN", status: "ACTIVE" },
      select: { id: true },
    });
    if (!admin) throw new Error("Access denied.");
    await tx.$queryRaw`SELECT id FROM "Recipe" WHERE id = ${data.recipeId} FOR UPDATE`;
    const recipe = await tx.recipe.findFirst({
      where: {
        id: data.recipeId,
        status: "PUBLISHED",
        isHidden: false,
        isEditorial: false,
      },
      select: {
        id: true,
        slug: true,
        updatedAt: true,
        verificationStatus: true,
      },
    });
    if (!recipe) throw new Error("Recipe unavailable.");
    if (recipe.updatedAt.toISOString() !== data.updatedAt)
      throw new StaleReviewError();
    const status = data.targetStatus;
    if (recipe.verificationStatus === status) return { slug: recipe.slug };
    await tx.recipe.update({
      where: { id: recipe.id },
      data: { verificationStatus: status },
    });
    if (status === "PENDING") {
      await tx.recipeVerificationRequest.create({
        data: {
          recipeId: recipe.id,
          requestedById: admin.id,
          initiatedByAdmin: true,
        },
      });
    } else
      await tx.recipeVerificationRequest.updateMany({
        where: { recipeId: recipe.id, status: "PENDING" },
        data: {
          status,
          reviewedById: admin.id,
          reviewedAt: new Date(),
          reviewerNote: data.note || null,
        },
      });
    await tx.moderationAction.create({
      data: {
        actorId: admin.id,
        recipeId: recipe.id,
        creatorMessage: data.creatorMessage || null,
        action: (
          {
            VERIFIED: "VERIFY_RECIPE",
            REJECTED: "REJECT_VERIFICATION",
            PENDING: "REOPEN_VERIFICATION",
            NONE: "CLEAR_VERIFICATION",
          } as const
        )[status],
        previousVerificationStatus: recipe.verificationStatus,
        nextVerificationStatus: status,
        note: data.note || null,
      },
    });
    return { slug: recipe.slug };
  });
}

export class VerificationRequestError extends Error {
  constructor(public code: "unavailable" | "limit") {
    super(code);
  }
}

export async function requestVerification(userId: string, input: unknown) {
  const data = requestVerificationSchema.parse(input);
  return getDb().$transaction(async (tx) => {
    // Serialize this user's daily quota and this recipe's state transitions.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findFirst({
      where: { id: userId, status: "ACTIVE", role: { not: "ADMIN" } },
      select: { id: true },
    });
    if (!user) throw new VerificationRequestError("unavailable");
    await tx.$queryRaw`SELECT id FROM "Recipe" WHERE id = ${data.recipeId} FOR UPDATE`;
    const recipe = await tx.recipe.findFirst({
      where: {
        id: data.recipeId,
        authorId: user.id,
        status: "PUBLISHED",
        isHidden: false,
        isEditorial: false,
      },
      select: { id: true, slug: true, verificationStatus: true },
    });
    if (!recipe) throw new VerificationRequestError("unavailable");
    if (recipe.verificationStatus === "PENDING") return recipe;
    if (recipe.verificationStatus !== "NONE")
      throw new VerificationRequestError("unavailable");
    const count = await tx.recipeVerificationRequest.count({
      where: {
        requestedById: user.id,
        createdAt: { gte: new Date(Date.now() - 86400000) },
        initiatedByAdmin: false,
      },
    });
    if (count >= 10) throw new VerificationRequestError("limit");
    await tx.recipeVerificationRequest.create({
      data: {
        recipeId: recipe.id,
        requestedById: user.id,
        creatorNote: data.creatorNote || null,
      },
    });
    return tx.recipe.update({
      where: { id: recipe.id },
      data: { verificationStatus: "PENDING" },
      select: { id: true, slug: true },
    });
  });
}
