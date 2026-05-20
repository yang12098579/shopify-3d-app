import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  // 1. 🌐 跨域预检：为第三方转码云接口(CloudConvert)铺设 CORS 绿灯通过特权
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });
  }

  // 2. 📡 流量智能分水岭：检查是否带有了商品参数（代表这是 CloudConvert 送来的接力棒通知）
  const url = new URL(request.url);
  const targetProductId = url.searchParams.get("productId");

  if (targetProductId) {
    try {
      const body = await request.json();
      const eventType = body.event; // "job.finished" 或 "job.failed"
      const jobData = body.job;

      console.log(`📡 [雷达触网] 收到 CloudConvert 回执状态: ${eventType} | 商品: ${targetProductId}`);

      if (eventType === "job.finished") {
        // 从云端任务任务链中剥离出编译完成的苹果原生 .usdz 下载链接
        const exportTask = jobData.tasks?.find(t => t.operation === "export/url" && t.status === "finished");
        const iosModelUrl = exportTask?.result?.files?.[0]?.url || "";

        if (iosModelUrl) {
          // 利用无鉴权公有通道反向把资产追加刺入 Shopify
          const { admin } = await authenticate.public(request);
          
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
          console.log(`💎 [苹果 AR 引擎通关] .usdz 格式元字段已全自动写入完毕，iOS 端宇航员已被击碎替换。`);
        }
      }
      return new Response("Webhook callback handled", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
    } catch (err) {
      console.error("❌ CloudConvert 回调接力过程中遭遇系统性崩溃:", err);
      return new Response("Internal Error", { status: 500 });
    }
  }

  // 3. 🛡️ 官方原生分水岭：如果不是转码回执，直接移交原装的 Shopify 官方 Webhook 鉴权中转管道
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

  if (!topic) {
    return new Response("Missing topic", { status: 400 });
  }

  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        // 🛡️ 商业合规与防冗余：商家卸载插件后，彻底清除该店铺的追踪数据和 Session
        await prisma.session.deleteMany({ where: { shop } });
        await prisma.appAnalytics.deleteMany({ where: { shop } });
        console.log(`[Webhook 卸载清场] 店铺 ${shop} 已安全移除所有授权与统计数据。`);
      }
      return new Response("Uninstalled Success", { status: 200 });

    // ==========================================
    // 🛡️ Shopify 强制要求的 GDPR 隐私合规路由
    // ==========================================
    case "CUSTOMERS_DATA_REQUEST":
      // 买家申请查看自己的隐私数据。本插件不收集买家 PII (个人身份信息)，直接返回 200 即可。
      console.log(`[GDPR 合规] 收到买家数据查看请求: ${shop}，本插件未收集买家敏感信息。`);
      return new Response("GDPR handled", { status: 200 });

    case "CUSTOMERS_REDACT":
      // 买家申请擦除自己的隐私数据。本插件无买家敏感数据，直接返回 200 即可。
      console.log(`[GDPR 合规] 收到买家数据擦除请求: ${shop}，无需额外清理。`);
      return new Response("GDPR handled", { status: 200 });

    case "SHOP_REDACT":
      // 商家卸载 48 小时后触发的终极清理命令。为确保绝对合规，再执行一次清场。
      console.log(`[GDPR 合规] 收到店铺数据最终擦除请求: ${shop}`);
      await prisma.session.deleteMany({ where: { shop } });
      await prisma.appAnalytics.deleteMany({ where: { shop } });
      return new Response("GDPR handled", { status: 200 });
    // ==========================================

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
            
            // 剥离出干净的数字 ID 数组
            const boundProductIds = edges
              .filter(edge => !!edge.node.modelUrlField?.value)
              .map(edge => edge.node.id.split("/").pop());
            
            // 🔒 商业硬核改动：输出规范的隔离符字符串如: |87654321|12345678|
            const slicedIds = boundProductIds.slice(0, 3);
            allowedProductsValue = slicedIds.length > 0 ? `|${slicedIds.join("|")}|` : "";
          } catch (err) {
            console.error("Webhook 自动计算商品白名单失败:", err);
          }
        }

        try {
          const shopResponse = await admin.graphql(
            `#graphql
            query getShopIdWebhook { shop { id } }`
          );
          const shopJson = await shopResponse.json();
          const shopId = shopJson.data?.shop?.id;

          if (shopId) {
            await admin.graphql(
              `#graphql
              mutation syncShopPlanWebhook($metafields: [MetafieldsSetInput!]!) {
                metafieldsSet(metafields: $metafields) {
                  metafields { id value }
                }
              }`,
              {
                variables: {
                  metafields: [
                    {
                      ownerId: shopId,
                      namespace: "product_3d_app",
                      key: "plan_level",
                      type: "single_line_text_field",
                      value: planLevelValue
                    },
                    {
                      ownerId: shopId,
                      namespace: "product_3d_app",
                      key: "allowed_products",
                      type: "single_line_text_field",
                      value: allowedProductsValue
                    }
                  ]
                }
              }
            );
            console.log(`[Webhook 同步成功] 店铺: ${shop}, 最新订阅状态: ${status}, 前台熔断更新为: ${planLevelValue}`);
          }
        } catch (err) {
          console.error("Webhook 写入店铺级 Metafield 失败:", err);
        }
      }
      return new Response("Subscription Handled", { status: 200 });

    default:
      return new Response("Unhandled webhook topic", { status: 404 });
  }
};