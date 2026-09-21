import nextEnv from "@next/env";
import pg from "pg";
import { testDatabaseUrl } from "./test-database.mjs";

export async function editorialDatabase() {
  nextEnv.loadEnvConfig(process.cwd(), true);
  const test = process.argv.includes("--test");
  if (!test && !process.argv.includes("--confirm-target"))
    throw new Error(
      "Inspect your configured database, then explicitly pass --confirm-target; use --test for isolated tests.",
    );
  const connectionString = test ? testDatabaseUrl() : process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 10000,
  });
  await client.connect();
  return client;
}
export function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
