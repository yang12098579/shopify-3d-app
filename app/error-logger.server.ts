import { prisma } from "./db.server";

/**
 * Log errors to database for monitoring.
 * Non-blocking — failures are silently ignored.
 */
export async function logError(error: Error, context?: { shop?: string; route?: string }) {
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ErrorLog" ("message", "stack", "shop", "route") VALUES ($1, $2, $3, $4)`,
      error.message,
      error.stack?.substring(0, 2000) || "",
      context?.shop || "",
      context?.route || ""
    );
  } catch {
    // Silently fail — don't break the app if error logging fails
  }
}