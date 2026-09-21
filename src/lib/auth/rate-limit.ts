import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { getDb } from "@/lib/db/client";
import { requireAuthSecret } from "@/lib/validation/environment";

export function clientAddress(headers: Record<string, unknown>): string {
  const value = headers["x-vercel-forwarded-for"];
  if (process.env.VERCEL !== "1" || typeof value !== "string" || !isIP(value))
    return "shared-fallback";
  return isIP(value) === 6 ? new URL(`http://[${value}]`).hostname : value;
}
export async function consumeLimit(
  scope: string,
  identity: string,
  maximum: number,
  seconds: number,
) {
  const key = createHmac("sha256", requireAuthSecret(process.env))
    .update(`${scope}:${identity}`)
    .digest("hex");
  const db = getDb();
  const rows = await db.$queryRaw<{ attempts: number }[]>`
    INSERT INTO "AuthRateLimit" ("key", "attempts", "expiresAt")
    VALUES (${key}, 1, CURRENT_TIMESTAMP + ${seconds} * INTERVAL '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "AuthRateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN 1 ELSE "AuthRateLimit"."attempts" + 1 END,
      "expiresAt" = CASE WHEN "AuthRateLimit"."expiresAt" <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP + ${seconds} * INTERVAL '1 second' ELSE "AuthRateLimit"."expiresAt" END
    RETURNING "attempts"`;
  // Recheck expiry on the outer row so concurrent window renewal cannot be deleted.
  await db.$executeRaw`DELETE FROM "AuthRateLimit" WHERE "expiresAt" < CURRENT_TIMESTAMP AND "key" IN (SELECT "key" FROM "AuthRateLimit" WHERE "expiresAt" < CURRENT_TIMESTAMP ORDER BY "expiresAt" LIMIT 100)`;
  return rows.length === 1 && rows[0].attempts <= maximum;
}
