import { prisma } from "../db.server";

// Simple token-based protection (set MIGRATE_TOKEN in env vars)
const MIGRATE_TOKEN = process.env.MIGRATE_TOKEN || "vision3d-migrate-2026";

export async function loader({ request }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (token !== MIGRATE_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shop" TEXT NOT NULL,
        "state" TEXT NOT NULL,
        "isOnline" BOOLEAN NOT NULL DEFAULT false,
        "scope" TEXT,
        "expires" TIMESTAMPTZ,
        "accessToken" TEXT NOT NULL,
        "userId" BIGINT,
        "firstName" TEXT,
        "lastName" TEXT,
        "email" TEXT,
        "accountOwner" BOOLEAN NOT NULL DEFAULT false,
        "locale" TEXT,
        "collaborator" BOOLEAN DEFAULT false,
        "emailVerified" BOOLEAN DEFAULT false,
        "refreshToken" TEXT,
        "refreshTokenExpires" TIMESTAMPTZ
      )
    `);

    // Create error log table for monitoring
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ErrorLog" (
        "id" SERIAL NOT NULL PRIMARY KEY,
        "message" TEXT NOT NULL,
        "stack" TEXT,
        "shop" TEXT,
        "route" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    return Response.json({ success: true, message: "All tables created" });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}