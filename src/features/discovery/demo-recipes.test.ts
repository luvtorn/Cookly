import { describe, expect, it } from "vitest";
import { getPreviewRecipes } from "./demo-recipes";

describe("presentation-only recipe filtering", () => {
  it("shows four community fixtures by default", () => {
    expect(getPreviewRecipes({}).recipes).toHaveLength(4);
    expect(getPreviewRecipes({}).isFiltered).toBe(false);
  });
  it("searches titles case-insensitively, including the hero recipe", () => {
    expect(
      getPreviewRecipes({ q: " PASTA " }).recipes.map((r) => r.id),
    ).toEqual(["lemon-pasta"]);
  });
  it("filters by category and search together", () => {
    expect(getPreviewRecipes({ category: "vegetarian" }).recipes).toHaveLength(
      3,
    );
    expect(
      getPreviewRecipes({ category: "vegetarian", q: "salmon" }).recipes,
    ).toHaveLength(0);
  });
  it("keeps the 30-minute collection accurate", () => {
    expect(
      getPreviewRecipes({ category: "quick" }).recipes.every(
        (r) => r.minutes <= 30,
      ),
    ).toBe(true);
  });
  it("safely defaults invalid, repeated and oversized query values", () => {
    expect(
      getPreviewRecipes({ q: ["salmon", "pasta"], category: "invalid" })
        .isFiltered,
    ).toBe(false);
    expect(getPreviewRecipes({ q: "x".repeat(101) }).q).toBe("");
  });
});
