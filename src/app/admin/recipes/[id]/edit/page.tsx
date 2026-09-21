import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { recipeOptions } from "@/features/recipes/repository";
import { RecipeEditor } from "@/features/recipes/recipe-editor";
export default async function EditRecipe({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAdmin(`/admin/recipes/${id}/edit`);
  const [recipe, options] = await Promise.all([
    getDb().recipe.findFirst({
      where: { id, authorId: user.id },
      include: {
        ingredients: {
          include: { ingredient: true },
          orderBy: { position: "asc" },
        },
        steps: { orderBy: { position: "asc" } },
        tags: true,
      },
    }),
    recipeOptions(),
  ]);
  if (!recipe) notFound();
  return (
    <RecipeEditor
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
        tagIds: recipe.tags.map((t) => t.tagId),
        coverImageIsAi: recipe.coverImageIsAi,
        ingredients: recipe.ingredients.map((i) => ({
          name: i.ingredient.name,
          amount: i.amount?.toString() ?? "",
          unit: i.unit ?? "",
          note: i.note ?? "",
          isOptional: i.isOptional,
        })),
        steps: recipe.steps.map((s) => ({ instruction: s.instruction })),
      }}
    />
  );
}
