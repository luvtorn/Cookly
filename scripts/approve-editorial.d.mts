import type { Client } from "pg";
type Preview = {
  targets: {
    id: string;
    title: string;
    updatedAt: Date;
    verificationStatus: string;
  }[];
  confirmation: string;
};
export function approveEditorial(
  client: Client,
  email: string,
): Promise<Preview>;
export function approveEditorial(
  client: Client,
  email: string,
  confirmation: string,
): Promise<{ verified: number }>;
