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

    return Response.json({ success: true, message: "Session table created" });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}