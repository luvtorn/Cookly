import { z } from "zod";

function emptyToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

const databaseUrlSchema = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .refine((value) => {
      try {
        const url = new URL(value);
        return (
          (url.protocol === "postgresql:" || url.protocol === "postgres:") &&
          url.hostname.length > 0 &&
          url.pathname.length > 1 &&
          url.hash === ""
        );
      } catch {
        return false;
      }
    })
    .optional(),
);

const environmentSchema = z.object({
  DATABASE_URL: databaseUrlSchema,
  AUTH_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  NEXT_PUBLIC_APP_URL: z.preprocess(
    emptyToUndefined,
    z.url({ protocol: /^https?$/ }).optional(),
  ),
});

// Pure validation shared by the server and Prisma CLI. Callers own environment
// loading; never pass this result (which may include secrets) to the browser.
export function readServerEnvironment(source: Record<string, unknown>) {
  const result = environmentSchema.safeParse(source);

  if (!result.success) {
    const names = [
      ...new Set(result.error.issues.map((issue) => issue.path[0])),
    ];
    // Do not expose the Zod error, raw input, or URL parser error as a cause.
    throw new Error(`Invalid environment variables: ${names.join(", ")}.`);
  }

  return result.data;
}

export function requireDatabaseUrl(source: Record<string, unknown>): string {
  const { DATABASE_URL } = readServerEnvironment(source);

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required for database operations.");
  }

  return DATABASE_URL;
}
