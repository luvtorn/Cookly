import nextEnv from "@next/env";
import { defineConfig } from "prisma/config";

import { readServerEnvironment } from "./src/lib/validation/environment";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const { DATABASE_URL } = readServerEnvironment(process.env);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Validation, generation, and schema-only diffs work without a database.
    // Database commands must supply a real URL; there is no fallback connection.
    url: DATABASE_URL,
  },
});
