import React, { useState } from "react";
import { useLoaderData, useNavigate, useSubmit } from "react-router";
import {
  Page, Layout, Card, Text, Button, BlockStack, Banner, Box, Icon,
  InlineStack, Badge, Grid, List, Divider
} from "@shopify/polaris";
import {
  HomeIcon, ViewIcon, DiamondIcon, SettingsIcon, StarIcon
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

const translations = {
  zh: {
    dashboardTitle: "Vision3D 核心控制台",
    dashboardSubtitle: "欢迎回来！在此监控全店 3D 资产健康度与移动端 AR 订阅权限状态。",
    planTitle: "您的当前套餐方案",
    syncStatus: "数据状态实时同步中",
    manageAssetsBtn: "进入 3D / AR 资产管理中心 →",
    statTitleModel: "已绑定 3D 模型商品",
    statTitleAr: "已激活手机端 AR 实景",
    limitLocked: "已锁定 (升级解锁)",
    cardPlanTitle: "套餐功能矩阵与版本对比",
    btnUpgrade: "立即订阅 / 切换套餐",
    btnCurrent: "当前正在使用",
    featureTitle: "核心尊享权益",
    unlimited: "无上限",
    renewDate: "下一个账单结算日: ",
    supportTitle: "技术支持与上架协助",
    supportText: "如果您在 3D 模型格式压缩、Draco 优化或苹果 iOS 兼容端编译中遇到任何技术瓶颈，欢迎随时联系我们的 24/7 技术专家组。"
  },
  en: {
    dashboardTitle: "Vision3D Core Dashboard",
    dashboardSubtitle: "Welcome back! Monitor your 3D asset health and mobile AR subscription matrix.",
    planTitle: "Your Subscription Plan",
    syncStatus: "Data synced with Shopify billing live",
    manageAssetsBtn: "Manage 3D / AR Assets →",
    statTitleModel: "Linked 3D Products",
    statTitleAr: "AR Activated Products",
    limitLocked: "Locked (Upgrade to unlock)",
    cardPlanTitle: "Subscription Tier Matrix",
    btnUpgrade: "Upgrade / Switch Plan",
    btnCurrent: "Current Plan",
    featureTitle: "Included Features",
    unlimited: "Unlimited",
    renewDate: "Next billing date: ",
    supportTitle: "Technical Support",
    supportText: "If you experience issues with 3D model compression, Draco optimization, or iOS compilation, reach out to our 24/7 engineering team."
  }
};

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // 📡 1. 实时拉取真实的店铺订阅账单状态与额外坑位元字段
  const subResponse = await admin.graphql(`
    #graphql
    query getActiveSubscriptionAndMetafields {
      shop { id }
      currentAppInstallation {
        id
        extraSlotsField: metafield(namespace: "custom", key: "extra_slots") { value }
        activeSubscriptions {
          id
          name
          status
          currentPeriodEnd
        }
        allSubscriptions: appSubscriptions(first: 5) {
          edges {
            node {
              name
              status
              currentPeriodEnd
            }
          }
        }
      }
    }
  `);

  const subJson = await subResponse.json();
  const shopId = subJson.data?.shop?.id;
  const activeSubs = subJson.data?.currentAppInstallation?.activeSubscriptions || [];
  const allSubsEdges = subJson.data?.currentAppInstallation?.allSubscriptions?.edges || [];
  const extraSlots = parseInt(subJson.data?.currentAppInstallation?.extraSlotsField?.value || "0", 10);

  let currentPlan = "free"; 
  let nextBillingDate = null; 

  // 💎 2. 去模糊化精确身份对账（彻底剥离 enterPROise 字母冲突漏洞）
  if (activeSubs.length > 0 && activeSubs[0].status === "ACTIVE") {
    nextBillingDate = activeSubs[0].currentPeriodEnd ? new Date(activeSubs[0].currentPeriodEnd).toLocaleDateString() : null;
    if (activeSubs[0].name.includes("Professional")) currentPlan = "pro";
    else if (activeSubs[0].name.includes("Enterprise")) currentPlan = "enterprise";
  } else {
    const cancelledSub = allSubsEdges.find(({ node }) => node.status === "CANCELLED");
    if (cancelledSub) {
      const periodEnd = new Date(cancelledSub.node.currentPeriodEnd);
      if (periodEnd > new Date()) {
        nextBillingDate = periodEnd.toLocaleDateString(); 
        if (cancelledSub.node.name.includes("Professional")) currentPlan = "pro_cancelled";
        else if (cancelledSub.node.name.includes("Enterprise")) currentPlan = "enterprise_cancelled";
      }
    }
  }

  // 🔄 3. 映射前台 Liquid 元字段强力对账（首字母大写）
  let expectedMetaValue = "Free";
  if (currentPlan === "pro" || currentPlan === "pro_cancelled") {
    expectedMetaValue = "Professional";
  } else if (currentPlan === "enterprise" || currentPlan === "enterprise_cancelled") {
    expectedMetaValue = "Enterprise";
  }

  try {
    const shopMetaRes = await admin.graphql(`
      #graphql
      query getShopPlanMeta {
        shop { metafield(namespace: "product_3d_app", key: "plan_level") { value } }
      }
    `);
    const shopMetaJson = await shopMetaRes.json();
    const currentMetaPlanValue = shopMetaJson.data?.shop?.metafield?.value || "";

    if (currentMetaPlanValue !== expectedMetaValue) {
      await admin.graphql(`
        #graphql
        mutation syncShopPlanMetafield($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) { metafields { id } }
        }
      `, {
        variables: {
          metafields: [{
            ownerId: shopId,
            namespace: "product_3d_app",
            key: "plan_level",
            type: "single_line_text_field",
            value: expectedMetaValue
          }]
        }
      });
    }
  } catch (err) {
    console.error("元字段同步失败:", err);
  }

  // 📊 4. 统计当前店铺真实的商品 3D/AR 绑定数量数据
  const response = await admin.graphql(`
    #graphql
    query getStoreStats {
      products(first: 250) {
        edges {
          node {
            modelUrlField: metafield(namespace: "custom", key: "product_3d_model") { value }
            arEnabledField: metafield(namespace: "custom", key: "ar_enabled") { value }
          }
        }
      }
    }
  `);

  const responseJson = await response.json();
  const edges = responseJson.data?.products?.edges || [];
  const modelActiveCount = edges.filter(e => !!e.node.modelUrlField?.value).length;
  const arActiveCount = edges.filter(e => e.node.arEnabledField?.value === "true").length;

  return { currentPlan, modelActiveCount, arActiveCount, nextBillingDate, extraSlots };
};

