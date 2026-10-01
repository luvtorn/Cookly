import { afterAll, beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { getDb } from "@/lib/db/client";
import {
  requestVerification,
  reviewRecipe,
} from "@/features/moderation/service";
import { verificationQueue } from "@/features/moderation/repository";
import { saveUserRecipe, saveAdminRecipe } from "@/features/recipes/service";
import { signImageReceipt } from "@/lib/storage/image-receipt";
import { approveEditorial } from "../../scripts/approve-editorial.mjs";
const db = getDb(),
  run = randomUUID().slice(0, 8);
let owner = "",
  admin = "",
  category = "";
const input = (userId = owner) => ({
  title: `Review ${run}`,
  description: "A complete testing recipe.",
  servings: 2,
  prepMinutes: 5,
  cookMinutes: 10,
  difficulty: "EASY",
  status: "PUBLISHED",
  categoryId: category,
  cuisineId: "",
  tagIds: [],
  coverImageIsAi: false,
  imageReceipt: signImageReceipt(
    userId,
    "test/verification",
    "https://res.cloudinary.com/test/image/upload/verification.webp",
  ),
  ingredients: [
    {
      createNew: true,
      name: `review ingredient ${run}`,
      amount: "1",
      unit: "g",
      note: "",
      isOptional: false,
    },
  ],
  steps: [{ instruction: "Cook and serve." }],
});
beforeAll(async () => {
  owner = (
    await db.user.create({
      data: {
        email: `review-${run}@example.test`,
        profile: {
          create: { username: `review_${run}`, displayName: "Review author" },
        },
      },
    })
  ).id;
  admin = (
    await db.user.create({
      data: { email: `review-admin-${run}@example.test`, role: "ADMIN" },
    })
  ).id;
  category = (
    await db.category.create({
      data: { name: `Review ${run}`, slug: `review-${run}` },
    })
  ).id;
});
afterAll(async () => {
  await db.moderationAction.deleteMany({ where: { actorId: admin } });
  await db.user.deleteMany({
    where: { id: { in: [owner, admin].filter(Boolean) } },
  });
  if (category) await db.category.delete({ where: { id: category } });
  await db.ingredient.deleteMany({
    where: { normalizedName: `review ingredient ${run}` },
  });
  await db.$disconnect();
});
it("publishes without a request, enforces ownership, and deduplicates concurrent submissions", async () => {
  const recipe = await saveUserRecipe(owner, input());
  expect(
    (await db.recipe.findUniqueOrThrow({ where: { id: recipe.id } }))
      .verificationStatus,
  ).toBe("NONE");
  expect((await verificationQueue({ q: run })).recipes).toHaveLength(0);
  await expect(
    requestVerification(admin, { recipeId: recipe.id }),
  ).rejects.toThrow();
  await expect(
    requestVerification("guest", { recipeId: recipe.id }),
  ).rejects.toThrow();
  await Promise.all([
    requestVerification(owner, {
      recipeId: recipe.id,
      creatorNote: "Please review",
    }),
    requestVerification(owner, { recipeId: recipe.id }),
  ]);
  expect(
    await db.recipeVerificationRequest.count({
      where: { recipeId: recipe.id, status: "PENDING" },
    }),
  ).toBe(1);
  expect((await verificationQueue({ q: `review_${run}` })).recipes[0].id).toBe(
    recipe.id,
  );
  await saveUserRecipe(owner, {
    ...input(),
    id: recipe.id,
    imageReceipt: undefined,
  });
  expect(
    (await db.recipe.findUniqueOrThrow({ where: { id: recipe.id } }))
      .verificationStatus,
  ).toBe("PENDING");
  await saveUserRecipe(owner, {
    ...input(),
    id: recipe.id,
    status: "ARCHIVED",
    imageReceipt: undefined,
  });
  expect(
    await db.recipeVerificationRequest.count({
      where: { recipeId: recipe.id, status: "PENDING" },
    }),
  ).toBe(0);
  expect((await verificationQueue({ q: run })).recipes).toHaveLength(0);
});
it("requires author feedback, separates private notes, and requires edits before resubmission", async () => {
  const recipe = await saveUserRecipe(owner, input());
  await requestVerification(owner, { recipeId: recipe.id });
  const current = await db.recipe.findUniqueOrThrow({
    where: { id: recipe.id },
  });
  const decision = {
    recipeId: recipe.id,
    updatedAt: current.updatedAt.toISOString(),
    targetStatus: "REJECTED",
    note: "Internal only",
  };
  await expect(reviewRecipe(admin, decision)).rejects.toThrow();
  await reviewRecipe(admin, {
    ...decision,
    creatorMessage: "Clarify the quantities.",
  });
  const audit = await db.moderationAction.findFirstOrThrow({
    where: { recipeId: recipe.id },
  });
  expect(audit).toMatchObject({
    note: "Internal only",
    creatorMessage: "Clarify the quantities.",
  });
  expect(
    (await verificationQueue({ status: "REJECTED", q: run })).recipes[0].id,
  ).toBe(recipe.id);
  await expect(
    requestVerification(owner, { recipeId: recipe.id }),
  ).rejects.toThrow();
  await saveUserRecipe(owner, {
    ...input(),
    id: recipe.id,
    imageReceipt: undefined,
    title: `Updated ${run}`,
  });
  await requestVerification(owner, { recipeId: recipe.id });
  expect(
    await db.recipeVerificationRequest.count({
      where: { recipeId: recipe.id },
    }),
  ).toBe(2);
  await db.user.update({ where: { id: owner }, data: { status: "SUSPENDED" } });
  await expect(
    requestVerification(owner, { recipeId: recipe.id }),
  ).rejects.toThrow();
  await db.user.update({ where: { id: owner }, data: { status: "ACTIVE" } });
});
it("automatically approves only Studio publications and audits material edits", async () => {
  const recipe = await saveAdminRecipe(admin, {
    ...input(admin),
    status: "DRAFT",
  });
  expect(
    (await db.recipe.findUniqueOrThrow({ where: { id: recipe.id } }))
      .verificationStatus,
  ).toBe("NONE");
  await saveAdminRecipe(admin, {
    ...input(admin),
    id: recipe.id,
    imageReceipt: undefined,
  });
  await saveAdminRecipe(admin, {
    ...input(admin),
    id: recipe.id,
    imageReceipt: undefined,
  });
  expect(
    await db.moderationAction.count({ where: { recipeId: recipe.id } }),
  ).toBe(1);
  await saveAdminRecipe(admin, {
    ...input(admin),
    id: recipe.id,
    imageReceipt: undefined,
    title: "An updated editorial recipe",
  });
  expect(
    (await db.recipe.findUniqueOrThrow({ where: { id: recipe.id } }))
      .verificationStatus,
  ).toBe("VERIFIED");
  expect(
    await db.moderationAction.count({ where: { recipeId: recipe.id } }),
  ).toBe(2);
  await expect(
    requestVerification(owner, { recipeId: recipe.id }),
  ).rejects.toThrow();
  expect(
    (await verificationQueue({ status: "VERIFIED" })).recipes.some(
      (row) => row.id === recipe.id,
    ),
  ).toBe(false);
});
it("previews editorial backfill, rejects stale confirmations and is repeat safe", async () => {
  const recipe = await saveAdminRecipe(admin, input(admin));
  await db.recipe.update({
    where: { id: recipe.id },
    data: { verificationStatus: "NONE" },
  });
  const client = new pg.Client({
    connectionString: process.env.TEST_DATABASE_URL,
  });
  await client.connect();
  try {
    const email = `review-admin-${run}@example.test`;
    const preview = await approveEditorial(client, email);
    expect(
      preview.targets.some((row: { id: string }) => row.id === recipe.id),
    ).toBe(true);
    await expect(
      approveEditorial(client, email, "wrong-snapshot"),
    ).rejects.toThrow();
    await approveEditorial(client, email, preview.confirmation);
    const next = await approveEditorial(client, email);
    expect(
      (await approveEditorial(client, email, next.confirmation)).verified,
    ).toBe(0);
    const row = await db.recipe.findUniqueOrThrow({ where: { id: recipe.id } });
    expect(row).toMatchObject({
      verificationStatus: "VERIFIED",
      title: input(admin).title,
      authorId: admin,
    });
  } finally {
    await client.end();
  }
});
it("caps successful requests at ten per rolling day", async () => {
  const count = await db.recipeVerificationRequest.count({
    where: { requestedById: owner },
  });
  for (let i = count; i < 10; i++) {
    const recipe = await saveUserRecipe(owner, input());
    await requestVerification(owner, { recipeId: recipe.id });
  }
  const extra = await saveUserRecipe(owner, input());
  await expect(
    requestVerification(owner, { recipeId: extra.id }),
  ).rejects.toMatchObject({ code: "limit" });
  expect(
    (await db.recipe.findUniqueOrThrow({ where: { id: extra.id } }))
      .verificationStatus,
  ).toBe("NONE");
});

it("paginates the queue oldest first and searches without exposing unrelated recipes", async () => {
  const rows = [];
  for (let index = 0; index < 13; index++) {
    const row = await saveUserRecipe(owner, {
      ...input(),
      title: `Paging ${run} ${index}`,
    });
    await db.recipe.update({
      where: { id: row.id },
      data: { verificationStatus: "PENDING" },
    });
    await db.recipeVerificationRequest.create({
      data: {
        recipeId: row.id,
        requestedById: owner,
        createdAt: new Date(1700000000000 + index * 1000),
      },
    });
    rows.push(row);
  }
  const first = await verificationQueue({ q: `Paging ${run}` });
  const second = await verificationQueue({ q: `Paging ${run}`, page: 2 });
  expect(first.recipes).toHaveLength(12);
  expect(first.hasNext).toBe(true);
  expect(first.recipes[0].id).toBe(rows[0].id);
  expect(second.recipes.map((row) => row.id)).toEqual([rows[12].id]);
  expect(second.hasNext).toBe(false);
  await expect(
    db.recipeVerificationRequest.create({
      data: { recipeId: rows[0].id, requestedById: owner },
    }),
  ).rejects.toMatchObject({ code: "P2002" });
});

it("supports every admin transition, direct approval, atomic audit and admin-initiated requests without author quota", async () => {
  const statuses = ["NONE", "PENDING", "VERIFIED", "REJECTED"] as const;
  const recipe = await saveUserRecipe(owner, input());
  const quota = await db.recipeVerificationRequest.count({
    where: { requestedById: owner },
  });
  for (const from of statuses) {
    for (const targetStatus of statuses.filter((status) => status !== from)) {
      // Fixture setup closes previous test transitions, preserving the unique index.
      await db.recipeVerificationRequest.updateMany({
        where: { recipeId: recipe.id, status: "PENDING" },
        data: { status: "NONE" },
      });
      await db.recipe.update({
        where: { id: recipe.id },
        data: { verificationStatus: from },
      });
      if (from === "PENDING")
        await db.recipeVerificationRequest.create({
          data: { recipeId: recipe.id, requestedById: admin },
        });
      const current = await db.recipe.findUniqueOrThrow({
        where: { id: recipe.id },
      });
      const command = {
        recipeId: recipe.id,
        updatedAt: current.updatedAt.toISOString(),
        targetStatus,
        note: "Private evidence",
        creatorMessage: "Review updated by administrator",
      };
      await reviewRecipe(admin, command);
      const saved = await db.recipe.findUniqueOrThrow({
        where: { id: recipe.id },
      });
      expect(saved).toMatchObject({
        verificationStatus: targetStatus,
        status: "PUBLISHED",
        isHidden: false,
        isEditorial: false,
        authorId: owner,
      });
      const audits = await db.moderationAction.findMany({
        where: { recipeId: recipe.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      expect(audits[0]).toMatchObject({
        actorId: admin,
        previousVerificationStatus: from,
        nextVerificationStatus: targetStatus,
      });
      await expect(reviewRecipe(admin, command)).rejects.toThrow();
      expect(
        await db.moderationAction.count({ where: { recipeId: recipe.id } }),
      ).toBe(audits.length);
      const requests = await db.recipeVerificationRequest.findMany({
        where: { recipeId: recipe.id, status: "PENDING" },
      });
      expect(requests).toHaveLength(targetStatus === "PENDING" ? 1 : 0);
      if (targetStatus === "PENDING")
        expect(requests[0].requestedById).toBe(admin);
    }
  }
  expect(
    await db.recipeVerificationRequest.count({
      where: { requestedById: owner },
    }),
  ).toBe(quota);
});

it("rejects verification on drafts, archives, hidden and editorial recipes", async () => {
  for (const overrides of [
    { status: "DRAFT" as const },
    { status: "ARCHIVED" as const },
    { isHidden: true },
    { isEditorial: true },
  ]) {
    const recipe = await saveUserRecipe(owner, input());
    const row = await db.recipe.update({
      where: { id: recipe.id },
      data: overrides,
    });
    await expect(
      reviewRecipe(admin, {
        recipeId: row.id,
        updatedAt: row.updatedAt.toISOString(),
        targetStatus: "VERIFIED",
        note: "",
      }),
    ).rejects.toThrow();
    expect(
      await db.moderationAction.count({ where: { recipeId: row.id } }),
    ).toBe(0);
  }
});

it("preserves administrator initiation when reviewing own former community content and after role changes", async () => {
  const person = await db.user.create({
    data: { email: `role-change-${run}@example.test` },
  });
  try {
    const recipe = await saveUserRecipe(person.id, input(person.id));
    await db.user.update({ where: { id: person.id }, data: { role: "ADMIN" } });
    for (let i = 0; i < 10; i++)
      for (const targetStatus of ["PENDING", "NONE"] as const) {
        const current = await db.recipe.findUniqueOrThrow({
          where: { id: recipe.id },
        });
        await reviewRecipe(person.id, {
          recipeId: recipe.id,
          updatedAt: current.updatedAt.toISOString(),
          targetStatus,
          creatorMessage: "Administrative reassessment",
          note: "",
        });
      }
    expect(
      await db.recipeVerificationRequest.count({
        where: { recipeId: recipe.id, initiatedByAdmin: true },
      }),
    ).toBe(10);
    await db.user.update({ where: { id: person.id }, data: { role: "USER" } });
    await requestVerification(person.id, { recipeId: recipe.id });
    expect(
      await db.recipeVerificationRequest.count({
        where: { recipeId: recipe.id, initiatedByAdmin: false },
      }),
    ).toBe(1);
  } finally {
    await db.moderationAction.deleteMany({ where: { actorId: person.id } });
    await db.user.delete({ where: { id: person.id } });
  }
});
