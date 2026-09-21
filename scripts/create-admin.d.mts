import type { Client } from "pg";
export function createAdmin(client: Client, email: string, username?: string): Promise<{email: string; password: string}>;
