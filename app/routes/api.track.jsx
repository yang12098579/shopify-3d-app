import { json } from "@remix-run/node";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

// 🛡️ 接收由 C 端买家前端安全上报的埋点数据（带商业权益服务端物理拦截版）
export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  // 1. 严格的安全网关：校验数字签名（HMAC），拦截一切黑客伪造和越过 Proxy 的请求
  const { session, admin } = await authenticate.public.appProxy(request);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized access" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    let payload;
    const contentType = request.headers.get("content-type") || "";
    
    if (contentType.includes("application/json") || contentType.includes("text/plain")) {
      const rawText = await request.text();
      payload = JSON.parse(rawText);
    } else {
      return json({ success: false, message: "Invalid Content Type" }, { status: 400 });
    }

    const { eventType, timeMs } = payload;
    const shop = session.shop;

    if (!shop) {
      return json({ success: false, message: "Missing Shop Domain" }, { status: 400 });
    }

    // =================================================================
    // 🛡️ 【商用硬核升级】：服务端高级版权益二次熔断拦截锁（防止前端破解）
    // =================================================================
    if (eventType === "ar_click" || eventType === "stay_time") {
      // 远程向 Shopify 实时对账，捞出该店铺真实的 Metafield 套餐数据
      const checkPlanResponse = await admin.graphql(
        `#graphql
        query checkShopPlanBackend {
          shop {
            planLevelField: metafield(namespace: "product_3d_app", key: "plan_level") { value }
          }
        }`
      );
      const checkPlanJson = await checkPlanResponse.json();
      const realPlanValue = checkPlanJson.data?.shop?.planLevelField?.value || "Basic Plan";

      // 铁证盘查：如果真实计划不包含 Pro/Enterprise/专业/旗舰，说明是免费版
      const isPremium = realPlanValue.includes("Pro") || 
                        realPlanValue.includes("Professional") || 
                        realPlanValue.includes("Enterprise") || 
                        realPlanValue.includes("专业") || 
                        realPlanValue.includes("旗舰");

      if (!isPremium) {
        console.warn(`🚨 [拦截越权刷量] 店铺 ${shop} 企图利用免费版身份上报高级功能数据 [${eventType}]，已被后端物理熔断！`);
        return new Response(JSON.stringify({ 
          success: false, 
          error: "PLAN_RESTRICTED", 
          message: "AR feature and deep engagement metrics are locked under your current free plan." 
        }), {
          status: 403, // 严格合规：抛出 403 拒绝访问
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    // =================================================================

    // 2. 验证通过：执行 PostgreSQL 原子化高并发入库逻辑
    const updatePayload = {};
    if (eventType === "view_click") updatePayload.views = { increment: 1 };
    if (eventType === "ar_click") updatePayload.arUses = { increment: 1 };
    if (eventType === "cart_add") updatePayload.addCartCount = { increment: 1 };
    if (eventType === "stay_time" && timeMs) {
      updatePayload.totalStayTimeMs = { increment: BigInt(parseInt(timeMs, 10)) };
    }

    await prisma.appAnalytics.upsert({
      where: { shop },
      update: updatePayload,
      create: {
        shop,
        views: eventType === "view_click" ? 1 : 0,
        arUses: eventType === "ar_click" ? 1 : 0,
        addCartCount: eventType === "cart_add" ? 1 : 0,
        totalStayTimeMs: eventType === "stay_time" && timeMs ? BigInt(parseInt(timeMs, 10)) : BigInt(0),
      }
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    console.error("❌ [PROXY_METRIC_ERROR] 埋点入库流水失败:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

export const loader = () => json({ status: "OK" });