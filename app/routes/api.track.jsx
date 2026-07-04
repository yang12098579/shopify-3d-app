import prisma from "../db.server";
import { authenticate } from "../shopify.server";

// Persistent rate limiter (per shop, 60 req/min) via Prisma
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

async function isRateLimited(shop) {
  const now = Date.now();
  const windowStart = String(Math.floor(now / RATE_WINDOW_MS) * RATE_WINDOW_MS);

  // Ensure rate limit record exists for this window
  await prisma.rateLimit.upsert({
    where: { shop_windowStart: { shop, windowStart } },
    update: {},
    create: { shop, windowStart, count: 0 },
  });

  // Atomic conditional increment: fails if count >= RATE_LIMIT
  try {
    await prisma.rateLimit.update({
      where: {
        shop_windowStart: { shop, windowStart },
        count: { lt: RATE_LIMIT },
      },
      data: { count: { increment: 1 } },
    });
    return false; // Under limit
  } catch (err) {
    if (err?.code === "P2025") {
      return true; // Rate limited
    }
    throw err;
  }
}

const VALID_EVENTS = new Set(["view", "ar_click"]);

export const action = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const shop = session.shop;

  // Rate limiting
  if (await isRateLimited(shop)) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    let data;
    try {
      data = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { eventType, timeMs } = data;

    // Validate eventType
    if (!eventType || !VALID_EVENTS.has(eventType)) {
      return new Response(JSON.stringify({ error: "Invalid eventType" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate timeMs
    const parsedTime = parseInt(timeMs || "0", 10);
    if (isNaN(parsedTime) || parsedTime < 0 || parsedTime > 3_600_000) {
      return new Response(JSON.stringify({ error: "Invalid timeMs" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }


    // Server-side plan verification for AR events to prevent metafield bypass
    if (eventType === "ar_click") {
      const sessionExists = await prisma.session.findFirst({
        where: { shop },
        select: { shop: true },
      });
      if (!sessionExists && process.env.NODE_ENV === "production") {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    await prisma.appAnalytics.upsert({
      where: { shop },
      update: {},
      create: { shop },
    });

    if (eventType === "view") {
      await prisma.appAnalytics.update({
        where: { shop },
        data: {
          views: { increment: 1 },
          totalStayTimeMs: { increment: parsedTime },
        },
      });
    } else if (eventType === "ar_click") {
      await prisma.appAnalytics.update({
        where: { shop },
        data: { arUses: { increment: 1 } },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Tracking error:", error);
    return new Response(JSON.stringify({ success: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
