import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { requireAuthSecret } from "@/lib/validation/environment";

const receiptSchema = z.object({
  userId: z.string(),
  key: z.string(),
  url: z.url(),
  expires: z.number(),
});
function signature(payload: string) {
  return createHmac("sha256", requireAuthSecret(process.env))
    .update(`recipe-cover:v1:${payload}`)
    .digest();
}
export function signImageReceipt(
  userId: string,
  key: string,
  url: string,
  now = Date.now(),
) {
  const payload = Buffer.from(
    JSON.stringify({ userId, key, url, expires: now + 30 * 60 * 1000 }),
  ).toString("base64url");
  return `${payload}.${signature(payload).toString("base64url")}`;
}
export function verifyImageReceipt(
  token: string,
  userId: string,
  now = Date.now(),
) {
  const [payload, mac, extra] = token.split(".");
  if (!payload || !mac || extra || token.length > 4000)
    throw new Error("Invalid image receipt.");
  const expected = signature(payload),
    actual = Buffer.from(mac, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    throw new Error("Invalid image receipt.");
  const data = receiptSchema.parse(
    JSON.parse(Buffer.from(payload, "base64url").toString()),
  );
  if (data.userId !== userId || data.expires <= now)
    throw new Error("Image receipt expired or invalid.");
  return { coverImageKey: data.key, coverImageUrl: data.url };
}
export function imageFormat(bytes: Uint8Array): "jpeg" | "png" | "webp" | null {
  const b = Buffer.from(bytes);
  if (b.length >= 12 && b.subarray(0, 3).equals(Buffer.from([255, 216, 255])))
    return "jpeg";
  if (
    b.length >= 24 &&
    b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "png";
  if (
    b.length >= 16 &&
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  )
    return "webp";
  return null;
}
