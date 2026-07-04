CREATE TABLE IF NOT EXISTS "DailyStats" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "arUses" INTEGER NOT NULL DEFAULT 0,
    "addCartCount" INTEGER NOT NULL DEFAULT 0,
    "stayTimeMs" BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS "DailyStats_shop_date_key" ON "DailyStats"("shop", "date");

CREATE TABLE IF NOT EXISTS "VariantModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "glbUrl" TEXT NOT NULL,
    "usdzUrl" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "VariantModel_productId_variantId_key" ON "VariantModel"("productId", "variantId");
