import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  // 1. 🌐 跨域预检：为第三方转码云接口 (CloudConvert) 铺设 CORS 绿灯
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });
  }

  // 2. 📡 流量分水岭：如果是来自 CloudConvert 后台转码完毕的回执
  const url = new URL(request.url);
  const targetProductId = url.searchParams.get("productId");

  if (targetProductId) {
    try {
      const body = await request.json();
      const eventType = body.event;
      const jobData = body.job;

      console.log(`📡 [雷达触网] 收到 CloudConvert 回执状态: ${eventType} | 商品: ${targetProductId}`);

      if (eventType === "job.finished") {
        const exportTask = jobData.tasks?.find(t => t.operation === "export/url" && t.status === "finished");
        const iosModelUrl = exportTask?.result?.files?.[0]?.url || "";

        if (iosModelUrl) {
          // 反向向 Shopify 商品元字段追加打入高兼容元数据
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
          console.log(`💎 [苹果 AR 引擎通关] .usdz 格式元字段已自动化注入完成！`);
        }
      }
      return new Response("Webhook callback handled", { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
    } catch (err) {
      console.error("❌ CloudConvert 回调接力过程中遭遇系统性崩溃:", err);
      return new Response("Internal Error", { status: 500 });
    }
  }

  // 3. 🛡️ 原生业务分水岭：移交原装的 Shopify 官方 Webhook 鉴权管道
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

  if (!topic) {
    return new Response("Missing topic", { status: 400 });
  }

  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        await prisma.session.deleteMany({ where: { shop } });
        await prisma.appAnalytics.deleteMany({ where: { shop } });
        console.log(`[Webhook 卸载清场] 店铺 ${shop} 已安全移除所有数据。`);
      }
      return new Response("Uninstalled Success", { status: 200 });

    case "CUSTOMERS_DATA_REQUEST":
      console.log(`[GDPR 合规] 收到买家数据查看请求: ${shop}`);
      return new Response("GDPR handled", { status: 200 });

    case "CUSTOMERS_REDACT":
      console.log(`[GDPR 合规] 收到买家数据擦除请求: ${shop}`);
      return new Response("GDPR handled", { status: 200 });

    case "SHOP_REDACT":
      console.log(`[GDPR 合规] 收到店铺数据最终擦除请求: ${shop}`);
      await prisma.session.deleteMany({ where: { shop } });
      await prisma.appAnalytics.deleteMany({ where: { shop } });
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
                products(first: 250) { edges { node { id modelUrlField: metafield(namespace: "custom", key: "product_3d_model") { value } } } }
              }`
            );
            const productsJson = await productsResponse.json();
            const edges = productsJson.data?.products?.edges || [];
            const boundProductIds = edges.filter(edge => !!edge.node.modelUrlField?.value).map(edge => edge.node.id.split("/").pop());
            const slicedIds = boundProductIds.slice(0, 3);
            allowedProductsValue = slicedIds.length > 0 ? `|${slicedIds.join("|")}|` : "";
          } catch (err) {
            console.error("Webhook 自动计算商品白名单失败:", err);
          }
        }

        try {
          const shopResponse = await admin.graphql(`#graphql query getShopIdWebhook { shop { id } }`);
          const shopJson = await shopResponse.json();
          const shopId = shopJson.data?.shop?.id;

          if (shopId) {
            await admin.graphql(
              `#graphql
              mutation syncShopPlanWebhook($metafields: [MetafieldsSetInput!]!) {
                metafieldsSet(metafields: $metafields) { metafields { id } }
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
            console.log(`[Webhook 同步成功] 店铺: ${shop}, 最新订阅状态更新为: ${planLevelValue}`);
          }
        } catch (err) {
          console.error("Webhook 写入错误:", err);
        }
      }
      return new Response("Subscription Handled", { status: 200 });

    default:
      return new Response("Unhandled webhook topic", { status: 404 });
  }
};