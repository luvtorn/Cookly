import { z } from "zod";
export const verificationSchema = z
  .object({
    recipeId: z.string().min(1).max(100),
    updatedAt: z.iso.datetime(),
    targetStatus: z.enum(["NONE", "PENDING", "VERIFIED", "REJECTED"]),
    note: z.string().trim().max(1000),
    creatorMessage: z.string().trim().max(1000).default(""),
  })
  .strict()
  .refine(
    (data) =>
      data.targetStatus === "VERIFIED" || data.creatorMessage.length > 0,
    {
      path: ["creatorMessage"],
      message: "Explain to the author what needs to change.",
    },
  );
export const reviewQuerySchema = z.object({
  status: z.enum(["PENDING", "VERIFIED", "REJECTED"]).catch("PENDING"),
  q: z.string().trim().max(100).catch(""),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});
export const requestVerificationSchema = z
  .object({
    recipeId: z.string().min(1).max(100),
    creatorNote: z.string().trim().max(500).default(""),
  })
  .strict();
