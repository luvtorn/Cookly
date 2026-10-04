import { expect, it } from "vitest";
import {
  ingredientMatch,
  ingredientInput,
  pantryQuerySchema,
  pantryUrl,
} from "./schema";
import { catalogReturn } from "@/features/recipes/catalog-query";
import { pantryMessages } from "@/lib/i18n/pantry-messages";

it("counts unique mandatory IDs and separates optional products", () => {
  const rows = [
    { id: "a", name: "Tomato", isOptional: false },
    { id: "a", name: "Tomato", isOptional: false },
    { id: "b", name: "Salt", isOptional: false },
    { id: "a", name: "Tomato", isOptional: true },
    { id: "c", name: "Basil", isOptional: true },
  ];
  expect(ingredientMatch(rows, new Set(["a", "c"]))).toEqual({
    matched: [{ id: "a", name: "Tomato" }],
    missing: [{ id: "b", name: "Salt" }],
    optional: [{ id: "c", name: "Basil" }],
    requiredCount: 2,
    percentage: 50,
  });
  expect(ingredientMatch([], new Set()).percentage).toBe(0);
  expect(ingredientMatch(rows, new Set(["a", "b"])).percentage).toBe(100);
});
it("normalizes filters and accepts only safe pantry return paths", () => {
  expect(
    pantryQuerySchema.parse({
      page: -1,
      maxMissing: "bad",
      maxTime: "",
      difficulty: "bad",
    }),
  ).toEqual({
    maxMissing: "3",
    page: 1,
    maxTime: undefined,
    difficulty: undefined,
  });
  const query = pantryQuerySchema.parse({
    cuisine: "italian",
    maxMissing: "0",
    maxTime: "30",
    page: "2",
  });
  expect(
    pantryQuerySchema.parse(
      Object.fromEntries(new URLSearchParams(pantryUrl(query).split("?")[1])),
    ),
  ).toEqual(query);
  expect(catalogReturn("/ru/pantry?maxMissing=any&page=2")).toBe(
    "/pantry?maxMissing=any&page=2",
  );
  expect(catalogReturn("//evil.test/pantry")).toBe("/recipes");
  expect(
    ingredientInput.safeParse({ ingredientId: "a", userId: "other" }).success,
  ).toBe(false);
});
it("includes all pantry translations", () => {
  expect(Object.keys(pantryMessages.ru)).toEqual(
    Object.keys(pantryMessages.en),
  );
  expect(Object.keys(pantryMessages.pl)).toEqual(
    Object.keys(pantryMessages.en),
  );
});
