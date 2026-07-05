import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const prismaClientConfig = {
  log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] as const : ["error"] as const,
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient(prismaClientConfig);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Serverless connection management: reconnect on stale connections
if (typeof process !== "undefined") {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}

export default prisma;
