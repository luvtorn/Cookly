import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1, "Enter your password.").max(128),
});
export const signUpSchema = signInSchema
  .extend({
    displayName: z.string().trim().min(1).max(80),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(30)
      .regex(/^[a-z0-9_]+$/, "Use letters, numbers and underscores."),
    password: z.string().min(8, "Use at least 8 characters.").max(128),
    confirmation: z.string(),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ["confirmation"],
    message: "Passwords do not match.",
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

export function safeCallback(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return "/";
  try {
    const url = new URL(value, "https://cookly.invalid");
    const path = decodeURIComponent(url.pathname).toLowerCase();
    if (
      url.origin !== "https://cookly.invalid" ||
      path.startsWith("/auth") ||
      path.startsWith("/api/auth") ||
      path.startsWith("//") ||
      path.includes("\\")
    )
      return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}
