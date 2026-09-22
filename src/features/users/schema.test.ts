import { describe, expect, it } from "vitest";
import { profileSchema } from "./schema";

describe("profile boundary", () => {
  it("normalizes username and trims public text", () => {
    expect(
      profileSchema.parse({
        displayName: "  Home Cook  ",
        username: "  COOK_123  ",
        bio: "  Seasonal food.  ",
        location: "  Warsaw  ",
      }),
    ).toEqual({
      displayName: "Home Cook",
      username: "cook_123",
      bio: "Seasonal food.",
      location: "Warsaw",
    });
  });

  it("rejects roles, invalid usernames and oversized public fields", () => {
    const valid = {
      displayName: "Home Cook",
      username: "home_cook",
      bio: "Good food.",
      location: "Warsaw",
    };
    expect(profileSchema.safeParse({ ...valid, role: "ADMIN" }).success).toBe(
      false,
    );
    expect(
      profileSchema.safeParse({ ...valid, username: "bad-name" }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({ ...valid, bio: "x".repeat(501) }).success,
    ).toBe(false);
  });
});
