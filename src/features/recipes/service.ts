import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { getDb } from "@/lib/db/client";
import { recipeSchema, slugify } from "./schema";
import { verifyImageReceipt } from "@/lib/storage/image-receipt";

// Recheck identity and ownership in the transaction; client input never grants access.
async function saveOwnedRecipe(
  userId: string,
  input: unknown,
  isEditorial: boolean,
) {
  const data = recipeSchema.parse(input);
  const uploaded = data.imageReceipt
    ? verifyImageReceipt(data.imageReceipt, userId)
    : null;
  return getDb().$transaction(
    async (tx) => {
      const owner = await tx.user.findFirst({
        where: {
          id: userId,
          status: "ACTIVE",
          ...(isEditorial ? { role: "ADMIN" as const } : {}),
        },
        select: { id: true, role: true },
      });
      if (!owner) throw new Error("Access denied.");
      if (!isEditorial && owner.role === "ADMIN")
        throw new Error("Use the editorial studio.");
      if (data.id)
        await tx.$queryRaw`SELECT id FROM "Recipe" WHERE id = ${data.id} AND "authorId" = ${userId} FOR UPDATE`;
      const existing = data.id
        ? await tx.recipe.findFirst({
            where: { id: data.id, authorId: userId, isEditorial },
            include: {
              ingredients: { orderBy: { position: "asc" } },
              steps: { orderBy: { position: "asc" } },
              tags: true,
            },
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
        const ingredient = item.ingredientId
          ? await tx.ingredient.findUnique({ where: { id: item.ingredientId } })
          : await tx.ingredient.upsert({
              where: { normalizedName: item.name },
              update: {},
              create: {
                name: item.name,
                normalizedName: item.name,
                slug: `${slugify(item.name).slice(0, 80) || "ingredient"}-${createHash("sha256").update(item.name).digest("hex").slice(0, 10)}`,
              },
            });
        if (!ingredient) throw new Error("Ingredient unavailable.");
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
      const changed =
        !existing ||
        Object.entries(record).some(([key, value]) => {
          if (
            key === "verificationStatus" ||
            key === "publishedAt" ||
            key === "status"
          )
            return false;
          return existing[key as keyof typeof existing] !== value;
        }) ||
        JSON.stringify(
          existing.ingredients.map((i) => ({
            ingredientId: i.ingredientId,
            amount: i.amount?.toString() ?? null,
            unit: i.unit,
            note: i.note,
            isOptional: i.isOptional,
            position: i.position,
          })),
        ) !==
          JSON.stringify(
            ingredients.map((i) => ({
              ...i,
              amount: i.amount ? String(Number(i.amount)) : null,
            })),
          ) ||
        JSON.stringify(existing.steps.map((s) => s.instruction)) !==
          JSON.stringify(data.steps.map((s) => s.instruction)) ||
        JSON.stringify(existing.tags.map((t) => t.tagId).sort()) !==
          JSON.stringify([...new Set(data.tagIds)].sort());
      const verificationStatus = changed ? "NONE" : existing.verificationStatus;
      if (existing && changed) {
        await tx.recipeVerificationRequest.updateMany({
          where: { recipeId: existing.id, status: "PENDING" },
          data: {
            status: "NONE",
            reviewerNote: "Closed after recipe content changed.",
          },
        });
      }
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
            data: { ...record, verificationStatus, ...relations },
            select: { id: true, slug: true },
          })
        : tx.recipe.create({
            data: {
              ...record,
              ...relations,
              authorId: userId,
              isEditorial,
              slug: `${slugify(data.title) || "recipe"}-${randomUUID().slice(0, 8)}`,
            },
            select: { id: true, slug: true },
          });
    },
    { timeout: 20000 },
  );
}

export function saveAdminRecipe(userId: string, input: unknown) {
  return saveOwnedRecipe(userId, input, true);
}

export function saveUserRecipe(userId: string, input: unknown) {
  return saveOwnedRecipe(userId, input, false);
}
