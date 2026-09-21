import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import { saveAdminRecipe } from "@/features/recipes/service";
import { signImageReceipt } from "@/lib/storage/image-receipt";
import {
  getPublicRecipe,
  listPublicRecipes,
} from "@/features/recipes/repository";
import { createAdmin } from "../../scripts/create-admin.mjs";
import { seedEditorial } from "../../scripts/seed-editorial.mjs";
import recipes from "../../prisma/starter-recipes.json";
import pg from "pg";
const run = randomUUID().slice(0, 8),
  db = getDb();
const email = `editorial-${run}@example.test`;
const client = new pg.Client({
  connectionString: process.env.TEST_DATABASE_URL,
});
let adminId = "",
  otherId = "",
  categoryId = "";
const receipt = () =>
  signImageReceipt(
    adminId,
    "test/cover",
    "https://res.cloudinary.com/test/image/upload/cover.webp",
  );
const input = () => ({
  title: `Integration ${run}`,
  description: "An integration-only recipe.",
  servings: 2,
  prepMinutes: 10,
  cookMinutes: 10,
  difficulty: "EASY",
  status: "DRAFT",
  categoryId,
  cuisineId: "",
  tagIds: [],
  coverImageIsAi: true,
  imageReceipt: receipt(),
  ingredients: [
    {
      name: `ingredient ${run}`,
      amount: "20",
      unit: "g",
      note: "",
      isOptional: false,
    },
  ],
  steps: [{ instruction: "Cook this test recipe." }],
});
afterAll(async () => {
  if (adminId)
    await db.user.deleteMany({ where: { id: { in: [adminId, otherId] } } });
  await client.end();
  await db.$disconnect();
});
describe("editorial database flow", () => {
  it("provisions an admin atomically without overwriting an existing identity", async () => {
    await client.connect();
    const result = await createAdmin(client, email, `editor_${run}`);
    expect(result.password.length).toBeGreaterThanOrEqual(30);
    const admin = await db.user.findUniqueOrThrow({ where: { email } });
    adminId = admin.id;
    expect(admin.role).toBe("ADMIN");
    expect(admin.passwordHash).not.toContain(result.password);
    await expect(createAdmin(client, email, `editor_${run}`)).rejects.toThrow();
    expect(
      (await db.user.findUniqueOrThrow({ where: { email } })).passwordHash,
    ).toBe(admin.passwordHash);
    otherId = (
      await db.user.create({ data: { email: `other-${run}@example.test` } })
    ).id;
    categoryId = (
      await db.category.upsert({
        where: { slug: "integration" },
        update: {},
        create: { name: "Integration", slug: "integration" },
      })
    ).id;
  });
  it("rejects ordinary users, suspended admins, forged covers and foreign ownership", async () => {
    await expect(saveAdminRecipe(otherId, input())).rejects.toThrow();
    await db.user.update({
      where: { id: adminId },
      data: { status: "SUSPENDED" },
    });
    await expect(saveAdminRecipe(adminId, input())).rejects.toThrow();
    await db.user.update({
      where: { id: adminId },
      data: { status: "ACTIVE" },
    });
    await expect(
      saveAdminRecipe(adminId, { ...input(), imageReceipt: "forged" }),
    ).rejects.toThrow();
    await expect(
      saveAdminRecipe(adminId, { ...input(), id: "foreign-recipe" }),
    ).rejects.toThrow();
  });
  it("creates, publishes and archives; preserves author and slug; rolls back failed edits", async () => {
    const saved = await saveAdminRecipe(adminId, input());
    expect(await getPublicRecipe(saved.slug)).toBeNull();
    await saveAdminRecipe(adminId, {
      ...input(),
      id: saved.id,
      status: "PUBLISHED",
    });
    const published = await getPublicRecipe(saved.slug);
    expect(published?.author).toBe("Cookly");
    expect(published?.coverImageIsAi).toBe(true);
    expect(JSON.stringify(published)).not.toContain(email);
    expect((await listPublicRecipes(run, undefined, 1)).recipes).toHaveLength(
      1,
    );
    await expect(
      saveAdminRecipe(adminId, {
        ...input(),
        id: saved.id,
        categoryId: "missing-category",
      }),
    ).rejects.toThrow();
    expect(await db.recipeStep.count({ where: { recipeId: saved.id } })).toBe(
      1,
    );
    await db.recipe.update({
      where: { id: saved.id },
      data: { isHidden: true },
    });
    expect(await getPublicRecipe(saved.slug)).toBeNull();
    await saveAdminRecipe(adminId, {
      ...input(),
      id: saved.id,
      status: "ARCHIVED",
      imageReceipt: undefined,
    });
    expect(await getPublicRecipe(saved.slug)).toBeNull();
    const final = await db.recipe.findUniqueOrThrow({
      where: { id: saved.id },
    });
    expect(final.slug).toBe(saved.slug);
    expect(final.authorId).toBe(adminId);
    expect(final.isHidden).toBe(true);
  });
  it("seeds ten recipes idempotently without resetting edits, status or admin password", async () => {
    const assets = Object.fromEntries(
      recipes.map((r) => [
        r.slug,
        {
          url: `https://res.cloudinary.com/test/image/upload/${r.slug}`,
          key: `test/${r.slug}`,
        },
      ]),
    );
    expect(await seedEditorial(client, email, assets)).toEqual({
      created: 10,
      skipped: 0,
    });
    await db.recipe.update({
      where: { slug: recipes[0].slug },
      data: { title: "My edited recipe", status: "DRAFT" },
    });
    expect(await seedEditorial(client, email, assets)).toEqual({
      created: 0,
      skipped: 10,
    });
    expect(
      (await db.recipe.findUniqueOrThrow({ where: { slug: recipes[0].slug } }))
        .title,
    ).toBe("My edited recipe");
    expect(
      await db.recipe.count({
        where: { authorId: adminId, isEditorial: true },
      }),
    ).toBe(11);
  });
});
