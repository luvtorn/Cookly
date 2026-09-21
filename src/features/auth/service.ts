import "server-only";
import { getDb } from "@/lib/db/client";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { consumeLimit } from "@/lib/auth/rate-limit";
import { signInSchema, signUpSchema } from "./schema";

export async function authenticate(input: unknown, ip: string) {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;
  // Stop at the IP limit before allocating more per-address buckets.
  if (!(await consumeLimit("login-ip", ip, 50, 900))) return null;
  if (!(await consumeLimit("login-email", email, 10, 900))) return null;
  const user = await getDb().user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { profile: true },
  });
  const valid = await verifyPassword(password, user?.passwordHash ?? null);
  if (!valid || !user || user.status !== "ACTIVE") return null;
  return { id: user.id, name: user.profile?.displayName ?? "Cookly member" };
}
export async function register(input: unknown, ip: string) {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, message: "Please check your details." };
  if (!(await consumeLimit("signup-ip", ip, 5, 3600)))
    return { success: false as const, message: "Please try again later." };
  const { email, username, displayName, password } = parsed.data;
  const passwordHash = await hashPassword(password);
  await getDb().$transaction(async (tx) => {
    const duplicate = await tx.user.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: "insensitive" } },
          { profile: { username: { equals: username, mode: "insensitive" } } },
        ],
      },
      select: { id: true },
    });
    if (duplicate) throw new Error("Registration unavailable");
    await tx.user.create({
      data: {
        email,
        passwordHash,
        role: "USER",
        status: "ACTIVE",
        profile: { create: { username, displayName } },
      },
    });
  });
  return { success: true as const };
}
