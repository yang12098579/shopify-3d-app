import { prisma } from "../db.server";

export async function loader() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "shop" TEXT NOT NULL,
        "state" TEXT NOT NULL,
        "isOnline" BOOLEAN NOT NULL DEFAULT false,
        "scope" TEXT,
        "expires" DATETIME,
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
        "refreshTokenExpires" DATETIME
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AppAnalytics" (
        "id" SERIAL NOT NULL PRIMARY KEY,
        "shop" TEXT NOT NULL,
        "views" INTEGER NOT NULL DEFAULT 0,
        "arUses" INTEGER NOT NULL DEFAULT 0,
        "totalStayTimeMs" BIGINT NOT NULL DEFAULT 0,
        "addCartCount" INTEGER NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create unique index if not exists
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "AppAnalytics_shop_key" ON "AppAnalytics"("shop")
    `);

    return Response.json({ success: true, message: "Database tables created" });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}