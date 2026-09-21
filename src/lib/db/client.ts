import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { requireDatabaseUrl } from "@/lib/validation/environment";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = requireDatabaseUrl(process.env);

  const adapter = new PrismaPg({
    connectionString,
    connectionTimeoutMillis: 10000,
    max: 5,
    idleTimeoutMillis: 30000,
  });
  return new PrismaClient({ adapter });
}

export function getDb() {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}
