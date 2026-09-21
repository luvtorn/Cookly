import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import { authenticate, register } from "@/features/auth/service";
import { clientAddress, consumeLimit } from "@/lib/auth/rate-limit";

const run = randomUUID().replaceAll("-", "").slice(0, 12);
const input = {
  email: `tests+${run}@example.test`,
  username: `test_${run}`,
  displayName: "Integration Cook",
  password: "long integration passphrase",
  confirmation: "long integration passphrase",
};
const db = getDb();
afterAll(async () => {
  await db.user.deleteMany({
    where: { email: { startsWith: `tests+${run}` } },
  });
  await db.$disconnect();
});
describe("real PostgreSQL authentication", () => {
  it("creates one atomic USER/Profile and handles a duplicate race", async () => {
    const results = await Promise.allSettled([
      register(input, `${run}-a`),
      register(input, `${run}-b`),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(await db.user.count({ where: { email: input.email } })).toBe(1);
    const user = await db.user.findUniqueOrThrow({
      where: { email: input.email },
      include: { profile: true },
    });
    expect(user).toMatchObject({
      role: "USER",
      status: "ACTIVE",
      emailVerified: null,
      profile: { username: input.username },
    });
    expect(user.passwordHash).not.toContain(input.password);
  });
  it("rolls back User creation when a nested profile collides", async () => {
    const email = `tests+${run}-rollback@example.test`;
    await expect(
      db.user.create({
        data: {
          email,
          profile: {
            create: { username: input.username, displayName: "Collision" },
          },
        },
      }),
    ).rejects.toThrow();
    expect(await db.user.count({ where: { email } })).toBe(0);
  });
  it("authenticates without exposing password, email or role", async () => {
    const result = await authenticate(input, run);
    expect(result).toMatchObject({ name: input.displayName });
    expect(Object.keys(result ?? {}).sort()).toEqual(["id", "name"]);
    expect(await authenticate({ ...input, password: "wrong" }, run)).toBeNull();
    expect(
      await authenticate({ ...input, email: "absent@example.test" }, run),
    ).toBeNull();
  });
  it("denies suspended, banned and passwordless users", async () => {
    for (const status of ["SUSPENDED", "BANNED"] as const) {
      await db.user.update({ where: { email: input.email }, data: { status } });
      expect(await authenticate(input, run)).toBeNull();
    }
    await db.user.update({
      where: { email: input.email },
      data: { status: "ACTIVE", passwordHash: null },
    });
    expect(await authenticate(input, run)).toBeNull();
  });
  it("counts concurrent attempts atomically, hides identities and expires windows", async () => {
    const identity = `${run}-rate-limit`;
    const results = await Promise.all(
      Array.from({ length: 12 }, () => consumeLimit("test", identity, 10, 900)),
    );
    expect(results.filter(Boolean)).toHaveLength(10);
    const records = await db.authRateLimit.findMany();
    expect(records.every(({ key }) => /^[a-f0-9]{64}$/.test(key))).toBe(true);
    const short = `${run}-expiry`;
    expect(await consumeLimit("test", short, 1, 0)).toBe(true);
    expect(await consumeLimit("test", short, 1, 0)).toBe(true);
  });
  it("ignores untrusted forwarded addresses", () => {
    expect(
      clientAddress({
        "x-forwarded-for": "1.2.3.4",
        "x-vercel-forwarded-for": "1.2.3.4",
      }),
    ).toBe("shared-fallback");
  });
});
