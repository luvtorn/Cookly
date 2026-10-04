import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/session";
import { publicCard, publicCardSelect } from "@/features/recipes/repository";
import {
  ingredientMatch,
  PANTRY_LIMIT,
  PANTRY_PAGE_SIZE,
  pantryQuerySchema,
  type PantryQuery,
} from "./schema";
import { PantryError } from "./service";

export async function readPantry(input: PantryQuery) {
  const user = await getCurrentUser();
  if (!user) throw new PantryError("AUTH");
  const query = pantryQuerySchema.parse(input);
  // One consistent snapshot for products, ranking and the page's public cards.
  return getDb().$transaction(
    async (tx) => {
      const rows = await tx.pantryItem.findMany({
        where: { userId: user.id },
        select: { ingredient: { select: { id: true, name: true } } },
        orderBy: { ingredient: { name: "asc" } },
        take: PANTRY_LIMIT,
      });
      const items = rows.map((row) => row.ingredient);
      const cuisines = await tx.cuisine.findMany({
        select: { slug: true, name: true },
        orderBy: { name: "asc" },
      });
      if (!items.length)
        return { items, cuisines, matches: [], hasNext: false };
      const conditions = [
        Prisma.sql`r.status = 'PUBLISHED' AND r."isHidden" = false`,
      ];
      if (query.maxTime)
        conditions.push(
          Prisma.sql`r."prepMinutes" + r."cookMinutes" <= ${query.maxTime}`,
        );
      if (query.difficulty)
        conditions.push(Prisma.sql`r.difficulty::text = ${query.difficulty}`);
      if (query.cuisine)
        conditions.push(
          Prisma.sql`EXISTS (SELECT 1 FROM "Cuisine" c WHERE c.id = r."cuisineId" AND c.slug = ${query.cuisine})`,
        );
      const missing =
        query.maxMissing === "any"
          ? Prisma.empty
          : Prisma.sql`AND required - matched <= ${Number(query.maxMissing)}`;
      const ids = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
      WITH scores AS (
        SELECT r.id, r."publishedAt", COUNT(DISTINCT ri."ingredientId")::int AS required,
          COUNT(DISTINCT ri."ingredientId") FILTER (WHERE p."ingredientId" IS NOT NULL)::int AS matched
        FROM "Recipe" r JOIN "RecipeIngredient" ri ON ri."recipeId" = r.id AND ri."isOptional" = false
        LEFT JOIN "PantryItem" p ON p."ingredientId" = ri."ingredientId" AND p."userId" = ${user.id}
        WHERE ${Prisma.join(conditions, " AND ")}
        GROUP BY r.id
      ) SELECT id FROM scores WHERE matched > 0 ${missing}
      ORDER BY matched::numeric / required DESC, required - matched ASC, "publishedAt" DESC NULLS LAST, id DESC
      LIMIT ${PANTRY_PAGE_SIZE + 1} OFFSET ${(query.page - 1) * PANTRY_PAGE_SIZE}`);
      const recipes = await tx.recipe.findMany({
        where: {
          id: { in: ids.slice(0, PANTRY_PAGE_SIZE).map((row) => row.id) },
          status: "PUBLISHED",
          isHidden: false,
        },
        select: {
          ...publicCardSelect,
          ingredients: {
            orderBy: { position: "asc" },
            select: {
              isOptional: true,
              ingredient: { select: { id: true, name: true } },
            },
          },
        },
        take: PANTRY_PAGE_SIZE,
      });
      const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
      const pantryIds = new Set(items.map((item) => item.id));
      const matches = ids.slice(0, PANTRY_PAGE_SIZE).flatMap(({ id }) => {
        const recipe = byId.get(id);
        return recipe
          ? [
              {
                recipe: publicCard(recipe),
                ...ingredientMatch(
                  recipe.ingredients.map((row) => ({
                    ...row.ingredient,
                    isOptional: row.isOptional,
                  })),
                  pantryIds,
                ),
              },
            ]
          : [];
      });
      return {
        items,
        cuisines,
        matches,
        hasNext: ids.length > PANTRY_PAGE_SIZE,
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
