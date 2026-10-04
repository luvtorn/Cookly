import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
const viewer = vi.hoisted(() => ({ id: "" }));
vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: async () => (viewer.id ? { id: viewer.id } : null),
}));
import { getDb } from "@/lib/db/client";
import { changePantry } from "@/features/pantry/service";
import { readPantry } from "@/features/pantry/repository";
import { pantryQuerySchema } from "@/features/pantry/schema";
import { searchIngredientSuggestions } from "@/features/recipes/repository";
const db = getDb();
const run = randomUUID().slice(0, 8);
let owner = "",
  other = "",
  category = "",
  cuisine = "";
let ingredients: { id: string; name: string }[] = [];
const recipeIds: string[] = [];
async function makeRecipe(
  label: string,
  mandatory: number[],
  optional: number[] = [],
  extras: {
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    isHidden?: boolean;
    minutes?: number;
    date?: Date;
  } = {},
) {
  const row = await db.recipe.create({
    data: {
      authorId: owner,
      categoryId: category,
      cuisineId: cuisine,
      slug: `pantry-${run}-${label}`,
      title: label,
      description: "Private fixture",
      coverImageUrl: "/images/tomato-soup.webp",
      servings: 2,
      prepMinutes: 5,
      cookMinutes: extras.minutes ?? 10,
      difficulty: "EASY",
      status: extras.status ?? "PUBLISHED",
      isHidden: extras.isHidden ?? false,
      publishedAt: extras.date ?? new Date("2026-01-01"),
      ingredients: {
        create: [
          ...mandatory.map((i) => ({
            ingredientId: ingredients[i].id,
            isOptional: false,
          })),
          ...optional.map((i) => ({
            ingredientId: ingredients[i].id,
            isOptional: true,
          })),
        ].map((r, position) => ({ ...r, position })),
      },
    },
  });
  recipeIds.push(row.id);
  return row.id;
}
beforeAll(async () => {
  owner = (
    await db.user.create({
      data: { email: `pantry-${run}@example.test`, status: "ACTIVE" },
    })
  ).id;
  other = (
    await db.user.create({
      data: { email: `pantry-other-${run}@example.test`, status: "ACTIVE" },
    })
  ).id;
  category = (
    await db.category.create({
      data: { name: `Pantry ${run}`, slug: `pantry-${run}` },
    })
  ).id;
  cuisine = (
    await db.cuisine.create({
      data: { name: `Pantry ${run}`, slug: `pantry-${run}` },
    })
  ).id;
  await db.ingredient.createMany({
    data: Array.from({ length: 202 }, (_, i) => ({
      id: `pantry-${run}-${i}`,
      name: `pantry-${run}-${i}`,
      normalizedName: `pantry-${run}-${i}`,
      slug: `pantry-${run}-${i}`,
    })),
  });
  ingredients = Array.from({ length: 202 }, (_, i) => ({
    id: `pantry-${run}-${i}`,
    name: `pantry-${run}-${i}`,
  }));
});
beforeEach(async () => {
  viewer.id = owner;
  await changePantry(owner, "clear", null);
});
afterAll(async () => {
  await db.user.deleteMany({
    where: { id: { in: [owner, other].filter(Boolean) } },
  });
  await db.ingredient.deleteMany({
    where: { id: { in: ingredients.map((r) => r.id) } },
  });
  if (category) await db.category.delete({ where: { id: category } });
  if (cuisine) await db.cuisine.delete({ where: { id: cuisine } });
  await db.$disconnect();
});
it("serializes duplicate writes and isolates owners", async () => {
  await Promise.all(
    Array.from({ length: 4 }, () =>
      changePantry(owner, "add", { ingredientId: ingredients[0].id }),
    ),
  );
  expect(await db.pantryItem.count({ where: { userId: owner } })).toBe(1);
  await changePantry(other, "remove", { ingredientId: ingredients[0].id });
  expect((await readPantry(pantryQuerySchema.parse({}))).items).toHaveLength(1);
  viewer.id = other;
  expect((await readPantry(pantryQuerySchema.parse({}))).items).toHaveLength(0);
  viewer.id = "";
  await expect(readPantry(pantryQuerySchema.parse({}))).rejects.toMatchObject({
    code: "AUTH",
  });
  await expect(
    changePantry("nonexistent", "add", { ingredientId: ingredients[0].id }),
  ).rejects.toMatchObject({ code: "AUTH" });
  await expect(
    changePantry(owner, "add", { ingredientId: "missing" }),
  ).rejects.toMatchObject({ code: "INVALID" });
  await expect(
    changePantry(owner, "add", {
      ingredientId: ingredients[0].id,
      userId: other,
    }),
  ).rejects.toThrow();
});
it("enforces the capacity even for competing additions and allows an existing item", async () => {
  await db.pantryItem.createMany({
    data: ingredients
      .slice(0, 199)
      .map((i) => ({ userId: owner, ingredientId: i.id })),
  });
  const outcomes = await Promise.allSettled(
    [199, 200].map((i) =>
      changePantry(owner, "add", { ingredientId: ingredients[i].id }),
    ),
  );
  expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(await db.pantryItem.count({ where: { userId: owner } })).toBe(200);
  await expect(
    changePantry(owner, "add", { ingredientId: ingredients[0].id }),
  ).resolves.toHaveLength(200);
});
it("rechecks ACTIVE status for every write", async () => {
  await db.user.update({ where: { id: owner }, data: { status: "SUSPENDED" } });
  try {
    for (const op of ["add", "remove", "clear"] as const)
      await expect(
        changePantry(owner, op, { ingredientId: ingredients[0].id }),
      ).rejects.toMatchObject({ code: "AUTH" });
  } finally {
    await db.user.update({ where: { id: owner }, data: { status: "ACTIVE" } });
  }
});
it("ranks mandatory unique IDs, excludes unavailable recipes and applies filters in SQL", async () => {
  const complete = await makeRecipe("complete", [0, 0], [1]);
  const half = await makeRecipe("half", [0, 1]);
  const third = await makeRecipe("third", [0, 1, 2], [], { minutes: 50 });
  await makeRecipe("draft", [0], [], { status: "DRAFT" });
  await makeRecipe("hidden", [0], [], { isHidden: true });
  await makeRecipe("archive", [0], [], { status: "ARCHIVED" });
  await makeRecipe("optional-only", [], [0]);
  await makeRecipe("no-match", [1]);
  await changePantry(owner, "add", { ingredientId: ingredients[0].id });
  const result = await readPantry(pantryQuerySchema.parse({}));
  expect(result.matches.map((r) => r.recipe.id)).toEqual([
    complete,
    half,
    third,
  ]);
  expect(result.matches[0]).toMatchObject({
    requiredCount: 1,
    percentage: 100,
    optional: [ingredients[1]],
  });
  expect(
    (await readPantry(pantryQuerySchema.parse({ maxMissing: "0" }))).matches,
  ).toHaveLength(1);
  expect(
    (await readPantry(pantryQuerySchema.parse({ maxTime: "20" }))).matches,
  ).toHaveLength(2);
  expect(
    (await readPantry(pantryQuerySchema.parse({ difficulty: "HARD" }))).matches,
  ).toHaveLength(0);
  expect(
    (await readPantry(pantryQuerySchema.parse({ cuisine: "unknown" }))).matches,
  ).toHaveLength(0);
  expect(
    (await readPantry(pantryQuerySchema.parse({ cuisine: `pantry-${run}` })))
      .matches,
  ).toHaveLength(3);
  expect(JSON.stringify(result)).not.toMatch(
    /email|passwordHash|reviewerNote|creatorMessage/,
  );
  const suggestions = await searchIngredientSuggestions(ingredients[0].name);
  expect(suggestions.find((r) => r.id === ingredients[0].id)?.recipeCount).toBe(
    5,
  ); // Four public recipes, including the repeated mandatory row.
});
it("paginates stably and sorts equal scores by missing count then date and ID", async () => {
  await changePantry(owner, "add", { ingredientId: ingredients[3].id });
  const ids = [];
  for (let i = 0; i < 14; i++)
    ids.push(
      await makeRecipe(`page-${i}`, [3], [], {
        date: new Date(`2026-02-${String(i + 1).padStart(2, "0")}`),
      }),
    );
  const first = await readPantry(pantryQuerySchema.parse({}));
  const second = await readPantry(pantryQuerySchema.parse({ page: 2 }));
  expect(first.matches).toHaveLength(12);
  expect(first.hasNext).toBe(true);
  expect(second.matches).toHaveLength(2);
  expect(second.hasNext).toBe(false);
  expect([...first.matches, ...second.matches].map((r) => r.recipe.id)).toEqual(
    ids.reverse(),
  );
});
