import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testMatch: "glass-fallback.spec.ts",
  testDir: "./tests/browser-compat",
  outputDir: "test-results/glass-fallback",
  timeout: 60_000,
  projects: [
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1448, height: 900 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1448, height: 900 },
        deviceScaleFactor: 1,
      },
    },
  ],
});
