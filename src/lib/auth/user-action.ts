import "server-only";
import { headers } from "next/headers";
import { getCurrentUser } from "./session";

export async function actionUser() {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) throw new Error("Access denied.");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new Error("Access denied.");
  }
  if (originHost !== (h.get("x-forwarded-host") ?? h.get("host")))
    throw new Error("Access denied.");
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") throw new Error("Access denied.");
  return user;
}
