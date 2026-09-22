import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import { saveAdminRecipe, saveUserRecipe } from "@/features/recipes/service";
import { signImageReceipt } from "@/lib/storage/image-receipt";
import {
  getPublicRecipe,
  listPublicRecipes,
} from "@/features/recipes/repository";
import { createAdmin } from "../../scripts/create-admin.mjs";
import { seedEditorial } from "../../scripts/seed-editorial.mjs";
import { verifyEditorial } from "../../scripts/verify-editorial.mjs";
import { reviewRecipe, StaleReviewError } from "@/features/moderation/service";
import recipes from "../../prisma/starter-recipes.json";
import pg from "pg";
import { updateOwnProfile } from "@/features/users/service";
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
      createNew: true,
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
    await db.moderationAction.deleteMany({ where: { actorId: adminId } });
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
      await db.user.create({
        data: {
          email: `other-${run}@example.test`,
          profile: {
            create: {
              username: `community_${run}`,
              displayName: "Community Cook",
            },
          },
        },
      })
    ).id;
    categoryId = (
      await db.category.upsert({
        where: { slug: "integration" },
        update: {},
        create: { name: "Integration", slug: "integration" },
      })
    ).id;
  });
  it("creates community recipes without editorial identity and enforces ownership", async () => {
    const communityInput = {
      ...input(),
      title: `Community ${run}`,
      status: "PUBLISHED" as const,
      imageReceipt: signImageReceipt(
        otherId,
        "test/community-cover",
        "https://res.cloudinary.com/test/image/upload/community.webp",
      ),
    };
    const saved = await saveUserRecipe(otherId, communityInput);
    const row = await db.recipe.findUniqueOrThrow({ where: { id: saved.id } });
    expect(row.isEditorial).toBe(false);
    await db.recipeLike.create({
      data: { userId: adminId, recipeId: saved.id },
    });
    await db.comment.createMany({
      data: [
        {
          userId: adminId,
          recipeId: saved.id,
          body: "A visible test comment.",
        },
        {
          userId: adminId,
          recipeId: saved.id,
          body: "Private hidden comment.",
          isHidden: true,
        },
      ],
    });
    const detail = await getPublicRecipe(saved.slug);
    expect(detail?.author).toBe("Community Cook");
    expect(detail?.likeCount).toBe(1);
    expect(detail?.commentCount).toBe(1);
    expect(detail?.comments).toHaveLength(1);
    expect(JSON.stringify(detail)).not.toContain("Private hidden comment");
    expect(
      (await listPublicRecipes({ q: run, page: 1 }, "community")).recipes.some(
        (recipe) => recipe.id === saved.id,
      ),
    ).toBe(true);
    await expect(
      saveUserRecipe(adminId, {
        ...communityInput,
        id: saved.id,
        imageReceipt: undefined,
      }),
    ).rejects.toThrow();
    await expect(
      saveAdminRecipe(adminId, {
        ...input(),
        id: saved.id,
        imageReceipt: undefined,
      }),
    ).rejects.toThrow();
  });
  it("updates only public profile fields and preserves username uniqueness", async () => {
    const updated = await updateOwnProfile(otherId, {
      displayName: "Community Creator",
      username: `creator_${run}`,
      bio: "Seasonal recipes.",
      location: "Warsaw",
    });
    expect(updated.username).toBe(`creator_${run}`);
    await expect(
      updateOwnProfile(otherId, {
        displayName: "Conflict",
        username: `editor_${run}`,
        bio: "",
        location: "",
      }),
    ).rejects.toThrow();
    expect(
      (await db.profile.findUniqueOrThrow({ where: { userId: otherId } }))
        .username,
    ).toBe(`creator_${run}`);
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
    expect(
      (await listPublicRecipes({ q: run, page: 1 })).recipes.some(
        (recipe) => recipe.id === saved.id,
      ),
    ).toBe(true);
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
    expect(await verifyEditorial(client, email)).toEqual({
      verified: 10,
      skipped: 0,
    });
    expect(await verifyEditorial(client, email)).toEqual({
      verified: 0,
      skipped: 10,
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
  it("reviews atomically, rejects stale versions and preserves verification on unchanged saves", async () => {
    const saved = await saveAdminRecipe(adminId, {
      ...input(),
      status: "PUBLISHED",
    });
    const snapshot = () =>
      db.recipe.findUniqueOrThrow({ where: { id: saved.id } });
    const command = async (decision: string, note = "") => ({
      recipeId: saved.id,
      updatedAt: (await snapshot()).updatedAt.toISOString(),
      decision,
      note,
    });
    await expect(
      reviewRecipe(otherId, await command("VERIFY")),
    ).rejects.toThrow();
    await expect(
      reviewRecipe("guest", await command("VERIFY")),
    ).rejects.toThrow();
    await db.user.update({
      where: { id: adminId },
      data: { status: "SUSPENDED" },
    });
    await expect(
      reviewRecipe(adminId, await command("VERIFY")),
    ).rejects.toThrow();
    await db.user.update({
      where: { id: adminId },
      data: { status: "ACTIVE" },
    });
    await db.recipeVerificationRequest.create({
      data: { recipeId: saved.id, requestedById: adminId },
    });
    const before = await command("VERIFY");
    await reviewRecipe(adminId, before);
    await expect(reviewRecipe(adminId, before)).rejects.toBeInstanceOf(
      StaleReviewError,
    );
    expect((await snapshot()).verificationStatus).toBe("VERIFIED");
    expect(
      await db.recipeVerificationRequest.count({
        where: {
          recipeId: saved.id,
          status: "VERIFIED",
          reviewedById: adminId,
        },
      }),
    ).toBe(1);
    await saveAdminRecipe(adminId, {
      ...input(),
      id: saved.id,
      status: "PUBLISHED",
      imageReceipt: undefined,
    });
    expect((await snapshot()).verificationStatus).toBe("VERIFIED");
    const privateNote = "Private review concern";
    await reviewRecipe(adminId, await command("REVOKE", privateNote));
    expect((await snapshot()).status).toBe("PUBLISHED");
    expect(JSON.stringify(await getPublicRecipe(saved.slug))).not.toContain(
      privateNote,
    );
    expect((await snapshot()).verificationStatus).toBe("REJECTED");
    await reviewRecipe(adminId, await command("VERIFY"));
    await saveAdminRecipe(adminId, {
      ...input(),
      id: saved.id,
      status: "PUBLISHED",
      title: "Materially changed",
      imageReceipt: undefined,
    });
    expect((await snapshot()).verificationStatus).toBe("NONE");
    const concurrent = await command("VERIFY");
    const attempts = await Promise.allSettled([
      reviewRecipe(adminId, concurrent),
      reviewRecipe(adminId, concurrent),
    ]);
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
    expect(
      await db.moderationAction.count({ where: { recipeId: saved.id } }),
    ).toBe(4);
    await db.recipe.update({
      where: { id: saved.id },
      data: { isHidden: true },
    });
    await expect(
      reviewRecipe(adminId, await command("REVOKE", "Hidden")),
    ).rejects.toThrow();
  });
  it("combines database filters and counts total time before pagination", async () => {
    const base = {
      q: "",
      page: 1,
      category: "soups",
      difficulty: "EASY" as const,
    };
    const soups = await listPublicRecipes(base);
    expect(soups.recipes.some((r) => r.slug === "roasted-tomato-soup")).toBe(
      true,
    );
    expect(
      (await listPublicRecipes({ ...base, maxTime: 10 })).recipes,
    ).toHaveLength(0);
    expect(
      (await listPublicRecipes({ ...base, cuisine: "no-such-cuisine" }))
        .recipes,
    ).toHaveLength(0);
    expect(
      (await listPublicRecipes({ q: "", page: 1, tag: "vegetarian" })).recipes
        .length,
    ).toBeGreaterThan(0);
    expect(
      (await listPublicRecipes({ q: "", page: 1 }, true)).recipes,
    ).toHaveLength(6);
  });
});
