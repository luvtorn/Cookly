import { describe, expect, it } from "vitest";

import { readServerEnvironment, requireDatabaseUrl } from "./environment";

describe("server environment", () => {
  it.each([undefined, "", "   "])(
    "allows an absent database during foundation checks (%s)",
    (DATABASE_URL) => {
      expect(
        readServerEnvironment({ DATABASE_URL }).DATABASE_URL,
      ).toBeUndefined();
      expect(() => requireDatabaseUrl({ DATABASE_URL })).toThrow(
        "DATABASE_URL is required for database operations.",
      );
    },
  );

  it.each([
    "postgresql://localhost:5432/cookly",
    "postgres://user:example%40password@db.example.test/cookly?sslmode=require",
  ])("accepts PostgreSQL connection URLs", (DATABASE_URL) => {
    expect(requireDatabaseUrl({ DATABASE_URL })).toBe(DATABASE_URL);
  });

  it.each([
    "not-a-url",
    "mysql://user:secret@localhost/cookly",
    "https://db.example.test/cookly",
    "postgresql:///cookly",
    "postgresql://localhost",
    "postgresql://localhost/cookly#fragment",
  ])("rejects malformed or non-PostgreSQL URLs", (DATABASE_URL) => {
    expect(() => readServerEnvironment({ DATABASE_URL })).toThrow(
      "Invalid environment variables: DATABASE_URL.",
    );
  });

  it("does not expose inputs or nested validation errors", () => {
    let caught: unknown;
    try {
      readServerEnvironment({
        DATABASE_URL: "mysql://user:private-password@private-host/cookly",
        NEXT_PUBLIC_APP_URL: "invalid-private-url",
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    if (!(caught instanceof Error))
      throw new Error("Expected validation failure");
    expect(caught.message).toBe(
      "Invalid environment variables: DATABASE_URL, NEXT_PUBLIC_APP_URL.",
    );
    expect(caught.cause).toBeUndefined();
    expect(caught.stack).not.toContain("private-password");
    expect(caught.stack).not.toContain("private-host");
    expect(caught.stack).not.toContain("invalid-private-url");
  });

  it("keeps authentication optional and strips unrelated environment keys", () => {
    expect(
      readServerEnvironment({ AUTH_SECRET: "", UNRELATED: "ignored" }),
    ).toEqual({
      AUTH_SECRET: undefined,
    });
  });

  it.each(["http://localhost:3000", "https://cookly.example.test"])(
    "accepts an HTTP(S) app URL",
    (NEXT_PUBLIC_APP_URL) => {
      expect(
        readServerEnvironment({ NEXT_PUBLIC_APP_URL }).NEXT_PUBLIC_APP_URL,
      ).toBe(NEXT_PUBLIC_APP_URL);
    },
  );

  it("rejects an app URL with a non-HTTP protocol", () => {
    expect(() =>
      readServerEnvironment({ NEXT_PUBLIC_APP_URL: "ftp://example.test" }),
    ).toThrow("Invalid environment variables: NEXT_PUBLIC_APP_URL.");
  });
});
