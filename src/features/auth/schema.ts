import { z } from "zod";

type AuthValidationMessages = {
  passwordRequired: string;
  passwordLength: string;
  usernameFormat: string;
  passwordMismatch: string;
};

const englishValidation: AuthValidationMessages = {
  passwordRequired: "Enter your password.",
  passwordLength: "Use at least 8 characters.",
  usernameFormat: "Use letters, numbers and underscores.",
  passwordMismatch: "Passwords do not match.",
};

export const createSignInSchema = (messages = englishValidation) =>
  z.object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(1, messages.passwordRequired).max(128),
  });
export const createSignUpSchema = (messages = englishValidation) =>
  createSignInSchema(messages)
    .extend({
      displayName: z.string().trim().min(1).max(80),
      username: z
        .string()
        .trim()
        .toLowerCase()
        .min(3)
        .max(30)
        .regex(/^[a-z0-9_]+$/, messages.usernameFormat),
      password: z.string().min(8, messages.passwordLength).max(128),
      confirmation: z.string(),
    })
    .refine((value) => value.password === value.confirmation, {
      path: ["confirmation"],
      message: messages.passwordMismatch,
    });
export const signInSchema = createSignInSchema();
export const signUpSchema = createSignUpSchema();
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
    const normalizedPath = path.replace(/^\/(?:en|ru|pl)(?=\/|$)/, "");
    if (
      url.origin !== "https://cookly.invalid" ||
      normalizedPath.startsWith("/auth") ||
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
