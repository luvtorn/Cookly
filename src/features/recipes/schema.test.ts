import { describe, expect, it, vi } from "vitest";
import { recipeSchema, normalizeIngredient } from "./schema";
import {
  imageFormat,
  signImageReceipt,
  verifyImageReceipt,
} from "@/lib/storage/image-receipt";
import { publicCard } from "./repository";
const input = {
  title: "Test recipe",
  description: "An original recipe.",
  servings: 2,
  prepMinutes: 10,
  cookMinutes: 20,
  difficulty: "EASY",
  status: "DRAFT",
  categoryId: "category",
  cuisineId: "",
  tagIds: [],
  coverImageIsAi: false,
  ingredients: [
    {
      name: "  Chicken   Breast ",
      amount: "1.25",
      unit: "g",
      note: "",
      isOptional: false,
    },
  ],
  steps: [{ instruction: "Cook thoroughly." }],
};
describe("editorial recipe boundaries", () => {
  it("normalizes ingredients and validates sensible limits", () => {
    expect(recipeSchema.parse(input).ingredients[0].name).toBe(
      "chicken breast",
    );
    expect(normalizeIngredient("  Red   lentils ")).toBe("red lentils");
    for (const patch of [
      { servings: 0 },
      { cookMinutes: -1 },
      { steps: [] },
      { ingredients: [] },
      { role: "ADMIN" },
      { authorId: "someone" },
      { coverImageUrl: "https://attacker.test/image" },
      { isEditorial: true },
    ])
      expect(recipeSchema.safeParse({ ...input, ...patch }).success).toBe(
        false,
      );
  });
  it("rejects invalid amounts", () => {
    for (const amount of ["-1", "NaN", "1.234", "0", "999999999"])
      expect(
        recipeSchema.safeParse({
          ...input,
          ingredients: [{ ...input.ingredients[0], amount }],
        }).success,
      ).toBe(false);
  });
  it("binds uploaded covers to the administrator, integrity and expiry", () => {
    vi.stubEnv("AUTH_SECRET", "isolated-receipt-test-secret-at-least-32");
    const token = signImageReceipt(
      "admin",
      "cover-key",
      "https://res.cloudinary.com/test/image/upload/cover",
      100,
    );
    expect(verifyImageReceipt(token, "admin", 101).coverImageKey).toBe(
      "cover-key",
    );
    expect(() => verifyImageReceipt(token, "other", 101)).toThrow();
    expect(() => verifyImageReceipt(token, "admin", 1800100)).toThrow();
    expect(() => verifyImageReceipt(token + "x", "admin", 101)).toThrow();
    vi.unstubAllEnvs();
  });
  it("rejects SVG and disguised non-image bytes", () => {
    expect(
      imageFormat(
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
      ),
    ).toBeNull();
    expect(imageFormat(Buffer.alloc(50))).toBeNull();
    expect(
      imageFormat(Buffer.from([255, 216, 255, ...Array(20).fill(0)])),
    ).toBe("jpeg");
  });
  it("strips editorial author identity from public DTOs", () => {
    const row = {
      id: "recipe",
      slug: "recipe",
      title: "Recipe",
      description: "Description",
      coverImageUrl: "image",
      prepMinutes: 1,
      cookMinutes: 2,
      isEditorial: true,
      category: { name: "Soup" },
      author: { profile: { displayName: "Private administrator" } },
    };
    const card = publicCard(row);
    expect(card.author).toBe("Cookly");
    expect(card.initials).toBe("");
    expect(JSON.stringify(card)).not.toContain("Private administrator");
    expect(publicCard({ ...row, isEditorial: false }).author).toBe(
      "Private administrator",
    );
  });
});
