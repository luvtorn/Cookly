import { defineConfig, devices } from "@playwright/test";
import { randomBytes } from "node:crypto";

const database = process.env.TEST_DATABASE_URL;
if (
  !database ||
  !["localhost", "127.0.0.1", "[::1]"].includes(new URL(database).hostname) ||
  new URL(database).pathname !== "/cookly_test"
)
  throw new Error(
    "Auth E2E requires isolated loopback TEST_DATABASE_URL (cookly_test).",
  );
export default defineConfig({
  testDir: "./tests/auth-e2e",
  outputDir: "./test-results/auth",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://localhost:3101",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  reporter: [["list"]],
  webServer: {
    command:
      "node node_modules/next/dist/bin/next start --hostname localhost --port 3101",
    url: "http://localhost:3101",
    reuseExistingServer: false,
    env: {
      DATABASE_URL: database,
      AUTH_SECRET: randomBytes(32).toString("hex"),
      NEXTAUTH_URL: "http://localhost:3101",
      VERCEL: "",
    },
  },
});
