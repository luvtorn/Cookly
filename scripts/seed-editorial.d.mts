import type { Client } from "pg";
export function seedEditorial(client: Client, email: string, assets: Record<string,{url:string;key:string}>): Promise<{created:number;skipped:number}>;
