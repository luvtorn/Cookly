import { z } from "zod";
import type { RecipePreview } from "@/features/discovery/recipe-preview";

export const PANTRY_LIMIT = 200;
export const PANTRY_PAGE_SIZE = 12;
export const pantryQuerySchema = z.object({
  maxTime: z.coerce.number().int().min(1).max(1440).optional().catch(undefined),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional().catch(undefined),
  cuisine: z
    .string()
    .regex(/^[a-z0-9-]{1,100}$/)
    .optional()
    .catch(undefined),
  maxMissing: z.enum(["0", "1", "2", "3", "any"]).catch("3"),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});
export type PantryQuery = z.infer<typeof pantryQuerySchema>;
export function pantryUrl(query: PantryQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (
      value !== undefined &&
      !(key === "page" && value === 1) &&
      !(key === "maxMissing" && value === "3")
    )
      params.set(key, String(value));
  }
  return `/pantry${params.size ? `?${params}` : ""}`;
}
export const ingredientInput = z
  .object({ ingredientId: z.string().min(1).max(100) })
  .strict();
export type PantryIngredient = { id: string; name: string };
export type PantryMatch = {
  recipe: RecipePreview;
  matched: PantryIngredient[];
  missing: PantryIngredient[];
  optional: PantryIngredient[];
  requiredCount: number;
  percentage: number;
};
export type PantryErrorCode = "AUTH" | "INVALID" | "LIMIT" | "FULL" | "FAILED";
export type PantryResult =
  | { success: true; data: PantryIngredient[] }
  | { success: false; code: PantryErrorCode };

export function ingredientMatch(
  rows: (PantryIngredient & { isOptional: boolean })[],
  pantry: Set<string>,
) {
  const required = new Map(
    rows
      .filter((row) => !row.isOptional)
      .map(({ id, name }) => [id, { id, name }]),
  );
  const optional = new Map(
    rows
      .filter((row) => row.isOptional && !required.has(row.id))
      .map(({ id, name }) => [id, { id, name }]),
  );
  const matched = [...required.values()].filter((row) => pantry.has(row.id));
  const missing = [...required.values()].filter((row) => !pantry.has(row.id));
  return {
    matched,
    missing,
    optional: [...optional.values()],
    requiredCount: required.size,
    percentage: required.size
      ? Math.floor((100 * matched.length) / required.size)
      : 0,
  };
}
