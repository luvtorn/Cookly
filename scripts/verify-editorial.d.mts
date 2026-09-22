import type { Client } from "pg";

export function verifyEditorial(
  client: Client,
  email: string,
): Promise<{ verified: number; skipped: number }>;
