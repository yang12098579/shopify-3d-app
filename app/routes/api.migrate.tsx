import { prisma } from "../db.server";

const MIGRATE_TOKEN = process.env.MIGRATE_TOKEN || "vision3d-migrate-2026";

export async function loader({ request }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (token !== MIGRATE_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Session table (Shopify auth)
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

    // Analytics table (usage tracking)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AppAnalytics" (
        "id" SERIAL NOT NULL PRIMARY KEY,
        "shop" TEXT NOT NULL,
        "views" INTEGER NOT NULL DEFAULT 0,
        "arUses" INTEGER NOT NULL DEFAULT 0,
        "totalStayTimeMs" BIGINT NOT NULL DEFAULT 0,
        "addCartCount" INTEGER NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "AppAnalytics_shop_key" ON "AppAnalytics"("shop")
    `);

    // Error log table (error monitoring)
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


    // RateLimit table (persistent rate limiting)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RateLimit" (
        "shop" TEXT NOT NULL,
        "windowStart" TEXT NOT NULL,
        "count" INTEGER NOT NULL DEFAULT 1,
        CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("shop", "windowStart")
      )
    `);

    return Response.json({ success: true, message: "All tables created (Session, AppAnalytics, ErrorLog, RateLimit)" });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}