export default function AppDashboard() {
  const { currentPlan, modelActiveCount, arActiveCount, nextBillingDate, extraSlots } = useLoaderData();
  const navigate = useNavigate();
  const submit = useSubmit();
  const [locale, setLocale] = useState("zh");

  const t = translations[locale];

  const getArLimitDisplay = () => {
    if (currentPlan.startsWith("enterprise")) return `${arActiveCount} / ${t.unlimited}`;
    if (currentPlan.startsWith("pro")) return `${arActiveCount} / ${10 + extraSlots}`;
    return t.limitLocked; 
  };

  const getModelLimitDisplay = () => {
    if (currentPlan === "free") return `${modelActiveCount} / 3`;
    return `${modelActiveCount} / ${t.unlimited}`;
  };

  const getPlanBadge = () => {
    if (currentPlan.startsWith("enterprise")) return <Badge tone="warning" progress="complete">Enterprise 旗舰企业版</Badge>;
    if (currentPlan.startsWith("pro")) return <Badge tone="info" progress="complete">Professional 专业出海版</Badge>;
    return <Badge tone="attention">Basic Free 免费基础版</Badge>;
  };

  const handlePlanAction = (planName) => {
    submit({ actionType: "subscribe", planName }, { method: "POST", action: "/app/billing" });
  };

  return (
    <Page
      title={t.dashboardTitle}
      subtitle={t.dashboardSubtitle}
      secondaryActions={[
        {
          content: locale === "zh" ? "English" : "简体中文",
          onAction: () => setLocale(prev => prev === "zh" ? "en" : "zh")
        }
      ]}
    >
      <BlockStack gap="500">
        <Banner tone="info" icon={HomeIcon}>
          <InlineStack align="space-between" blockAlign="center" style={{ width: '100%' }}>
            <Box>
              <Text as="span" variant="bodyMd">{t.planTitle}: </Text>
              {getPlanBadge()}
              {nextBillingDate && <Text as="span" variant="bodySm" tone="subdued"> ({t.renewDate}{nextBillingDate})</Text>}
            </Box>
            <Text as="span" variant="bodySm" tone="success">● {t.syncStatus}</Text>
          </InlineStack>
        </Banner>

        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6 }}>
            <Card>
              <BlockStack gap="200" align="center">
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={ViewIcon} tone="brand" />
                  <Text variant="headingSm" tone="subdued">{t.statTitleModel}</Text>
                </InlineStack>
                <Box paddingBlockStart="200">
                  <Text variant="heading3xl" as="h2">{getModelLimitDisplay()}</Text>
                </Box>
              </BlockStack>
            </Card>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6 }}>
            <Card>
              <BlockStack gap="200" align="center">
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={DiamondIcon} tone="warning" />
                  <Text variant="headingSm" tone="subdued">{t.statTitleAr}</Text>
                </InlineStack>
                <Box paddingBlockStart="200">
                  <Text variant="heading3xl" as="h2">{getArLimitDisplay()}</Text>
                </Box>
              </BlockStack>
            </Card>
          </Grid.Cell>
        </Grid>

        <Box textAlign="center" paddingBlock="200">
          <Button variant="primary" size="large" onClick={() => navigate("/app/additional" + window.location.search)}>
            {t.manageAssetsBtn}
          </Button>
        </Box>

        <Card title={t.cardPlanTitle}>
          <Box paddingBlockEnd="300"><Text variant="headingMd" as="h3">{t.cardPlanTitle}</Text></Box>
          <Grid gap="400">
            <Grid.Cell columnSpan={{ xs: 12, sm: 4, md: 4, lg: 4 }}>
              <Box borderStyle="solid" borderWidth="100" borderColor="border" borderRadius="300" padding="400" minHeight="360px">
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h4">Basic Free</Text>
                  <Text variant="heading2xl" as="p">$0 <Text as="span" variant="bodySm" tone="subdued">/ month</Text></Text>
                  <Divider />
                  <Text variant="bodySm" fontWeight="bold">{t.featureTitle}:</Text>
                  <List>
                    <List.Item>支持至多添加 3 款商品的 3D 模型</List.Item>
                    <List.Item tone="subdued">❌ 手机端移动 AR 实景空间投影</List.Item>
                    <List.Item tone="subdued">❌ 苹果 iOS 兼容生态 USDZ 格式自动编译</List.Item>
                  </List>
                  <Box paddingBlockStart="400">
                    <Button fullWidth disabled={currentPlan === "free"}>
                      {currentPlan === "free" ? t.btnCurrent : "免费版"}
                    </Button>
                  </Box>
                </BlockStack>
              </Box>
            </Grid.Cell>

            <Grid.Cell columnSpan={{ xs: 12, sm: 4, md: 4, lg: 4 }}>
              <Box borderStyle="solid" borderWidth="200" borderColor="border-brand" borderRadius="300" padding="400" minHeight="360px" background="bg-surface-selected">
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text variant="headingMd" as="h4">Professional</Text>
                    <Badge tone="info" size="small"><InlineStack gap="050" blockAlign="center"><Icon source={StarIcon} size="small" />爆款推荐</InlineStack></Badge>
                  </InlineStack>
                  <Text variant="heading2xl" as="p">$29.99 <Text as="span" variant="bodySm" tone="subdued">/ month</Text></Text>
                  <Divider />
                  <Text variant="bodySm" fontWeight="bold">{t.featureTitle}:</Text>
                  <List>
                    <List.Item><b>{t.unlimited}</b> 全店商品 3D 交互配置模型</List.Item>
                    <List.Item><b>包含首发 10 款商品</b> 移动端 AR 实景名额</List.Item>
                    <List.Item><b>💎 超额弹性按量扩容：只需加购 $1.99/个/月 额外购买坑位费，额度按需无上限开通！</b></List.Item>
                    <List.Item>全自动完成苹果 iOS 专用格式无损交叉编译</List.Item>
                  </List>
                  <Box paddingBlockStart="100">
                    <Button fullWidth variant={currentPlan.startsWith("pro") ? "secondary" : "primary"} disabled={currentPlan.startsWith("pro")} onClick={() => handlePlanAction("Professional")}>
                      {currentPlan.startsWith("pro") ? t.btnCurrent : t.btnUpgrade}
                    </Button>
                  </Box>
                </BlockStack>
              </Box>
            </Grid.Cell>

            <Grid.Cell columnSpan={{ xs: 12, sm: 4, md: 4, lg: 4 }}>
              <Box borderStyle="solid" borderWidth="100" borderColor="border" borderRadius="300" padding="400" minHeight="360px">
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h4">Enterprise</Text>
                  <Text variant="heading2xl" as="p">$49.99 <Text as="span" variant="bodySm" tone="subdued">/ month</Text></Text>
                  <Divider />
                  <Text variant="bodySm" fontWeight="bold">{t.featureTitle}:</Text>
                  <List>
                    <List.Item><b>{t.unlimited}</b> 全店商品 3D 模型资产配置</List.Item>
                    <List.Item><b>{t.unlimited} 全大货商品无限制 100% 激活 AR 投影功能</b></List.Item>
                    <List.Item>无需任何额外加购坑位费，全场通车</List.Item>
                    <List.Item>尊享高阶大附件云端加载节点加速</List.Item>
                    <List.Item>一对一专属独立站 3D 上架工程协助</List.Item>
                  </List>
                  <Box paddingBlockStart="200">
                    <Button fullWidth variant={currentPlan.startsWith("enterprise") ? "secondary" : "primary"} disabled={currentPlan.startsWith("enterprise")} onClick={() => handlePlanAction("Enterprise")}>
                      {currentPlan.startsWith("enterprise") ? t.btnCurrent : t.btnUpgrade}
                    </Button>
                  </Box>
                </BlockStack>
              </Box>
            </Grid.Cell>
          </Grid>
        </Card>

        <Card>
          <BlockStack gap="200">
            <InlineStack gap="200" blockAlign="center">
              <Icon source={SettingsIcon} tone="base" />
              <Text variant="headingSm" as="h3">{t.supportTitle}</Text>
            </InlineStack>
            <Text as="p" tone="subdued">{t.supportText}</Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}