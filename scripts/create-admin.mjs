import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { hashPassword } from "../src/lib/auth/password.ts";
import { editorialDatabase, argument } from "./editorial-database.mjs";

export async function createAdmin(client, email, username = "cookly-admin") {
  email = z.email().parse(email.trim().toLowerCase());
  if (!/^[a-z0-9_-]{3,30}$/.test(username))
    throw new Error("Invalid administrator username.");
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock(729415026)");
    const conflict = await client.query(
      'SELECT id FROM "User" WHERE lower(trim(email))=$1 UNION ALL SELECT "userId" FROM "Profile" WHERE lower(trim(username))=$2',
      [email, username],
    );
    if (conflict.rowCount)
      throw new Error(
        "An identity already exists. No role or password was changed.",
      );
    const id = randomUUID(),
      password = randomBytes(24).toString("base64url");
    const hash = await hashPassword(password);
    await client.query(
      'INSERT INTO "User" (id,email,"passwordHash",role,status,"updatedAt") VALUES ($1,$2,$3,\'ADMIN\',\'ACTIVE\',CURRENT_TIMESTAMP)',
      [id, email, hash],
    );
    await client.query(
      'INSERT INTO "Profile" (id,"userId",username,"displayName","updatedAt") VALUES ($1,$2,$3,\'Cookly Editor\',CURRENT_TIMESTAMP)',
      [randomUUID(), id, username],
    );
    await client.query("COMMIT");
    return { email, password };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/create-admin.mjs")) {
  let client;
  try {
    const email = argument("--email");
    if (!email) throw new Error("Pass --email for the administrator.");
    if (!process.argv.includes("--show-credentials"))
      throw new Error(
        "Explicit credential handoff is required before creation.",
      );
    client = await editorialDatabase();
    const credentials = await createAdmin(client, email);
    // Explicit one-time operator handoff, never application logging or a file.
    process.stdout.write(JSON.stringify(credentials));
  } catch (error) {
    console.error(
      error instanceof Error && error.message.startsWith("An identity")
        ? error.message
        : "Administrator provisioning failed. No credentials are shown.",
    );
    process.exitCode = 1;
  } finally {
    await client?.end();
  }
}
