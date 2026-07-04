import { prisma } from "./db.server";

/**
 * Log errors to database for monitoring.
 * Non-blocking — failures are silently ignored.
 */
export async function logError(error: Error, context?: { shop?: string; route?: string }) {
  try {
    await prisma.errorLog.create({
      data: {
        message: error.message,
        stack: error.stack?.substring(0, 2000) || "",
        shop: context?.shop || "",
        route: context?.route || "",
      },
    });
  } catch {
    // Silently fail — don't break the app if error logging fails
  }
}