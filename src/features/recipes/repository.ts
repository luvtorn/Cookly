import "server-only";
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db/client";
import type { RecipePreview } from "@/features/discovery/recipe-preview";

const publicWhere = { status: "PUBLISHED", isHidden: false } as const;
const cardSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  coverImageUrl: true,
  prepMinutes: true,
  cookMinutes: true,
  isEditorial: true,
  category: { select: { name: true } },
  author: { select: { profile: { select: { displayName: true } } } },
} satisfies Prisma.RecipeSelect;
type Card = Prisma.RecipeGetPayload<{ select: typeof cardSelect }>;
export function publicCard(recipe: Card): RecipePreview {
  const author = recipe.isEditorial
    ? "Cookly"
    : (recipe.author.profile?.displayName ?? "Cookly member");
  return {
    id: recipe.id,
    slug: recipe.slug,
    title: recipe.title,
    description: recipe.description,
    image: recipe.coverImageUrl,
    imageAlt: recipe.title,
    author,
    initials: recipe.isEditorial ? "" : author.slice(0, 2).toUpperCase(),
    isEditorial: recipe.isEditorial,
    minutes: recipe.prepMinutes + recipe.cookMinutes,
    categories: [recipe.category.name],
  };
}
export async function listPublicRecipes(
  q: string,
  category: string | undefined,
  page: number,
) {
  // The offline shell remains usable before configuring a database.
  if (!process.env.DATABASE_URL?.trim())
    return { recipes: [], hasNext: false, unavailable: false };
  const where: Prisma.RecipeWhereInput = { ...publicWhere };
  if (q)
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      {
        ingredients: {
          some: {
            ingredient: {
              normalizedName: {
                contains: q.toLowerCase(),
                mode: "insensitive",
              },
            },
          },
        },
      },
    ];
  if (category === "desserts") where.category = { slug: "desserts" };
  else if (category === "global") where.cuisineId = { not: null };
  else if (category) where.tags = { some: { tag: { slug: category } } };
  try {
    const rows = await getDb().recipe.findMany({
      where,
      select: cardSelect,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 12,
      take: 13,
    });
    return {
      recipes: rows.slice(0, 12).map(publicCard),
      hasNext: rows.length > 12,
      unavailable: false,
    };
  } catch {
    console.error("[recipes] Catalog read failed.");
    return { recipes: [], hasNext: false, unavailable: true };
  }
}
export const getPublicRecipe = cache(async (slug: string) => {
  const row = await getDb().recipe.findFirst({
    where: { ...publicWhere, slug },
    select: {
      ...cardSelect,
      servings: true,
      difficulty: true,
      coverImageIsAi: true,
      ingredients: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          amount: true,
          unit: true,
          note: true,
          isOptional: true,
          ingredient: { select: { name: true } },
        },
      },
      steps: {
        orderBy: { position: "asc" },
        select: { id: true, position: true, instruction: true },
      },
    },
  });
  if (!row) return null;
  return {
    ...publicCard(row),
    servings: row.servings,
    difficulty: row.difficulty,
    coverImageIsAi: row.coverImageIsAi,
    prepMinutes: row.prepMinutes,
    cookMinutes: row.cookMinutes,
    ingredients: row.ingredients.map((i) => ({
      id: i.id,
      name: i.ingredient.name,
      amount: i.amount?.toString() ?? "",
      unit: i.unit,
      note: i.note,
      isOptional: i.isOptional,
    })),
    steps: row.steps,
  };
});
export async function recipeOptions() {
  const db = getDb();
  const [categories, cuisines, tags] = await Promise.all([
    db.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
    db.cuisine.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
    db.tag.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
  ]);
  return { categories, cuisines, tags };
}
