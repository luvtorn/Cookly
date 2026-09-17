import nextEnv from "@next/env";

import { requireDatabaseUrl } from "../src/lib/validation/environment.ts";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

try {
  requireDatabaseUrl(process.env);
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Invalid database configuration.",
  );
  process.exitCode = 1;
}
