import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  // 严格验证：确保请求完全来自安装了该插件的合法 Shopify 店铺前端
  const { session } = await authenticate.public.appProxy(request);
  
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized access" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const data = await request.json();
    const { eventType, timeMs } = data;
    const shop = session.shop;

    // 确保数据库中有该店铺的统计记录
    await prisma.appAnalytics.upsert({
      where: { shop },
      update: {},
      create: { shop }
    });

    if (eventType === "view") {
      await prisma.appAnalytics.update({
        where: { shop },
        data: { 
          views: { increment: 1 },
          totalStayTimeMs: { increment: Math.max(0, parseInt(timeMs || 0)) }
        }
      });
    } else if (eventType === "ar_click") {
      await prisma.appAnalytics.update({
        where: { shop },
        data: { arUses: { increment: 1 } }
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