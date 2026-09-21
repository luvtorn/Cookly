import path from "node:path";
import { defineConfig } from "vitest/config";

const url = process.env.TEST_DATABASE_URL;
if (
  !url ||
  !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname) ||
  new URL(url).pathname !== "/cookly_test"
)
  throw new Error(
    "Set TEST_DATABASE_URL to an isolated loopback cookly_test database.",
  );
process.env.DATABASE_URL = url;
process.env.AUTH_SECRET = "cookly-isolated-integration-test-secret-only";
delete process.env.VERCEL;
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve("src"),
      "server-only": path.resolve("tests/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20000,
  },
});
