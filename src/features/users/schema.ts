import { z } from "zod";

export const profileSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(30)
      .regex(/^[a-z0-9_]+$/, "Use letters, numbers and underscores."),
    bio: z.string().trim().max(500),
    location: z.string().trim().max(120),
    avatarReceipt: z.string().max(4000).optional(),
  })
  .strict();

export type ProfileInput = z.infer<typeof profileSchema>;
