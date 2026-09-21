import { describe, expect, it } from "vitest";
import { safeCallback, signUpSchema } from "./schema";
const valid = {
  displayName: " Cook ",
  username: "Cook_123",
  email: " COOK@example.com ",
  password: " a very long passphrase ",
  confirmation: " a very long passphrase ",
};
describe("registration validation", () => {
  it("normalizes identity but never trims passwords", () => {
    expect(signUpSchema.parse(valid)).toMatchObject({
      displayName: "Cook",
      username: "cook_123",
      email: "cook@example.com",
      password: valid.password,
    });
  });
  it.each(["ab", "not-a-user", "кириллица", "x".repeat(31)])(
    "rejects username %s",
    (username) =>
      expect(signUpSchema.safeParse({ ...valid, username }).success).toBe(
        false,
      ),
  );
  it("rejects short, long and mismatched passwords", () => {
    for (const password of ["short", "x".repeat(129)])
      expect(
        signUpSchema.safeParse({ ...valid, password, confirmation: password })
          .success,
      ).toBe(false);
    expect(
      signUpSchema.safeParse({ ...valid, confirmation: "different" }).success,
    ).toBe(false);
  });
  it("strips privilege fields", () =>
    expect(
      signUpSchema.parse({ ...valid, role: "ADMIN", id: "chosen" }),
    ).not.toHaveProperty("role"));
});
describe("safe return destinations", () => {
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/auth/sign-in",
    "/api/auth/signout",
    "/%61uth/sign-up",
    "/%2f%2fevil.test",
    "/x/../auth/sign-in",
    " /settings",
    "/%zz",
  ])("rejects %s", (value) => expect(safeCallback(value)).toBe("/"));
  it("preserves internal paths", () =>
    expect(safeCallback("/settings/account?tab=1#name")).toBe(
      "/settings/account?tab=1#name",
    ));
});
