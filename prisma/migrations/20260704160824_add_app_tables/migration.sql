-- Create AppAnalytics table
CREATE TABLE IF NOT EXISTS "AppAnalytics" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "arUses" INTEGER NOT NULL DEFAULT 0,
    "totalStayTimeMs" BIGINT NOT NULL DEFAULT 0,
    "addCartCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "AppAnalytics_shop_key" ON "AppAnalytics"("shop");

-- Create RateLimit table
CREATE TABLE IF NOT EXISTS "RateLimit" (
    "shop" TEXT NOT NULL,
    "windowStart" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("shop", "windowStart")
);

-- Create ConversionJob table
CREATE TABLE IF NOT EXISTS "ConversionJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "glbUrl" TEXT NOT NULL,
    "usdzUrl" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create ErrorLog table
CREATE TABLE IF NOT EXISTS "ErrorLog" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "shop" TEXT,
    "route" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
