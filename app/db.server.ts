import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

/**
 * Prisma client singleton optimized for Vercel serverless.
 */
const prismaClientConfig = {
  log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] as const : ["error"] as const,
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient(prismaClientConfig);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;