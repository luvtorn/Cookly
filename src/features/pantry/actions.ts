"use server";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { actionUser } from "@/lib/auth/user-action";
import { consumeLimit } from "@/lib/auth/rate-limit";
import { changePantry, PantryError } from "./service";
import type { PantryResult } from "./schema";

async function mutate(
  operation: "add" | "remove" | "clear",
  raw: unknown,
): Promise<PantryResult> {
  try {
    const user = await actionUser().catch(() => {
      throw new PantryError("AUTH");
    });
    if (!(await consumeLimit("pantry", user.id, 120, 60)))
      throw new PantryError("LIMIT");
    const data = await changePantry(user.id, operation, raw);
    for (const locale of ["en", "ru", "pl"])
      revalidatePath(`/${locale}/pantry`);
    return { success: true, data };
  } catch (error) {
    if (error instanceof PantryError)
      return { success: false, code: error.code };
    if (error instanceof ZodError) return { success: false, code: "INVALID" };
    console.error("[pantry] Update failed.");
    return { success: false, code: "FAILED" };
  }
}
export async function addPantryIngredient(raw: unknown) {
  return mutate("add", raw);
}
export async function removePantryIngredient(raw: unknown) {
  return mutate("remove", raw);
}
export async function clearPantry() {
  return mutate("clear", null);
}
