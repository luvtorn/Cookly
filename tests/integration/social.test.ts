import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
const viewer = vi.hoisted(() => ({ id: "" }));
vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: async () => (viewer.id ? { id: viewer.id } : null),
}));
import { getDb } from "@/lib/db/client";
import { setReaction, changeComment } from "@/features/social/service";
import { readComments, listSaved } from "@/features/social/repository";

const db = getDb();
const run = randomUUID().slice(0, 8);
let owner = "",
  other = "",
  admin = "",
  recipeId = "",
  categoryId = "";
beforeAll(async () => {
  const users = await Promise.all(
    ["owner", "other", "admin"].map((name) =>
      db.user.create({
        data: {
          email: `${name}-${run}@example.test`,
          role: name === "admin" ? "ADMIN" : "USER",
          status: "ACTIVE",
          profile: {
            create: { username: `${name}_${run}`, displayName: name },
          },
        },
      }),
    ),
  );
  [owner, other, admin] = users.map((user) => user.id);
  categoryId = (
    await db.category.create({
      data: { name: `Social ${run}`, slug: `social-${run}` },
    })
  ).id;
  recipeId = (
    await db.recipe.create({
      data: {
        authorId: owner,
        categoryId,
        slug: `social-${run}`,
        title: "Social soup",
        description: "Integration only",
        coverImageUrl: "/images/auth-kitchen.webp",
        servings: 2,
        prepMinutes: 5,
        cookMinutes: 10,
        difficulty: "EASY",
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    })
  ).id;
});
afterAll(async () => {
  await db.user.deleteMany({
    where: { id: { in: [owner, other, admin].filter(Boolean) } },
  });
  if (categoryId) await db.category.delete({ where: { id: categoryId } });
  await db.$disconnect();
});
it("allows own likes and repeated/concurrent desired states without duplicates", async () => {
  const input = { recipeId, kind: "like", active: true };
  await Promise.all([setReaction(owner, input), setReaction(owner, input)]);
  expect(await db.recipeLike.count({ where: { recipeId } })).toBe(1);
  expect(
    (await listSaved(owner, { view: "liked", q: "soup" })).recipes,
  ).toHaveLength(1);
  expect((await listSaved(other, { view: "liked" })).recipes).toHaveLength(0);
  expect((await listSaved(owner, {})).recipes).toHaveLength(0);
  await db.recipe.update({ where: { id: recipeId }, data: { isHidden: true } });
  expect((await listSaved(owner, { view: "liked" })).recipes).toHaveLength(0);
  await db.recipe.update({
    where: { id: recipeId },
    data: { isHidden: false },
  });
  expect((await setReaction(owner, input)).state).toEqual({
    isLiked: true,
    isSaved: false,
    likeCount: 1,
  });
  await setReaction(owner, { ...input, active: false });
  await setReaction(owner, { ...input, active: false });
  expect(await db.recipeLike.count({ where: { recipeId } })).toBe(0);
  expect((await listSaved(owner, { view: "liked" })).recipes).toHaveLength(0);
});
it("isolates saved recipes and excludes hidden content without erasing saved links", async () => {
  await setReaction(owner, { recipeId, kind: "save", active: true });
  expect((await listSaved(owner, { q: "soup", page: 1 })).recipes).toHaveLength(
    1,
  );
  expect((await listSaved(other, { q: "", page: 1 })).recipes).toHaveLength(0);
  await db.recipe.update({ where: { id: recipeId }, data: { isHidden: true } });
  expect((await listSaved(owner, { q: "", page: 1 })).recipes).toHaveLength(0);
  expect(await db.favorite.count({ where: { recipeId } })).toBe(1);
  await expect(
    setReaction(other, { recipeId, kind: "like", active: true }),
  ).rejects.toMatchObject({ code: "UNAVAILABLE" });
  await setReaction(owner, { recipeId, kind: "save", active: false });
  await db.recipe.update({
    where: { id: recipeId },
    data: { isHidden: false },
  });
});
it("checks active status and denies missing users", async () => {
  await expect(
    setReaction("missing", { recipeId, kind: "like", active: true }),
  ).rejects.toMatchObject({ code: "AUTH" });
  await db.user.update({ where: { id: other }, data: { status: "SUSPENDED" } });
  await expect(
    changeComment(other, { operation: "create", recipeId, body: "Blocked" }),
  ).rejects.toMatchObject({ code: "AUTH" });
  await db.user.update({ where: { id: other }, data: { status: "ACTIVE" } });
});
it("edits only owned visible comments, rejects stale edits, and hides deletions", async () => {
  await changeComment(owner, {
    operation: "create",
    recipeId,
    body: "  Nice soup  ",
  });
  const comment = await db.comment.findFirstOrThrow({
    where: { recipeId, userId: owner },
  });
  const edit = {
    operation: "edit",
    recipeId,
    id: comment.id,
    body: "Updated soup",
    updatedAt: comment.updatedAt.toISOString(),
  };
  await expect(changeComment(other, edit)).rejects.toMatchObject({
    code: "UNAVAILABLE",
  });
  await changeComment(owner, { ...edit, body: "Nice soup" });
  expect(
    (await db.comment.findUniqueOrThrow({ where: { id: comment.id } }))
      .updatedAt,
  ).toEqual(comment.updatedAt);
  await changeComment(owner, edit);
  await expect(changeComment(owner, edit)).rejects.toMatchObject({
    code: "CONFLICT",
  });
  await changeComment(owner, { operation: "delete", recipeId, id: comment.id });
  await changeComment(owner, { operation: "delete", recipeId, id: comment.id });
  await expect(changeComment(owner, edit)).rejects.toMatchObject({
    code: "UNAVAILABLE",
  });
  expect(
    (await db.comment.findUniqueOrThrow({ where: { id: comment.id } }))
      .isHidden,
  ).toBe(true);
  expect((await readComments({ recipeId })).count).toBe(0);
});
it("keeps Cookly authorship after role changes and never exposes internal identity", async () => {
  await changeComment(admin, {
    operation: "create",
    recipeId,
    body: "Editorial reply",
  });
  await db.user.update({ where: { id: admin }, data: { role: "USER" } });
  viewer.id = admin;
  const page = await readComments({ recipeId });
  expect(page.items[0]).toMatchObject({
    author: "Cookly",
    username: null,
    avatar: null,
    canEdit: true,
  });
  expect(JSON.stringify(page)).not.toContain(admin);
  expect(JSON.stringify(page)).not.toContain("@example.test");
  viewer.id = "";
  expect((await readComments({ recipeId })).items[0].canEdit).toBe(false);
});
it("paginates comments with stable ties and filters hidden recipes and comments", async () => {
  const now = new Date();
  await db.comment.createMany({
    data: Array.from({ length: 14 }, (_, index) => ({
      userId: owner,
      recipeId,
      body: `Page ${index}`,
      createdAt: now,
      isHidden: index === 0,
    })),
  });
  const first = await readComments({ recipeId });
  const second = await readComments({ recipeId, cursor: first.cursor });
  expect(first.items).toHaveLength(10);
  expect(first.count).toBe(14);
  expect(second.items).toHaveLength(4);
  expect(
    new Set([...first.items, ...second.items].map((item) => item.id)).size,
  ).toBe(14);
  await db.recipe.update({
    where: { id: recipeId },
    data: { status: "ARCHIVED" },
  });
  expect((await readComments({ recipeId })).items).toHaveLength(0);
  await expect(
    changeComment(owner, { operation: "create", recipeId, body: "No" }),
  ).rejects.toMatchObject({ code: "UNAVAILABLE" });
});

it("paginates Saved by saved time and searches only the current owner's list", async () => {
  const rows = await Promise.all(
    Array.from({ length: 13 }, (_, index) =>
      db.recipe.create({
        data: {
          authorId: owner,
          categoryId,
          slug: `saved-${run}-${index}`,
          title: `Saved paging ${index}`,
          description: "Pagination fixture",
          coverImageUrl: "/images/tomato-soup.webp",
          servings: 2,
          prepMinutes: 5,
          cookMinutes: 5,
          difficulty: "EASY",
          status: "PUBLISHED",
        },
      }),
    ),
  );
  await db.favorite.createMany({
    data: rows.map((row, index) => ({
      userId: owner,
      recipeId: row.id,
      createdAt: new Date(1700000000000 + index * 1000),
    })),
  });
  const first = await listSaved(owner, { q: "Saved paging", page: 1 });
  const second = await listSaved(owner, { q: "Saved paging", page: 2 });
  expect(first.recipes).toHaveLength(12);
  expect(first.hasNext).toBe(true);
  expect(first.recipes[0].id).toBe(rows[12].id);
  expect(second.recipes).toHaveLength(1);
  expect(second.hasNext).toBe(false);
  expect(
    (await listSaved(other, { q: "Saved paging", page: 1 })).recipes,
  ).toHaveLength(0);
});
