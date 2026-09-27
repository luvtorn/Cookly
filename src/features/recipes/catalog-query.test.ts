import { describe, expect, it } from "vitest";
import {
  catalogQuerySchema,
  catalogUrl,
  catalogReturn,
  legacyCatalogUrl,
} from "./catalog-query";
import { verificationSchema } from "@/features/moderation/schema";
describe("catalog URL boundaries", () => {
  it("normalizes filters and bounds pagination", () => {
    expect(
      catalogQuerySchema.parse({ q: " pasta ", page: "2", maxTime: "30" }),
    ).toEqual({ q: "pasta", page: 2, maxTime: 30 });
    expect(
      catalogQuerySchema.parse({
        q: ["x"],
        page: -1,
        maxTime: "",
        difficulty: "admin",
      }),
    ).toMatchObject({
      q: "",
      page: 1,
      maxTime: undefined,
      difficulty: undefined,
    });
  });
  it("preserves filters and rejects foreign return URLs", () => {
    const url = catalogUrl({ q: "rice & beans", category: "bowls", page: 2 });
    expect(catalogReturn(url)).toBe(url);
    expect(catalogReturn(`/en${url}`)).toBe(url);
    expect(catalogReturn(`/ru${url}`)).toBe(url);
    expect(catalogReturn(`/pl${url}`)).toBe(url);
    for (const bad of [
      "//evil.test",
      "https://evil.test",
      "/recipes/slug",
      "/recipes-evil",
      ["/recipes"],
    ])
      expect(catalogReturn(bad)).toBe("/recipes");
    expect(legacyCatalogUrl({ category: "vegetarian" })).toBe(
      "/recipes?tag=vegetarian",
    );
    expect(legacyCatalogUrl({ category: "desserts" })).toBe(
      "/recipes?category=desserts",
    );
  });
  it("requires private reasons for rejection and revocation", () => {
    const base = {
      recipeId: "recipe",
      updatedAt: new Date().toISOString(),
      note: "",
    };
    expect(
      verificationSchema.safeParse({ ...base, decision: "VERIFY" }).success,
    ).toBe(true);
    for (const decision of ["REJECT", "REVOKE"])
      expect(verificationSchema.safeParse({ ...base, decision }).success).toBe(
        false,
      );
    expect(
      verificationSchema.safeParse({
        ...base,
        decision: "VERIFY",
        actorId: "forged",
      }).success,
    ).toBe(false);
  });
});
