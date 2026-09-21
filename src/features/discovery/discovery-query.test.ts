import { describe, expect, it } from "vitest";
import { discoveryQuerySchema } from "./discovery-query";

describe("discovery URL state", () => {
  it("defaults missing values", () => {
    expect(discoveryQuerySchema.parse({})).toEqual({ q: "", page: 1 });
  });
  it("trims searches and preserves supported categories", () => {
    expect(
      discoveryQuerySchema.parse({ q: " pasta ", category: "quick" }),
    ).toEqual({ q: "pasta", category: "quick", page: 1 });
  });
  it("rejects repeated, oversized and invalid values safely", () => {
    expect(
      discoveryQuerySchema.parse({ q: ["a", "b"], category: "invalid" }),
    ).toEqual({ q: "", category: undefined, page: 1 });
    expect(discoveryQuerySchema.parse({ q: "x".repeat(101) }).q).toBe("");
  });
});
