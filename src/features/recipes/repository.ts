import "server-only";
import { cache } from "react";
import { Prisma } from "@/generated/prisma/client";
import { catalogQuerySchema, type CatalogQuery } from "./catalog-query";
import { getDb } from "@/lib/db/client";
import type { RecipePreview } from "@/features/discovery/recipe-preview";

const publicWhere = { status: "PUBLISHED", isHidden: false } as const;
export const publicCardSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  coverImageUrl: true,
  prepMinutes: true,
  cookMinutes: true,
  isEditorial: true,
  verificationStatus: true,
  category: { select: { name: true } },
  author: {
    select: {
      profile: {
        select: { displayName: true, username: true, avatarUrl: true },
      },
    },
  },
  _count: {
    select: {
      likes: true,
      comments: { where: { isHidden: false } },
    },
  },
} satisfies Prisma.RecipeSelect;
type Card = Prisma.RecipeGetPayload<{ select: typeof publicCardSelect }>;
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
    authorUsername: recipe.isEditorial
      ? null
      : (recipe.author.profile?.username ?? null),
    authorAvatar: recipe.isEditorial
      ? null
      : (recipe.author.profile?.avatarUrl ?? null),
    initials: recipe.isEditorial ? "" : author.slice(0, 2).toUpperCase(),
    isEditorial: recipe.isEditorial,
    isVerified: recipe.verificationStatus === "VERIFIED",
    minutes: recipe.prepMinutes + recipe.cookMinutes,
    likeCount: recipe._count.likes,
    commentCount: recipe._count.comments,
    categories: [recipe.category.name],
  };
}
export async function listPublicRecipes(
  input: CatalogQuery,
  editorial: boolean | "community" = false,
) {
  const { q, category, cuisine, tag, difficulty, maxTime, page } =
    catalogQuerySchema.parse(input);
  // The offline shell remains usable before configuring a database.
  if (!process.env.DATABASE_URL?.trim())
    return { recipes: [], hasNext: false, unavailable: false };
  try {
    // Parameterized SQL keeps total-time filtering and pagination in the database.
    const conditions = [
      Prisma.sql`r.status = 'PUBLISHED' AND r."isHidden" = false`,
    ];
    if (editorial === true) conditions.push(Prisma.sql`r."isEditorial" = true`);
    if (editorial === "community")
      conditions.push(Prisma.sql`r."isEditorial" = false`);
    if (q) {
      const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
      conditions.push(
        Prisma.sql`(r.title ILIKE ${pattern} OR r.description ILIKE ${pattern} OR EXISTS (SELECT 1 FROM "RecipeIngredient" ri JOIN "Ingredient" i ON i.id = ri."ingredientId" WHERE ri."recipeId" = r.id AND i."normalizedName" ILIKE ${pattern}))`,
      );
    }
    if (category)
      conditions.push(
        Prisma.sql`EXISTS (SELECT 1 FROM "Category" c WHERE c.id = r."categoryId" AND c.slug = ${category})`,
      );
    if (cuisine)
      conditions.push(
        Prisma.sql`EXISTS (SELECT 1 FROM "Cuisine" c WHERE c.id = r."cuisineId" AND c.slug = ${cuisine})`,
      );
    if (tag)
      conditions.push(
        Prisma.sql`EXISTS (SELECT 1 FROM "RecipeTag" rt JOIN "Tag" t ON t.id = rt."tagId" WHERE rt."recipeId" = r.id AND t.slug = ${tag})`,
      );
    if (difficulty)
      conditions.push(Prisma.sql`r.difficulty::text = ${difficulty}`);
    if (maxTime)
      conditions.push(
        Prisma.sql`r."prepMinutes" + r."cookMinutes" <= ${maxTime}`,
      );
    const limit = editorial ? 6 : 12;
    const ids = await getDb().$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT r.id FROM "Recipe" r WHERE ${Prisma.join(conditions, " AND ")} ORDER BY r."publishedAt" DESC, r.id DESC LIMIT ${limit + 1} OFFSET ${(page - 1) * limit}`,
    );
    const rows = await getDb().recipe.findMany({
      where: {
        ...publicWhere,
        id: { in: ids.slice(0, limit).map((r) => r.id) },
      },
      select: publicCardSelect,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: limit,
    });
    return {
      recipes: rows.map(publicCard),
      hasNext: ids.length > limit,
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
      ...publicCardSelect,
      servings: true,
      difficulty: true,
      coverImageIsAi: true,
      cuisine: { select: { name: true } },
      tags: { select: { tag: { select: { name: true } } }, take: 15 },
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
      comments: {
        where: { isHidden: false },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 5,
        select: {
          id: true,
          body: true,
          createdAt: true,
          user: {
            select: {
              profile: {
                select: {
                  displayName: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
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
    cuisine: row.cuisine?.name,
    tags: row.tags.map((item) => item.tag.name),
    ingredients: row.ingredients.map((i) => ({
      id: i.id,
      name: i.ingredient.name,
      amount: i.amount?.toString() ?? "",
      unit: i.unit,
      note: i.note,
      isOptional: i.isOptional,
    })),
    steps: row.steps,
    comments: row.comments.toReversed().map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      author: comment.user.profile?.displayName ?? "Cookly member",
      username: comment.user.profile?.username ?? null,
      avatar: comment.user.profile?.avatarUrl ?? null,
    })),
  };
});
export async function recipeOptions() {
  const db = getDb();
  const [categories, cuisines, tags] = await Promise.all([
    db.category.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
    db.cuisine.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
    db.tag.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
  ]);
  return { categories, cuisines, tags };
}

export async function searchRecipeSuggestions(rawQuery: string) {
  const query = rawQuery.trim().slice(0, 100);
  if (query.length < 2 || !process.env.DATABASE_URL?.trim()) return [];
  return getDb().recipe.findMany({
    where: {
      ...publicWhere,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        {
          ingredients: {
            some: {
              ingredient: {
                normalizedName: { contains: query, mode: "insensitive" },
              },
            },
          },
        },
      ],
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: 6,
    select: {
      slug: true,
      title: true,
      coverImageUrl: true,
      prepMinutes: true,
      cookMinutes: true,
    },
  });
}

export async function searchIngredientSuggestions(rawQuery: string) {
  const query = rawQuery
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 100);
  if (query.length < 2) return [];
  const rows = await getDb().ingredient.findMany({
    where: { normalizedName: { contains: query, mode: "insensitive" } },
    select: {
      id: true,
      name: true,
      normalizedName: true,
      _count: { select: { recipeIngredients: true } },
    },
    orderBy: { name: "asc" },
    take: 20,
  });
  return rows
    .toSorted(
      (left, right) =>
        Number(!left.normalizedName.startsWith(query)) -
          Number(!right.normalizedName.startsWith(query)) ||
        left.name.localeCompare(right.name),
    )
    .slice(0, 8)
    .map(({ id, name, _count }) => ({
      id,
      name,
      recipeCount: _count.recipeIngredients,
    }));
}
