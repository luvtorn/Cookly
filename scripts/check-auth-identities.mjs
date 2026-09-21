import nextEnv from "@next/env";
import pg from "pg";
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  statement_timeout: 10000,
});
try {
  await client.connect();
  await client.query("BEGIN READ ONLY");
  for (const [table, field] of [
    ["User", "email"],
    ["Profile", "username"],
  ]) {
    const { rows } = await client.query(
      `SELECT count(*)::int AS count FROM (SELECT lower(trim("${field}")) FROM "${table}" GROUP BY lower(trim("${field}")) HAVING count(*) > 1) AS conflicts`,
    );
    const noncanonical = await client.query(
      `SELECT count(*)::int AS count FROM "${table}" WHERE "${field}" <> lower(trim("${field}"))`,
    );
    console.log(
      `${table}.${field}: ${rows[0].count} normalization conflicts; ${noncanonical.rows[0].count} noncanonical values.`,
    );
    if (rows[0].count || noncanonical.rows[0].count) process.exitCode = 1;
  }
  await client.query("ROLLBACK");
} catch {
  console.error("Identity preflight failed. No data was changed.");
  process.exitCode = 1;
} finally {
  await client.end();
}
