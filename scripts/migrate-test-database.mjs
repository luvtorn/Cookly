import { spawnSync } from "node:child_process";
import { testDatabaseUrl } from "./test-database.mjs";
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl(),
      AUTH_SECRET: "",
      NEXTAUTH_URL: "http://localhost:3101",
    },
  },
);
process.exitCode = result.status ?? 1;
