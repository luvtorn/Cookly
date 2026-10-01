import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { recipeOptions } from "@/features/recipes/repository";
import { RecipeEditor } from "@/features/recipes/recipe-editor";
import { getRequestLocale } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { RequestReview } from "@/features/moderation/request-form";

export const metadata: Metadata = {
  title: "Edit recipe",
  robots: { index: false, follow: false },
};

export default async function EditCommunityRecipe({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getRequestLocale();
  const user = await requireUser(
    localizePath(locale, `/my-recipes/${id}/edit`),
  );
  if (user.role === "ADMIN") redirect(`/admin/recipes/${id}/edit`);
  const [recipe, options] = await Promise.all([
    getDb().recipe.findFirst({
      where: { id, authorId: user.id, isEditorial: false },
      include: {
        ingredients: {
          include: { ingredient: true },
          orderBy: { position: "asc" },
        },
        steps: { orderBy: { position: "asc" } },
        tags: true,
        moderationActions: {
          where: {
            action: {
              in: [
                "VERIFY_RECIPE",
                "REJECT_VERIFICATION",
                "REOPEN_VERIFICATION",
                "CLEAR_VERIFICATION",
              ],
            },
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: { creatorMessage: true },
        },
      },
    }),
    recipeOptions(),
  ]);
  if (!recipe) notFound();
  return (
    <main className="creator-page home-container" id="main-content">
      <RequestReview
        recipe={{
          id: recipe.id,
          status: recipe.status,
          isHidden: recipe.isHidden,
          verificationStatus: recipe.verificationStatus,
          creatorMessage: recipe.moderationActions[0]?.creatorMessage ?? null,
        }}
      />
      <RecipeEditor
        mode="creator"
        options={options}
        coverUrl={recipe.coverImageUrl}
        slug={recipe.slug}
        initial={{
          id: recipe.id,
          title: recipe.title,
          description: recipe.description,
          servings: recipe.servings,
          prepMinutes: recipe.prepMinutes,
          cookMinutes: recipe.cookMinutes,
          difficulty: recipe.difficulty,
          status: recipe.status,
          categoryId: recipe.categoryId,
          cuisineId: recipe.cuisineId ?? "",
          tagIds: recipe.tags.map((tag) => tag.tagId),
          coverImageIsAi: recipe.coverImageIsAi,
          ingredients: recipe.ingredients.map((item) => ({
            ingredientId: item.ingredientId,
            createNew: false,
            name: item.ingredient.name,
            amount: item.amount?.toString() ?? "",
            unit: item.unit ?? "",
            note: item.note ?? "",
            isOptional: item.isOptional,
          })),
          steps: recipe.steps.map((step) => ({
            instruction: step.instruction,
          })),
        }}
      />
    </main>
  );
}
