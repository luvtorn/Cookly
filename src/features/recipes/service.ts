import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { getDb } from "@/lib/db/client";
import { recipeSchema, slugify } from "./schema";
import { verifyImageReceipt } from "@/lib/storage/image-receipt";

// Recheck identity in the transaction; neither client input nor JWT roles grant access.
export async function saveAdminRecipe(userId: string, input: unknown) {
  const data = recipeSchema.parse(input);
  const uploaded = data.imageReceipt
    ? verifyImageReceipt(data.imageReceipt, userId)
    : null;
  return getDb().$transaction(
    async (tx) => {
      const admin = await tx.user.findFirst({
        where: { id: userId, role: "ADMIN", status: "ACTIVE" },
        select: { id: true },
      });
      if (!admin) throw new Error("Access denied.");
      if (data.id)
        await tx.$queryRaw`SELECT id FROM "Recipe" WHERE id = ${data.id} AND "authorId" = ${userId} FOR UPDATE`;
      const existing = data.id
        ? await tx.recipe.findFirst({
            where: { id: data.id, authorId: userId },
          })
        : null;
      if (data.id && !existing) throw new Error("Recipe unavailable.");
      const cover =
        uploaded ??
        (existing
          ? {
              coverImageKey: existing.coverImageKey,
              coverImageUrl: existing.coverImageUrl,
            }
          : null);
      if (!cover) throw new Error("Upload a cover before saving.");
      const ingredients = [];
      for (const [position, item] of data.ingredients.entries()) {
        const ingredient = await tx.ingredient.upsert({
          where: { normalizedName: item.name },
          update: {},
          create: {
            name: item.name,
            normalizedName: item.name,
            slug: `${slugify(item.name).slice(0, 80) || "ingredient"}-${createHash("sha256").update(item.name).digest("hex").slice(0, 10)}`,
          },
        });
        ingredients.push({
          ingredientId: ingredient.id,
          amount: item.amount || null,
          unit: item.unit || null,
          note: item.note || null,
          isOptional: item.isOptional,
          position,
        });
      }
      const record = {
        title: data.title,
        description: data.description,
        servings: data.servings,
        prepMinutes: data.prepMinutes,
        cookMinutes: data.cookMinutes,
        difficulty: data.difficulty,
        status: data.status,
        categoryId: data.categoryId,
        cuisineId: data.cuisineId || null,
        coverImageIsAi: data.coverImageIsAi,
        ...cover,
        verificationStatus: "NONE" as const,
        publishedAt:
          data.status === "PUBLISHED"
            ? (existing?.publishedAt ?? new Date())
            : (existing?.publishedAt ?? null),
      };
      if (existing) {
        await tx.recipeIngredient.deleteMany({
          where: { recipeId: existing.id },
        });
        await tx.recipeStep.deleteMany({ where: { recipeId: existing.id } });
        await tx.recipeTag.deleteMany({ where: { recipeId: existing.id } });
      }
      const relations = {
        ingredients: { create: ingredients },
        steps: {
          create: data.steps.map((s, position) => ({
            instruction: s.instruction,
            position,
          })),
        },
        tags: { create: [...new Set(data.tagIds)].map((tagId) => ({ tagId })) },
      };
      return existing
        ? tx.recipe.update({
            where: { id: existing.id, authorId: userId },
            data: { ...record, ...relations },
            select: { id: true, slug: true },
          })
        : tx.recipe.create({
            data: {
              ...record,
              ...relations,
              authorId: userId,
              isEditorial: true,
              slug: `${slugify(data.title) || "recipe"}-${randomUUID().slice(0, 8)}`,
            },
            select: { id: true, slug: true },
          });
    },
    { timeout: 20000 },
  );
}
