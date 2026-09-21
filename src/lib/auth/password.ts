import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const prefix = "scrypt-v1";
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(
      password,
      salt,
      64,
      {
        N: 131072,
        r: 8,
        p: 1,
        maxmem: 256 * 1024 * 1024,
      },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `${prefix}$${salt.toString("hex")}$${(await derive(password, salt)).toString("hex")}`;
}
// A valid-cost dummy record ensures absent/unsupported password records do work.
const dummy = `${prefix}$${"00".repeat(16)}$${"00".repeat(64)}`;
export async function verifyPassword(password: string, encoded: string | null) {
  const valid =
    typeof encoded === "string" &&
    /^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(encoded);
  const [, salt, expected] = (valid ? encoded : dummy).split("$");
  const actual = await derive(password, Buffer.from(salt, "hex"));
  return timingSafeEqual(actual, Buffer.from(expected, "hex")) && valid;
}
