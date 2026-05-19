import React, { useState } from "react";
import { useLoaderData, useSubmit, useActionData } from "react-router";
import {
  Page, Layout, Card, ResourceList, ResourceItem, Avatar, Text,
  TextField, Button, InlineStack, BlockStack, Badge, Box, Modal
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

// 🧮 统一纯数字白名单清洗算子：根据当前最新套餐，强制对齐店铺级前台渲染白名单
async function syncAllowedProductsWhitelist(admin, shopId, currentPlan) {
  const allProductsRes = await admin.graphql(`
    #graphql
    query getBoundProducts {
      products(first: 250) {
        edges {
          node {
            id
            modelUrlField: metafield(namespace: "custom", key: "product_3d_model") { value }
          }
        }
      }
    }
  `);
  const allJson = await allProductsRes.json();
  const edges = allJson.data?.products?.edges || [];
  
  // 过滤出所有已经绑定了 3D 模型的商品的纯数字 ID
  const boundProductIds = edges
    .filter(e => !!e.node.modelUrlField?.value)
    .map(e => e.node.id.replace("gid://shopify/Product/", ""));

  let whitelistString = "";
  if (currentPlan === "free") {
    // 免费版硬拦截：前台 Liquid 只放行最前 3 个绑定的模型，其余全部拒之门外
    whitelistString = boundProductIds.slice(0, 3).join(",");
  } else {
    // 付费方案（专业版、企业版）全量通车放行
    whitelistString = boundProductIds.join(",");
  }

  // 刷入全局产品级别名额白名单店铺元字段
  await admin.graphql(`
    #graphql
    mutation setShopWhitelist($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) { metafields { id value } }
    }
  `, {
    variables: {
      metafields: [{
        ownerId: shopId,
        namespace: "product_3d_app",
        key: "allowed_products",
        type: "single_line_text_field",
        value: whitelistString
      }]
    }
  });
}

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // 📡 1. 拉取店铺元字段、账单详情及已购弹性坑位
  const storeQuery = await admin.graphql(`
    #graphql
    query getStoreBillingAndSlots {
      shop { id }
      currentAppInstallation {
        extraSlotsField: metafield(namespace: "custom", key: "extra_slots") { value }
        activeSubscriptions { name status }
      }
    }
  `);
  const storeJson = await storeQuery.json();
  const shopId = storeJson.data?.shop?.id;
  const activeSubs = storeJson.data?.currentAppInstallation?.activeSubscriptions || [];
  const extraSlots = parseInt(storeJson.data?.currentAppInstallation?.extraSlotsField?.value || "0", 10);

  let currentPlan = "free";
  if (activeSubs.length > 0 && activeSubs[0].status === "ACTIVE") {
    if (activeSubs[0].name.includes("Professional")) currentPlan = "pro";
    else if (activeSubs[0].name.includes("Enterprise")) currentPlan = "enterprise";
  }

  // 📡 2. 获取商品列表及模型元字段
  const response = await admin.graphql(`
    #graphql
    query getProductsWith3D {
      products(first: 50) {
        edges {
          node {
            id
            title
            handle
            featuredImage { url }
            modelUrlField: metafield(namespace: "custom", key: "product_3d_model") { value }
            arEnabledField: metafield(namespace: "custom", key: "ar_enabled") { value }
          }
        }
      }
    }
  `);

  const responseJson = await response.json();
  const products = (responseJson.data?.products?.edges || []).map(edge => ({
    id: edge.node.id,
    title: edge.node.title,
    handle: edge.node.handle,
    image: edge.node.featuredImage?.url || "",
    modelUrl: edge.node.modelUrlField?.value || "",
    arEnabled: edge.node.arEnabledField?.value === "true"
  }));

  const currentBoundCount = products.filter(p => !!p.modelUrl).length;
  const activeArCount = products.filter(p => p.arEnabled).length;

  return { products, currentPlan, currentBoundCount, activeArCount, extraSlots, shopId };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");
  const productId = formData.get("productId");

  // 获取当前最新的实时配额底线数据，严防越界注入
  const storeQuery = await admin.graphql(`
    #graphql
    query getActionContext {
      shop { id }
      currentAppInstallation {
        extraSlotsField: metafield(namespace: "custom", key: "extra_slots") { value }
        activeSubscriptions { name status }
      }
    }
  `);
  const storeJson = await storeQuery.json();
  const shopId = storeJson.data?.shop?.id;
  const activeSubs = storeJson.data?.currentAppInstallation?.activeSubscriptions || [];
  const extraSlots = parseInt(storeJson.data?.currentAppInstallation?.extraSlotsField?.value || "0", 10);

  let currentPlan = "free";
  if (activeSubs.length > 0 && activeSubs[0].status === "ACTIVE") {
    if (activeSubs[0].name.includes("Professional")) currentPlan = "pro";
    else if (activeSubs[0].name.includes("Enterprise")) currentPlan = "enterprise";
  }

  // 统计已绑定与已开通 AR 总数
  const countRes = await admin.graphql(`
    #graphql
    query actionCountQuery {
      products(first: 250) {
        edges {
          node {
            id
            modelUrlField: metafield(namespace: "custom", key: "product_3d_model") { value }
            arEnabledField: metafield(namespace: "custom", key: "ar_enabled") { value }
          }
        }
      }
    }
  `);
  const countJson = await countRes.json();
  const countEdges = countJson.data?.products?.edges || [];
  const currentBoundCount = countEdges.filter(e => !!e.node.modelUrlField?.value).length;
  const activeArCount = countEdges.filter(e => e.node.arEnabledField?.value === "true").length;

  // 1️⃣ 绑定逻辑校验与核销
  if (actionType === "bind") {
    const modelUrl = formData.get("modelUrl");
    const targetProduct = countEdges.find(e => e.node.id === productId);
    const hasExistingModel = !!targetProduct?.node?.modelUrlField?.value;

    if (currentPlan === "free" && currentBoundCount >= 3 && !hasExistingModel) {
      return { success: false, error: "FREE_MODEL_LIMIT_HIT" };
    }

    await admin.graphql(`
      #graphql
      mutation setProduct3DModel($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) { metafields { id } }
      }
    `, {
      variables: {
        metafields: [{
          ownerId: productId,
          namespace: "custom",
          key: "product_3d_model",
          type: "url",
          value: modelUrl
        }]
      }
    });

    await syncAllowedProductsWhitelist(admin, shopId, currentPlan);
    return { success: true };
  }

  // 2️⃣ 解绑逻辑
  if (actionType === "unbind") {
    await admin.graphql(`
      #graphql
      mutation unbind3DModel($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) { metafields { id } }
      }
    `, {
      variables: {
        metafields: [
          { ownerId: productId, namespace: "custom", key: "product_3d_model", type: "url", value: "" },
          { ownerId: productId, namespace: "custom", key: "ar_enabled", type: "single_line_text_field", value: "false" }
        ]
      }
    });

    await syncAllowedProductsWhitelist(admin, shopId, currentPlan);
    return { success: true };
  }

  // 3️⃣ 移动端 AR 状态切换开关
  if (actionType === "toggle_ar") {
    const currentStatus = formData.get("currentStatus") === "true";
    const targetStatus = !currentStatus;

    if (targetStatus && currentPlan === "free") {
      return { success: false, error: "FREE_AR_LOCKED" };
    }

    if (targetStatus && currentPlan === "pro" && activeArCount >= (10 + extraSlots)) {
      return { success: false, error: "PRO_SLOT_LIMIT_HIT" };
    }

    await admin.graphql(`
      #graphql
      mutation toggleArStatus($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) { metafields { id } }
      }
    `, {
      variables: {
        metafields: [{
          ownerId: productId,
          namespace: "custom",
          key: "ar_enabled",
          type: "single_line_text_field",
          value: targetStatus ? "true" : "false"
        }]
      }
    });

    return { success: true };
  }

  return { success: false };
};

