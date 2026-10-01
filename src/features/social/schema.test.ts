import { expect, it } from "vitest";
import {
  commentBody,
  commentSchema,
  reactionSchema,
  savedQuery,
  savedUrl,
} from "./schema";
import { catalogReturn } from "@/features/recipes/catalog-query";

it("validates trimmed plain text and explicit reaction state", () => {
  expect(commentBody.parse("  Hello\nworld  ")).toBe("Hello\nworld");
  expect(commentBody.safeParse(" \n ").success).toBe(false);
  expect(commentBody.safeParse("x".repeat(1501)).success).toBe(false);
  expect(commentBody.safeParse("x".repeat(1500)).success).toBe(true);
  expect(
    reactionSchema.safeParse({ recipeId: "id", kind: "like" }).success,
  ).toBe(false);
  expect(
    reactionSchema.parse({
      recipeId: "id",
      kind: "save",
      active: true,
      userId: "spoof",
    }),
  ).not.toHaveProperty("userId");
  expect(
    commentSchema.safeParse({
      operation: "edit",
      recipeId: "id",
      id: "comment",
      body: "hi",
    }).success,
  ).toBe(false);
});
it("preserves only bounded Saved filters in safe return URLs", () => {
  expect(savedUrl(savedQuery.parse({ q: "  soup  ", page: "2" }))).toBe(
    "/saved?q=soup&page=2",
  );
  expect(catalogReturn("/ru/saved?q=soup&page=2&secret=test")).toBe(
    "/saved?q=soup&page=2",
  );
  expect(catalogReturn("//evil.test/saved")).toBe("/recipes");
  expect(catalogReturn("/saved/../../admin")).toBe("/recipes");
  expect(catalogReturn("/pl/saved?view=liked&q=soup&page=2&userId=other")).toBe(
    "/saved?view=liked&q=soup&page=2",
  );
  expect(savedUrl(savedQuery.parse({ view: "invalid" }))).toBe("/saved");
});
