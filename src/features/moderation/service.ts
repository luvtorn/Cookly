import "server-only";
import { getDb } from "@/lib/db/client";
import { verificationSchema } from "./schema";

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
      where: { id: data.recipeId, status: "PUBLISHED", isHidden: false },
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
    if (
      (data.decision === "REVOKE") !==
      (recipe.verificationStatus === "VERIFIED")
    )
      throw new StaleReviewError();
    const status = data.decision === "VERIFY" ? "VERIFIED" : "REJECTED";
    await tx.recipe.update({
      where: { id: recipe.id },
      data: { verificationStatus: status },
    });
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
        action: status === "VERIFIED" ? "VERIFY_RECIPE" : "REJECT_VERIFICATION",
        note:
          data.decision === "REVOKE"
            ? `Verification revoked: ${data.note}`.slice(0, 1000)
            : data.note || null,
      },
    });
    return { slug: recipe.slug };
  });
}
