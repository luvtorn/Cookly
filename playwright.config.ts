import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results/offline",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command:
      "node ./node_modules/next/dist/bin/next start --hostname localhost --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    env: {
      DATABASE_URL: "",
      AUTH_SECRET: "",
      NEXTAUTH_URL: "http://localhost:3100",
    },
  },
});
