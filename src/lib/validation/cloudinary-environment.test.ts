import { describe, expect, it } from "vitest";

import { requireCloudinaryOptions } from "./cloudinary-environment";

const valid = {
  CLOUDINARY_CLOUD_NAME: "cookly-test",
  CLOUDINARY_API_KEY: "123456789",
  CLOUDINARY_API_SECRET: "fixture-secret-not-a-real-credential",
};

describe("Cloudinary configuration", () => {
  it("maps credentials to secure, timeout-bounded SDK options", () => {
    expect(requireCloudinaryOptions(valid)).toEqual({
      cloud_name: valid.CLOUDINARY_CLOUD_NAME,
      api_key: valid.CLOUDINARY_API_KEY,
      api_secret: valid.CLOUDINARY_API_SECRET,
      secure: true,
      timeout: 10000,
    });
  });
  it.each([undefined, "", "   "])("rejects a missing secret (%s)", (value) => {
    expect(() =>
      requireCloudinaryOptions({ ...valid, CLOUDINARY_API_SECRET: value }),
    ).toThrow(
      "Missing or invalid environment variables: CLOUDINARY_API_SECRET.",
    );
  });
  it("reports all missing names without credentials", () => {
    expect(() => requireCloudinaryOptions({})).toThrow(
      "Missing or invalid environment variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.",
    );
  });
  it("trims copied values and ignores unrelated variables", () => {
    expect(
      requireCloudinaryOptions({
        ...valid,
        CLOUDINARY_CLOUD_NAME: " cookly-test ",
        UNRELATED: "ignored",
      }),
    ).toEqual(requireCloudinaryOptions(valid));
  });
  it("never exposes invalid inputs or a nested validation error", () => {
    let caught: unknown;
    try {
      requireCloudinaryOptions({
        ...valid,
        CLOUDINARY_CLOUD_NAME: "https://private-host/",
        CLOUDINARY_API_KEY: "private-key",
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    if (!(caught instanceof Error))
      throw new Error("Expected validation failure");
    expect(caught.message).toBe(
      "Missing or invalid environment variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY.",
    );
    expect(caught.cause).toBeUndefined();
    expect(caught.stack).not.toMatch(/private-host|private-key|fixture-secret/);
  });
});
