import prisma from "../db.server";
import { authenticate } from "../shopify.server";

// ========================================================
// 🌐 【彻底复活】：重新全量补回核心国际化翻译字典，根除 500 崩溃错误
// ========================================================
const translations = {
  zh: {
    title: "Vision3D 数据统计看板",
    totalViews: "3D 互动次数",
    totalArViews: "AR 唤醒次数",
    avgTime: "平均模型互动时间",
    conversionRate: "AR 加购转化率",
    statusLockedFree: "AR功能已锁定 (免费版)",
    planStatus: "套餐等级",
    arSlotUsage: "弹性按量 AR 额度占用",
  },
  en: {
    title: "Vision3D Performance Analytics",
    totalViews: "3D Interactions",
    totalArViews: "AR Viewings",
    avgTime: "Avg. Engage Time",
    conversionRate: "Add to Cart Rate",
    statusLockedFree: "AR Features Locked (Free)",
    planStatus: "Plan Level",
    arSlotUsage: "Usage AR Quota Usage",
  }
};

export const action = async ({ request }) => {
  // 1. 严格防线：确保请求来自安装了该插件的合法 Shopify 店铺前端
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

    // 2. 防刷转换：解析并限制时间跨度，防止黑客发送超大溢出数字
    const parsedTimeMs = Math.max(0, parseInt(timeMs || 0, 10));
    const safeTimeMs = parsedTimeMs > 86400000 ? 0 : parsedTimeMs; // 超过24小时的数据直接作废

    let updatePayload = {};
    let createPayload = { shop, views: 0, arUses: 0, totalStayTimeMs: 0 };

    // 3. 将业务逻辑降维为单次原生的原子自增载荷
    if (eventType === "view") {
      updatePayload = {
        views: { increment: 1 },
        totalStayTimeMs: { increment: safeTimeMs }
      };
      createPayload.views = 1;
      createPayload.totalStayTimeMs = safeTimeMs;
    } else if (eventType === "ar_click") {
      updatePayload = {
        arUses: { increment: 1 }
      };
      createPayload.arUses = 1;
    } else {
      return new Response(JSON.stringify({ success: false, message: "Invalid event type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. 核心解耦：仅使用单次高并发原子级 upsert。彻底告别行锁排队死锁
    await prisma.appAnalytics.upsert({
      where: { shop },
      update: updatePayload,
      create: createPayload,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ [TRACKING_SERVER_ERROR] 核心数据采集网关崩溃:", error);
    return new Response(JSON.stringify({ success: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};