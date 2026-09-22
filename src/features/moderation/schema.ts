import { z } from "zod";
export const verificationSchema = z
  .object({
    recipeId: z.string().min(1).max(100),
    updatedAt: z.iso.datetime(),
    decision: z.enum(["VERIFY", "REJECT", "REVOKE"]),
    note: z.string().trim().max(1000),
  })
  .strict()
  .refine((data) => data.decision === "VERIFY" || data.note.length > 0, {
    path: ["note"],
    message: "Explain why this recipe is not verified.",
  });
export const reviewQuerySchema = z.object({
  status: z
    .enum(["NONE", "PENDING", "VERIFIED", "REJECTED"])
    .optional()
    .catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});
