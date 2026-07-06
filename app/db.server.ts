import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

// Retry wrapper for serverless cold starts
function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 800): Promise<T> {
  return fn().catch((err) => {
    if (retries > 0 && (
      err instanceof Prisma.PrismaClientInitializationError ||
      err instanceof Prisma.PrismaClientKnownRequestError && err.message.includes("Can't reach") ||
      (err instanceof Error && (err.message.includes("timeout") || err.message.includes("ECONNREFUSED") || err.message.includes("connection")))
    )) {
      return new Promise<T>((resolve) => setTimeout(resolve, delay))
        .then(() => withRetry(fn, retries - 1, delay * 2));
    }
    throw err;
  });
}

const prismaClientConfig = {
  log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] as const : ["error"] as const,
};

// Create Prisma with proxy that auto-retries on connection failures
const createPrisma = () => {
  const client = new PrismaClient(prismaClientConfig);
  return new Proxy(client, {
    get(target, prop) {
      const original = (target as any)[prop];
      if (typeof original === "function" && !prop.toString().startsWith("$") && !prop.toString().startsWith("_")) {
        return (...args: any[]) => withRetry(() => original.apply(target, args));
      }
      return original;
    },
  });
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

if (typeof process !== "undefined") {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}

export default prisma;
