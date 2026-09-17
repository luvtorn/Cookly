// @vitest-environment node

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const files = {
  ".env": "base",
  ".env.local": "local",
  ".env.development": "development",
  ".env.production": "production",
  ".env.test": "test",
};

describe("Next.js environment loading used by Prisma", () => {
  let fixtureDirectory: string;

  beforeAll(() => {
    fixtureDirectory = mkdtempSync(join(tmpdir(), "cookly-env-test-"));
    for (const [name, value] of Object.entries(files)) {
      writeFileSync(
        join(fixtureDirectory, name),
        `COOKLY_ENV_TEST_VALUE=${value}\n`,
      );
    }
  });

  afterAll(() => {
    for (const name of Object.keys(files))
      unlinkSync(join(fixtureDirectory, name));
    rmdirSync(fixtureDirectory);
  });

  it.each([
    ["development", "", "local"],
    ["production", "", "local"],
    ["test", "", "test"],
    ["development", "process", "process"],
  ] as const)(
    "loads %s with process override '%s'",
    (mode, override, expected) => {
      const environment: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: mode };
      delete environment.__NEXT_PROCESSED_ENV;
      delete environment.COOKLY_ENV_TEST_VALUE;
      if (override) environment.COOKLY_ENV_TEST_VALUE = override;

      const result = execFileSync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          'import nextEnv from "@next/env"; nextEnv.loadEnvConfig(process.argv[1], process.env.NODE_ENV !== "production"); process.stdout.write(process.env.COOKLY_ENV_TEST_VALUE ?? "missing");',
          fixtureDirectory,
        ],
        { env: environment, encoding: "utf8" },
      );

      expect(result).toBe(expected);
    },
  );
});
