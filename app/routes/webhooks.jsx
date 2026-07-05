import { authenticate, unauthenticated } from "../shopify.server";
import { createHmac } from "crypto";
import prisma from "../db.server";

export const action = async ({ request }) => {
  // 1. 🌐 跨域预检：为第三方转码云接口 (CloudConvert) 铺设 CORS 绿灯
  if (request.method === "OPTIONS") {
    const ccUrl = new URL(request.url);
    if (!ccUrl.searchParams.get("productId")) {
      return new Response("Not Found", { status: 404 });
    }
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "https://api.cloudconvert.com",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, cloudconvert-signature",
      }
    });
  }

  // =================================================================
  // 🛡️ 核心验证区：强制接管 Shopify 请求，直接抛出 401 防止框架重定向
  // =================================================================
  const isShopifyWebhook = request.headers.get("x-shopify-topic") || request.headers.get("x-shopify-hmac-sha256");

  if (isShopifyWebhook) {
    let webhookContext;
    try {
      // 内部包含严格的 HMAC 签名校验
      webhookContext = await authenticate.webhook(request);
    } catch (err) {
      // 🛑 捕获伪造请求并硬编码返回 401，完美通过 Shopify 审核！
      console.error("🛑 [安全拦截] Shopify Webhook 签名验证未通过，拒绝访问。");
      return new Response("Unauthorized", { status: 401 });
    }

    const { topic, shop, session, admin, payload } = webhookContext;

    if (!topic) {
      return new Response("Missing topic", { status: 400 });
    }

    switch (topic) {
      case "APP_UNINSTALLED":
        if (session) {
          // 🛡️ 商业合规与防冗余：商家卸载插件后，彻底清除该店铺的追踪数据
          await prisma.session.deleteMany({ where: { shop } });
          await prisma.appAnalytics.deleteMany({ where: { shop } });
          await prisma.rateLimit.deleteMany({ where: { shop } });
          await prisma.conversionJob.deleteMany({ where: { shop } });
          await prisma.errorLog.deleteMany({ where: { shop } });
          console.log(`[Webhook 卸载清场] 店铺 ${shop} 已安全移除所有授权与统计数据。`);
        }
        return new Response("Uninstalled Success", { status: 200 });

      // ==========================================
      // 🛡️ Shopify GDPR 隐私合规路由处理
      // ==========================================
      case "CUSTOMERS_DATA_REQUEST":
        console.log(`[GDPR] 收到买家数据查看请求: ${shop}`);
        return new Response("GDPR handled", { status: 200 });

      case "CUSTOMERS_REDACT":
        console.log(`[GDPR] 收到买家数据擦除请求: ${shop}`);
        return new Response("GDPR handled", { status: 200 });

      case "SHOP_REDACT":
        console.log(`[GDPR] 收到店铺数据最终擦除请求: ${shop}`);
        await prisma.session.deleteMany({ where: { shop } });
        await prisma.appAnalytics.deleteMany({ where: { shop } });
        await prisma.rateLimit.deleteMany({ where: { shop } });
        await prisma.conversionJob.deleteMany({ where: { shop } });
        await prisma.errorLog.deleteMany({ where: { shop } });
        return new Response("GDPR handled", { status: 200 });

      case "APP_SUBSCRIPTIONS_UPDATE":
        if (admin && payload?.app_subscription) {
          const subscription = payload.app_subscription;
          const status = subscription.status; 
          const name = subscription.name;

          let planLevelValue = "Basic Plan";
          if (status === "ACTIVE") {
            if (name.includes("Professional")) planLevelValue = "Professional Plan";
            if (name.includes("Enterprise")) planLevelValue = "Enterprise Plan";
          }

          let allowedProductsValue = "";
          if (planLevelValue === "Basic Plan") {
            try {
              const productsResponse = await admin.graphql(
                `#graphql
                query getBoundProductsWebhook {
                  products(first: 250) {
                    edges {
                      node {
                        id
                        modelUrlField: metafield(namespace: "custom", key: "product_3d_model") { value }
                      }
                    }
                  }
                }`
              );
              const productsJson = await productsResponse.json();
              const edges = productsJson.data?.products?.edges || [];
              
              const boundProductIds = edges
                .filter(edge => !!edge.node.modelUrlField?.value)
                .map(edge => edge.node.id.split("/").pop());
              
              const slicedIds = boundProductIds.slice(0, 3);
              allowedProductsValue = slicedIds.length > 0 ? `|${slicedIds.join("|")}|` : "";
            } catch (err) {
              console.error("Webhook 计算白名单失败:", err);
            }
          }

          try {
            const shopResponse = await admin.graphql(`#graphql query getShopIdWebhook { shop { id } }`);
            const shopJson = await shopResponse.json();
            const shopId = shopJson.data?.shop?.id;

            if (shopId) {
              const syncRes = await admin.graphql(
                `#graphql
                mutation syncShopPlanWebhook($metafields: [MetafieldsSetInput!]!) {
                  metafieldsSet(metafields: $metafields) {
                    metafields { id value }
                    userErrors { field message }
                  }
                }`,
                {
                  variables: {
                    metafields: [
                      { ownerId: shopId, namespace: "product_3d_app", key: "plan_level", type: "single_line_text_field", value: planLevelValue },
                      { ownerId: shopId, namespace: "product_3d_app", key: "allowed_products", type: "single_line_text_field", value: allowedProductsValue }
                    ]
                  }
                }
              );
              console.log(`[Webhook 同步] 店铺: ${shop}, 订阅更新为: ${planLevelValue}`);
            }
          } catch (err) {
            console.error("Webhook 写入店铺 Metafield 失败:", err);
          }
        }
        return new Response("Subscription Handled", { status: 200 });

      default:
        return new Response("Unhandled webhook topic", { status: 200 });
    }
  }

  // =================================================================
  // 📡 CloudConvert 转码回执处理 (非 Shopify 请求)
  // =================================================================
  const url = new URL(request.url);
  const targetProductId = url.searchParams.get("productId");
  const targetShop = url.searchParams.get("shop"); 

  if (targetProductId && targetShop) {
    // HMAC signature verification for CloudConvert callbacks
    const ccSigningSecret = process.env.CLOUDCONVERT_SIGNING_SECRET;
    if (!ccSigningSecret) {
      console.error("[Security] CLOUDCONVERT_SIGNING_SECRET not configured — rejecting callback");
      return new Response("Unauthorized", { status: 401 });
    }
    const ccRawBody = await request.clone().text();
    const ccSignature = request.headers.get("cloudconvert-signature");
    const expectedSig = createHmac("sha256", ccSigningSecret).update(ccRawBody).digest("hex");
    if (!ccSignature || ccSignature !== expectedSig) {
      console.error("CloudConvert signature verification failed");
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const body = await request.json();
      const eventType = body.event;
      const jobData = body.job;

      console.log(`📡 [CloudConvert] 收到回执: ${eventType} | 商品: ${targetProductId}`);

      if (eventType === "job.finished") {
        const exportTask = jobData.tasks?.find(t => t.operation === "export/url" && t.status === "finished");
        const iosModelUrl = exportTask?.result?.files?.[0]?.url || "";

        if (iosModelUrl) {
          const { admin } = await unauthenticated.admin(targetShop);
          
          await admin.graphql(
            `#graphql
            mutation webhookAppendAppleAsset($metafields: [MetafieldsSetInput!]!) {
              metafieldsSet(metafields: $metafields) {
                metafields { id value }
                userErrors { field message }
              }
            }`,
            {
              variables: {
                metafields: [
                  { ownerId: targetProductId, namespace: "custom", key: "ios_3d_model", type: "single_line_text_field", value: iosModelUrl }
                ]
              }
            }
          );
          await prisma.conversionJob.updateMany({
            where: { productId: targetProductId, status: "processing" },
            data: { status: "completed", usdzUrl: iosModelUrl },
          }).catch(() => {});
          console.log(`💎 [AR引擎同步] USDZ 元字段注入完成。`);
        }
      } else if (eventType === "job.failed") {
        const errorMsg = jobData?.message || "CloudConvert job failed";
        console.error("[CloudConvert] Conversion failed:", targetProductId, errorMsg);
        await prisma.conversionJob.updateMany({
          where: { productId: targetProductId, status: "processing" },
          data: { status: "failed", error: errorMsg },
        }).catch(() => {});
      }
      return new Response("CloudConvert Handled", { status: 200, headers: { "Access-Control-Allow-Origin": "https://api.cloudconvert.com" } });
    } catch (err) {
      console.error("❌ CloudConvert 回调处理崩溃:", err);
      return new Response("Internal Error", { status: 500 });
    }
  }

  return new Response("Bad Request", { status: 400 });
};