import { z } from "zod";

export const normalizeIngredient = (value: string) =>
  value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
export const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const text = (max: number) => z.string().trim().min(1).max(max);
export const recipeSchema = z
  .object({
    id: z.string().max(100).optional(),
    title: text(140),
    description: text(600),
    servings: z.number().int().min(1).max(100),
    prepMinutes: z.number().int().min(0).max(1440),
    cookMinutes: z.number().int().min(0).max(1440),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    categoryId: text(100),
    cuisineId: z.string().max(100),
    tagIds: z.array(text(100)).max(15),
    imageReceipt: z.string().max(4000).optional(),
    coverImageIsAi: z.boolean(),
    ingredients: z
      .array(
        z.object({
          name: text(100).transform(normalizeIngredient),
          amount: z
            .string()
            .trim()
            .max(12)
            .refine(
              (v) =>
                v === "" || (/^\d{1,8}(\.\d{1,2})?$/.test(v) && Number(v) > 0),
              "Enter a positive amount with up to two decimal places.",
            ),
          unit: z.string().trim().max(32),
          note: z.string().trim().max(160),
          isOptional: z.boolean(),
        }),
      )
      .min(1)
      .max(60),
    steps: z
      .array(z.object({ instruction: text(3000) }))
      .min(1)
      .max(40),
  })
  .strict();
export type RecipeInput = z.infer<typeof recipeSchema>;
export type RecipeOptions = {
  categories: { id: string; name: string }[];
  cuisines: { id: string; name: string }[];
  tags: { id: string; name: string }[];
};
