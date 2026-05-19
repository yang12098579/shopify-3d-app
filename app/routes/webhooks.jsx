import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

  if (!topic) {
    return new Response("Missing topic", { status: 400 });
  }

  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        // 🛡️ 商业合规与防沉余：商家卸载插件后，必须彻底清除该店铺的追踪数据和 Session
        await prisma.session.deleteMany({ where: { shop } });
        await prisma.appAnalytics.deleteMany({ where: { shop } });
        console.log(`[Webhook 卸载清场] 店铺 ${shop} 已安全移除所有授权与统计数据。`);
      }
      break;

    // ==========================================
    // 🛡️ Shopify 强制要求的 GDPR 隐私合规路由
    // ==========================================
    case "CUSTOMERS_DATA_REQUEST":
      // 买家申请查看自己的隐私数据。本插件不收集买家 PII (个人身份信息)，直接返回 200 即可。
      console.log(`[GDPR 合规] 收到买家数据查看请求: ${shop}，本插件未收集买家敏感信息。`);
      break;

    case "CUSTOMERS_REDACT":
      // 买家申请擦除自己的隐私数据。本插件无买家敏感数据，直接返回 200 即可。
      console.log(`[GDPR 合规] 收到买家数据擦除请求: ${shop}，无需额外清理。`);
      break;

    case "SHOP_REDACT":
      // 商家卸载 48 小时后触发的终极清理命令。为确保绝对合规，再执行一次清场。
      console.log(`[GDPR 合规] 收到店铺数据最终擦除请求: ${shop}`);
      await prisma.session.deleteMany({ where: { shop } });
      await prisma.appAnalytics.deleteMany({ where: { shop } });
      break;
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
      break;

    default:
      return new Response("Unhandled webhook topic", { status: 404 });
  }

  return new Response();
};