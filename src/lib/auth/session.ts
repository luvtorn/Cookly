import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getAuthConfig } from "./config";
import { getDb } from "@/lib/db/client";
import { safeCallback } from "@/features/auth/schema";

export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  if (
    !jar
      .getAll()
      .some(({ name }) =>
        /^(?:__Secure-)?next-auth\.session-token(?:\.\d+)?$/.test(name),
      )
  )
    return null;
  const session = await getServerSession(getAuthConfig());
  if (!session?.user?.id) return null;
  const user = await getDb().user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      profile: { select: { displayName: true, username: true } },
    },
  });
  return user?.status === "ACTIVE" ? user : null;
});
export async function requireUser(callback = "/settings/account") {
  const user = await getCurrentUser();
  if (!user)
    redirect(
      `/auth/sign-in?callbackUrl=${encodeURIComponent(safeCallback(callback))}`,
    );
  return user;
}
export async function requireModerator() {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "MODERATOR")
    throw new Error("Access denied.");
  return user;
}

export async function requireAdmin(callback = "/admin") {
  const user = await requireUser(callback);
  if (user.role !== "ADMIN") redirect("/settings/account?access=denied");
  return user;
}
