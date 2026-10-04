import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db/client";
import { ingredientInput, PANTRY_LIMIT, type PantryErrorCode } from "./schema";

export class PantryError extends Error {
  constructor(public code: PantryErrorCode) {
    super(code);
  }
}
export async function changePantry(
  userId: string,
  operation: "add" | "remove" | "clear",
  raw: unknown,
) {
  const input = operation === "clear" ? null : ingredientInput.parse(raw);
  return getDb().$transaction(async (tx) => {
    // Serialize all pantry writes for this owner, including capacity checks.
    const users = await tx.$queryRaw<{ status: string }[]>(
      Prisma.sql`SELECT status FROM "User" WHERE id = ${userId} FOR UPDATE`,
    );
    if (users[0]?.status !== "ACTIVE") throw new PantryError("AUTH");
    if (operation === "clear")
      await tx.pantryItem.deleteMany({ where: { userId } });
    else if (input) {
      if (operation === "remove")
        await tx.pantryItem.deleteMany({
          where: { userId, ingredientId: input.ingredientId },
        });
      else {
        const exists = await tx.pantryItem.findUnique({
          where: {
            userId_ingredientId: { userId, ingredientId: input.ingredientId },
          },
        });
        if (!exists) {
          if (
            (await tx.pantryItem.count({ where: { userId } })) >= PANTRY_LIMIT
          )
            throw new PantryError("FULL");
          if (
            !(await tx.ingredient.findUnique({
              where: { id: input.ingredientId },
              select: { id: true },
            }))
          )
            throw new PantryError("INVALID");
          await tx.pantryItem.create({
            data: { userId, ingredientId: input.ingredientId },
          });
        }
      }
    }
    const items = await tx.pantryItem.findMany({
      where: { userId },
      select: { ingredient: { select: { id: true, name: true } } },
      orderBy: { ingredient: { name: "asc" } },
      take: PANTRY_LIMIT,
    });
    return items.map((item) => item.ingredient);
  });
}