export default function AdditionalPage() {
  const { products, currentPlan, currentBoundCount, activeArCount, extraSlots } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();

  const [activeProduct, setActiveProduct] = useState(null);
  const [modelUrl, setModelUrl] = useState("");
  const [showSlotModal, setShowSlotModal] = useState(false);

  const isFreeAndLimitHit = currentPlan === "free" && currentBoundCount >= 3;

  const handleBindClick = (product) => {
    setActiveProduct(product);
    setModelUrl(product.modelUrl || "");
  };

  const handleSaveModel = () => {
    submit({ actionType: "bind", productId: activeProduct.id, modelUrl }, { method: "POST" });
    setActiveProduct(null);
  };

  const handleUnbind = (id) => {
    if (confirm("确定要移除该商品的 3D 模型吗？前台相关展示及 AR 权限将同步关闭。")) {
      submit({ actionType: "unbind", productId: id }, { method: "POST" });
    }
  };

  const handleToggleAr = (id, currentStatus) => {
    const isEnabling = !currentStatus;
    if (isEnabling && currentPlan === "free") {
      alert("⚠️ 移动端实景 AR 功能属于专业版专享权益，请先去控制台主页升级套餐解锁。");
      return;
    }
    if (isEnabling && currentPlan === "pro" && activeArCount >= (10 + extraSlots)) {
      setShowSlotModal(true);
      return;
    }
    submit({ actionType: "toggle_ar", productId: id, currentStatus: currentStatus.toString() }, { method: "POST" });
  };

  const handleBuySlot = () => {
    setShowSlotModal(false);
    submit({ actionType: "buy_slot" }, { method: "POST", action: "/app/billing" });
  };

  return (
    <Page title="3D / AR 资产管理中心" subtitle="为店铺商品精准链接 3D 点云格式并一键分发手机移动端 AR 空间投影白名单。">
      <Layout>
        <Layout.Section>
          {actionData?.error === "FREE_MODEL_LIMIT_HIT" && (
            <Box paddingBlockEnd="400">
              <Badge tone="critical">🚨 触发免费版强拦截：免费基础版最多仅支持绑定 3 款商品模型，请升级套餐。</Badge>
            </Box>
          )}

          <Card padding="0">
            <ResourceList
              resourceName={{ singular: "商品", plural: "商品列表" }}
              items={products}
              renderItem={(item) => {
                const { id, title, image, modelUrl: currentModelUrl, arEnabled } = item;
                const media = <Avatar customer size="md" name={title} src={image} />;
                
                return (
                  <ResourceItem id={id} media={media} accessibilityLabel={`查看 ${title}`}>
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="bold">{title}</Text>
                        <InlineStack gap="200">
                          {currentModelUrl ? (
                            <Badge tone="success">🟢 3D 交互就绪</Badge>
                          ) : (
                            <Badge tone="subdued">⚪ 暂无模型</Badge>
                          )}
                          {arEnabled && <Badge tone="warning">💎 AR 实景已激活</Badge>}
                        </InlineStack>
                      </BlockStack>

                      <InlineStack gap="300">
                        {currentModelUrl ? (
                          <>
                            <Button size="slim" onClick={() => handleBindClick(item)}>更新模型</Button>
                            <Button size="slim" tone="critical" onClick={() => handleUnbind(id)}>移除模型</Button>
                            <Button 
                              size="slim" 
                              variant={arEnabled ? "primary" : "secondary"}
                              onClick={() => handleToggleAr(id, arEnabled)}
                            >
                              {arEnabled ? "关闭移动端 AR" : "激活移动端 AR"}
                            </Button>
                          </>
                        ) : (
                          <Button 
                            size="slim" 
                            variant="primary" 
                            disabled={isFreeAndLimitHit} 
                            onClick={() => handleBindClick(item)}
                          >
                            {isFreeAndLimitHit ? "名额已满" : "链接 3D 模型"}
                          </Button>
                        )}
                      </InlineStack>
                    </InlineStack>
                  </ResourceItem>
                );
              }}
            />
          </Card>
        </Layout.Section>
      </Layout>

      {/* 1. 模型上传绑定通用弹窗 */}
      {activeProduct && (
        <Modal
          open={true}
          onClose={() => setActiveProduct(null)}
          title={`配置商品 3D 模型链接: ${activeProduct.title}`}
          primaryAction={{ content: "保存并推送前台", onAction: handleSaveModel }}
          secondaryActions={[{ content: "取消", onAction: () => setActiveProduct(null) }]}
        >
          <Modal.Section>
            <TextField
              label="3D 模型文件托管 URL (支持 .gltf / .glb 格式)"
              value={modelUrl}
              onChange={(val) => setModelUrl(val)}
              autoComplete="off"
              placeholder="https://cdn.shopify.com/.../your_model.glb"
              helpText="请将您经过 Draco 算法压缩后的 3D 模型文件上传至 Shopify Files (文件管理)，然后将生成的 CDN 链接粘贴到此处。"
            />
          </Modal.Section>
        </Modal>
      )}

      {/* 2. $1.99 超额加购弹性名额确认弹窗 */}
      <Modal
        open={showSlotModal}
        onClose={() => setShowSlotModal(false)}
        title="💎 购买超额弹性 AR 激活名额"
        primaryAction={{ content: "同意并购买 ($1.99/个/月)", onAction: handleBuySlot }}
        secondaryActions={[{ content: "我再想想", onAction: () => setShowSlotModal(false) }]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Text as="p">
              您当前使用的是 **Professional 专业出海版**（套餐内包含 10 个免费 AR 商品名额）。
            </Text>
            <Text as="p" tone="subdued">
              目前您的 10 个免费名额已全部用满。根据应用市场计费规则，您可以采用**弹性按量付费模式**以 **$1.99/款商品/月** 的专属折扣价，单独对当前商品扩容解锁。费用将无缝并入您的下期 Shopify 官方统一账单。
            </Text>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}