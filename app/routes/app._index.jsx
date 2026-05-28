import React, { useState, useCallback, useEffect } from "react";
import { useLoaderData, useActionData, useSubmit, useLocation, useNavigate } from "@remix-run/react"; 
import { json } from "@remix-run/node"; 
import {
  Page, Layout, Text, Card, Button, BlockStack, Banner, Divider, Box, Badge,
  Icon, InlineGrid, InlineStack, Popover, ActionList, Toast, Frame,
} from "@shopify/polaris";
import {
  MagicIcon, DatabaseIcon, AutomationIcon, LanguageIcon, CheckCircleIcon, AlertBubbleIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server"; 
import prisma from "../db.server"; 

const PLAN_PRO = "Vision3D Professional Plan";
const PLAN_ENT = "Vision3D Enterprise Plan";

const translations = {
  zh: {
    langName: "简体中文",
    title: "Vision3D 控制台",
    planStarter: "免费基础版",
    planPro: "专业出海版",
    planEnterprise: "旗舰企业版",
    msgStarter: "您当前处于免费版（AR功能已锁定）。行业数据显示，开启手机端 AR 实景预览能降低 30% 退货率！升级到专业版立刻解锁高级商品的 AR 投影功能。",
    msgPro: "专业出海版已激活！您已解锁 10 款商品的高级 AR 投影功能，超出部分自动支持超额弹性按量。下期续费日期：{date}。",
    msgEnterprise: "旗舰企业版已激活！全店所有商品 AR 投影不设上限完全解冻，VIP 专属高速光影渲染已就位。下期续费日期：{date}。",
    msgCancelled: "您的套餐自动续费已关闭，高级权益仍保留至：{date}。到期后系统将自动降级为免费基础版。",
    statusActive: "已激活",
    statusEnding: "服务即将到期",
    setupTitle: "快速配置引导",
    setupBadgeReady: "配置就绪",
    setupBadgePending: "待操作",
    step1: "上传模型",
    step1Desc: "在管理面板为商品绑定 3D 模型",
    step2: "控制 AR",
    step2Desc: "根据您的套餐激活商品 AR 开关",
    step3: "发布生效",
    step3Desc: "在 Shopify 主题中添加并发布模块",
    btnEditor: "进入主题编辑器",
    btnFiles: "管理文件",
    btnGoManage: "进入 3D 与 AR 管理中心",
    insightTitle: "核心数据统计 (ROI)",
    statViews: "3D 互动次数",        
    statAR: "AR 唤醒总量",           
    statTime: "平均模型互动时间",        
    statSub: "当前 AR 额度占用", 
    limitLocked: "0 / 0 (免费版锁定 AR 功能)",
    planSelectTitle: "💎 请为您的店铺选择更具商业效益的 Vision3D 套餐",
    tierFreeName: "免费基础版",
    tierFreeF1: "限制只能激活 3 款商品的 3D 模型",
    tierFreeF2: "标准服务器网速，加载速度一般",
    tierFreeF3: "保留 Vision3D 官方品牌水印",
    tierFreeF4: "🚫 禁用任何手机端 AR 空间投影功能",
    tierFreePrice: "/ 终身免费",
    btnNA: "额度不可降级",
    tierProName: "专业出海版",
    tierProF1: "网页端 3D 旋转查看不限商品数量",
    tierProF2: "🌟 允许 10 款核心商品开启 AR 实景预览",
    tierProF3: "100% 彻底移除全店品牌水印",
    tierProF4: "享受全球 CDN 静态资产极速加载加速",
    tierProF5: "解锁完整的 ROI 互动统计看板",
    tierProPrice: "/ 每 30 天",
    trialText: "✨ 包含 3 天免费试用 (超出 10 款后按 $1.99/款/月 灵活计费)", 
    tierEntName: "旗舰企业版",
    tierEntF1: "包含专业版所有的全部高级权益",
    tierEntF2: "🚀 全店商品 AR 空间投影完全不限数量",
    tierEntF3: "优先分配环境高级光影渲染服务器节点",
    tierEntF4: "支持商品多属性 (Variants) 动态 3D 联动",
    tierEntF5: "7×24 小时技术专家 1对1 帮扶导入服务",
    entNoTrial: "👑 订阅即享 VIP 专属算力与稳定性保障",
    btnCurrent: "正在使用当前套餐",
    btnUpgrade: "开始 3 天免费试用",
    btnUpgradeEnt: "立即开通旗舰企业版",
    cancelHint: "不喜欢了？您可以随时在此处安全退订或管理您的自动续费权益。",
    btnCancel: "关闭自动续费", 
    confirmCancel: "确定要关闭当前高级套餐的自动续费吗？",
    toastMsg: "正在安全跳转至 Shopify 官方结算中心...",
  },
  en: {
    langName: "English",
    title: "Vision3D Dashboard",
    planStarter: "Basic Free Plan",
    planPro: "Professional Plan",
    planEnterprise: "Enterprise Plan",
    msgStarter: "You are currently on the Free Plan (AR features locked). Active AR previews cut returns by 30%! Upgrade to Professional to unlock AR features.",
    msgPro: "Professional Plan active! You have unlocked AR features for 10 products with overage billing allowed. Next billing date: {date}.",
    msgEnterprise: "Enterprise Plan active! Full-store AR unlocked with zero limits and priority HD shadow rendering. Next billing date: {date}.",
    msgCancelled: "Auto-renewal turned off. Your features remain active until: {date}. Plan will downgrade to Free after expiry.",
    statusActive: "Active",
    statusEnding: "Plan Ending Soon",
    setupTitle: "Quick Setup Guide",
    setupBadgeReady: "Ready",
    setupBadgePending: "Action Required",
    step1: "Upload Model",
    step1Desc: "Link 3D models to your products",
    step2: "Control AR",
    step2Desc: "Toggle product AR based on your plan",
    step3: "Publish Live",
    step3Desc: "Add block to your Shopify Theme",
    btnEditor: "Open Theme Editor",
    btnFiles: "Manage Files",
    btnGoManage: "Go to 3D & AR Assets Manager",
    insightTitle: "Core Insights (ROI)",
    statViews: "3D Interactions",
    statAR: "AR Viewings",
    statTime: "Avg. Engage Time",
    statLimit: "AR Quota Usage",
    limitLocked: "0 / 0 (AR Locked)",
    planSelectTitle: "💎 Select a High-Conversion Plan for Your Store",
    tierFreeName: "Basic Free Plan",
    tierFreeF1: "Up to 3 active 3D models",
    tierFreeF2: "Standard server loading speed",
    tierFreeF3: "Vision3D brand watermark included",
    tierFreeF4: "🚫 No mobile AR projection feature",
    tierFreePrice: "/ Forever",
    btnNA: "N/A",
    tierProName: "Professional Plan",
    tierProF1: "Unlimited web-based 3D model rotation",
    tierProF2: "🌟 10 products quota for mobile AR views",
    tierProF3: "100% remove brand watermark",
    tierProF4: "Global CDN acceleration for fast loading",
    tierProF5: "Unlock full ROI performance dashboard",
    tierProPrice: "/ mo",
    trialText: "✨ Includes 3-Day Free Trial (Flexible $1.99/mo per extra active item)", 
    tierEntName: "Enterprise Plan",
    tierEntF1: "Everything in Professional Plan",
    tierEntF2: "🚀 Unlimited products for mobile AR views",
    tierEntF3: "Priority access to premium HD rendering servers",
    tierEntF4: "Dynamic multi-variant (Variants) 3D sync",
    tierEntF5: "24/7 priority 1-on-1 expert technical support",
    entNoTrial: "👑 Dedicated server speed & premium SLA guarantees",
    btnCurrent: "Current Plan",
    btnUpgrade: "Start 3-Day Free Trial",
    btnUpgradeEnt: "Upgrade to Enterprise Plan",
    cancelHint: "Cancel auto-renewal at any time without hassle.",
    btnCancel: "Cancel Auto-Renewal",
    confirmCancel: "Are you sure you want to cancel your auto-renewal?",
    toastMsg: "Redirecting to Shopify Billing Engine...",
  }
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent"); 
  const appUrl = process.env.SHOPIFY_APP_URL || new URL(request.url).origin;

  let planName = "";
  let planPrice = 0.0;
  let trialDaysConfig = 0; 

  if (intent === "upgrade_pro") {
    planName = PLAN_PRO; 
    planPrice = 29.99;
    trialDaysConfig = 3; 
  } else if (intent === "upgrade_enterprise") {
    planName = PLAN_ENT; 
    planPrice = 49.99;
    trialDaysConfig = 0; 
  } else if (intent === "cancel") {
    const subscriptionId = formData.get("subscriptionId"); 
    await admin.graphql(
      `#graphql
      mutation appSubscriptionCancel($id: ID!) {
        appSubscriptionCancel(id: $id) { appSubscription { id status } }
      }`,
      { variables: { id: subscriptionId } }
    );
    return json({ canceled: true });
  } else {
    return null;
  }

  const lineItemsPayload = [
    { 
      plan: { 
        appRecurringPricingDetails: { 
          price: { amount: planPrice, currencyCode: "USD" }, 
          interval: "EVERY_30_DAYS" 
        } 
      } 
    }
  ];

  if (intent === "upgrade_pro") {
    lineItemsPayload.push({
      plan: {
        appUsagePricingDetails: {
          terms: "Vision3D Extra AR product preview ($1.99 per extra active model overage)",
          cappedAmount: { amount: 100.00, currencyCode: "USD" }
        }
      }
    });
  }

  const isTestBilling = process.env.NODE_ENV === "development";

  const response = await admin.graphql(
    `#graphql
    mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int, $test: Boolean) {
      appSubscriptionCreate(name: $name, lineItems: $lineItems, returnUrl: $returnUrl, trialDays: $trialDays, test: $test) { confirmationUrl }
    }`,
    {
      variables: {
        name: planName,
        returnUrl: `${appUrl}/app`,
        trialDays: trialDaysConfig > 0 ? trialDaysConfig : null, 
        test: isTestBilling, 
        lineItems: lineItemsPayload
      }
    }
  );
  const responseJson = await response.json();
  return json({ confirmationUrl: responseJson.data?.appSubscriptionCreate?.confirmationUrl });
};

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
    query getAppSubscriptionWithMetafields {
      shop { 
        id 
        planLevelField: metafield(namespace: "product_3d_app", key: "plan_level") { value }
      }
      currentAppInstallation {
        activeSubscriptions { id name status currentPeriodEnd }
        allSubscriptions(first: 10) { edges { node { name status currentPeriodEnd } } }
      }
    }`
  );

  const responseJson = await response.json();
  const shopId = responseJson.data?.shop?.id;
  const activeSubs = responseJson.data?.currentAppInstallation?.activeSubscriptions || [];
  const allSubsEdges = responseJson.data?.currentAppInstallation?.allSubscriptions?.edges || [];
  const currentMetaPlanValue = responseJson.data?.shop?.planLevelField?.value || "";

  let currentPlan = "free"; 
  let subscriptionId = null; 
  let rawDate = null; 

  if (activeSubs.length > 0 && activeSubs[0].status === "ACTIVE") {
    subscriptionId = activeSubs[0].id; 
    rawDate = activeSubs[0].currentPeriodEnd; 
    if (activeSubs[0].name === PLAN_PRO) currentPlan = "pro";
    if (activeSubs[0].name === PLAN_ENT) currentPlan = "enterprise";
  } else {
    const cancelledSub = allSubsEdges.find(({ node }) => node.status === "CANCELLED");
    if (cancelledSub) {
      const periodEnd = new Date(cancelledSub.node.currentPeriodEnd);
      if (periodEnd > new Date()) {
        rawDate = periodEnd.toISOString(); 
        if (cancelledSub.node.name === PLAN_PRO) currentPlan = "pro_cancelled";
        if (cancelledSub.node.name === PLAN_ENT) currentPlan = "enterprise_cancelled";
      }
    }
  }

  let expectedMetaValue = "Free";
  if (currentPlan.includes("pro")) expectedMetaValue = "Professional";
  if (currentPlan.includes("enterprise")) expectedMetaValue = "Enterprise";

  if (currentMetaPlanValue !== expectedMetaValue) {
    try {
      await admin.graphql(
        `#graphql
        mutation syncShopPlanMetafield($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields { id value }
            userErrors { field message }
          }
        }`,
        {
          variables: {
            metafields: [{
              ownerId: shopId,
              namespace: "product_3d_app",
              key: "plan_level",
              type: "single_line_text_field",
              value: expectedMetaValue
            }]
          }
        }
      );
    } catch (metaErr) {
      console.error("👉 [BILLING_SYNC_ERROR] 店铺元字段同步失败:", metaErr);
    }
  }

  let arActiveCount = 0;
  let boundProductIds = [];
  try {
    const productsResponse = await admin.graphql(
      `#graphql
      query countStrictActiveAr {
        products(first: 250) {
          edges {
            node {
              id
              modelUrlField: metafield(namespace: "custom", key: "product_3d_model") { value }
              arEnabledField: metafield(namespace: "custom", key: "ar_enabled") { value }
            }
          }
        }
      }`
    );
    const productsJson = await productsResponse.json();
    const edges = productsJson.data?.products?.edges || [];

    const boundProducts = edges.filter(edge => !!edge.node.modelUrlField?.value);
    boundProductIds = boundProducts.map(edge => edge.node.id.split("/").pop());

    const validArProducts = edges.filter(edge => {
      const hasModel = !!edge.node.modelUrlField?.value;
      const isArEnabled = edge.node.arEnabledField?.value === "true";
      return hasModel && isArEnabled;
    });

    arActiveCount = validArProducts.length;
  } catch (err) {
    console.error("获取真实 AR 额度失败", err);
    arActiveCount = 0; 
  }

  let dateStr = "";
  if (rawDate) {
    const d = new Date(rawDate);
    dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  let statsData = { views: 0, arUses: 0, stayTime: "0.0s", conversion: "0%" };
  try {
    const dbStats = await prisma.appAnalytics.findUnique({ where: { shop: session.shop } });
    if (dbStats) {
      statsData.views = dbStats.views || 0;
      statsData.arUses = dbStats.arUses || 0;
      
      if (statsData.views > 0 && dbStats.totalStayTimeMs) {
        const avgMs = Number(dbStats.totalStayTimeMs) / statsData.views;
        statsData.stayTime = (avgMs / 1000).toFixed(1) + "s";
      }
      if (statsData.views > 0 && dbStats.addCartCount) {
        statsData.conversion = ((dbStats.addCartCount / statsData.views) * 100).toFixed(1) + "%";
      }
    }
  } catch (error) {
    console.error("获取真实看板数据失败", error);
  }

  return json({ shop: session.shop, currentPlan, subscriptionId, dateStr, statsData, arActiveCount });
};

export default function Index() {
  const { shop, currentPlan, subscriptionId, dateStr, statsData, arActiveCount } = useLoaderData(); 
  const actionData = useActionData(); 
  const submit = useSubmit(); 
  const location = useLocation(); 
  const navigate = useNavigate(); 

  const [locale, setLocale] = useState("en");
  const [popoverActive, setPopoverActive] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const togglePopoverActive = useCallback(() => setPopoverActive((a) => !a), []);
  const t = translations[locale];

  useEffect(() => {
    if (actionData?.confirmationUrl) {
      window.top.location.href = actionData.confirmationUrl;
    }
  }, [actionData]);

  const getBannerConfig = () => {
    if (currentPlan === "pro") return { title: `${t.planPro} (${t.statusActive})`, tone: "success", msg: t.msgPro.replace("{date}", dateStr) };
    if (currentPlan === "enterprise") return { title: `${t.planEnterprise} (${t.statusActive})`, tone: "success", msg: t.msgEnterprise.replace("{date}", dateStr) };
    if (currentPlan.endsWith("_cancelled")) return { title: t.statusEnding, tone: "critical", msg: t.msgCancelled.replace("{date}", dateStr) };
    return { title: t.planStarter, tone: "warning", msg: t.msgStarter };
  };

  const bannerConfig = getBannerConfig();

  const getLimitDisplay = () => {
    if (currentPlan.startsWith("pro")) return `${arActiveCount} / 10`;
    if (currentPlan.startsWith("enterprise")) return `${arActiveCount} / ∞`;
    return t.limitLocked;
  };

  const handleUpgrade = (tier) => {
    setShowToast(true); 
    submit({ intent: tier }, { method: "post" }); 
  };

  const handleCancel = () => {
    if (confirm(t.confirmCancel)) {
      submit({ intent: "cancel", subscriptionId }, { method: "post" }); 
    }
  };

  return (
    <Frame>
      <Page
        title={t.title}
        secondaryActions={
          <Popover active={popoverActive} activator={<Button onClick={togglePopoverActive} icon={LanguageIcon} disclosure>{t.langName}</Button>} onClose={togglePopoverActive}>
            <ActionList
              actionRole="menuitem"
              items={[
                { content: "简体中文", active: locale === "zh", onAction: () => { setLocale("zh"); togglePopoverActive(); } },
                { content: "English", active: locale === "en", onAction: () => { setLocale("en"); togglePopoverActive(); } },
              ]}
            />
          </Popover>
        }
      >
        <BlockStack gap="500">
          <Banner title={bannerConfig.title} tone={bannerConfig.tone}>
            <p>{bannerConfig.msg}</p>
          </Banner>

          <Layout>
            <Layout.Section>
              <BlockStack gap="400">
                <Card>
                  <BlockStack gap="400">
                    <Box>
                      <BlockStack gap="300">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text variant="headingMd" as="h2">🚀 {t.setupTitle}</Text>
                          <Badge tone={currentPlan !== "free" ? "success" : "attention"}>
                            {currentPlan !== "free" ? t.setupBadgeReady : t.setupBadgePending}
                          </Badge>
                        </InlineStack>

                        <InlineGrid columns={{ xs: 1, sm: 3 }} gap="200">
                          {[
                            { title: t.step1, desc: t.step1Desc, icon: DatabaseIcon },
                            { title: t.step2, desc: t.step2Desc, icon: AutomationIcon },
                            { title: t.step3, desc: t.step3Desc, icon: MagicIcon }
                          ].map((step, idx) => (
                            <Box key={idx} background="bg-surface-secondary" padding="300" borderRadius="200">
                              <BlockStack gap="050">
                                <InlineStack gap="100" align="start" blockAlign="center">
                                  <Box width="20px"><Icon source={step.icon} tone="base" /></Box>
                                  <Text variant="headingSm" as="h3">{step.title}</Text>
                                </InlineStack>
                                <Text variant="bodySm" tone="subdued">{step.desc}</Text>
                              </BlockStack>
                            </Box>
                          ))}
                        </InlineGrid>
                      </BlockStack>
                    </Box>

                    <Divider />
                    <InlineStack gap="300">
                      <Button variant="primary" size="large" icon={MagicIcon} url={`https://${shop}/admin/themes/current/editor?template=product`} target="_blank">{t.btnEditor}</Button>
                      <Button size="large" icon={DatabaseIcon} url={`https://${shop}/admin/settings/files`} target="_blank">{t.btnFiles}</Button>
                      <Button size="large" variant="secondary" onClick={() => navigate(`/app/additional${location.search}`)}>
                        {t.btnGoManage} →
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h2">📊 {t.insightTitle}</Text>
                    <InlineGrid columns={{ xs: 2, md: 4 }} gap="400">
                      <Box background="bg-surface-secondary" padding="400" borderRadius="300">
                        <BlockStack gap="100">
                          <Text variant="bodyXs" tone="subdued">{t.statViews}</Text>
                          <Text variant="headingLg" tone="base">{statsData.views}</Text>
                        </BlockStack>
                      </Box>
                      <Box background="bg-surface-secondary" padding="400" borderRadius="300">
                        <BlockStack gap="100">
                          <Text variant="bodyXs" tone="subdued">{t.statAR}</Text>
                          <Text variant="headingLg" tone="base">{statsData.arUses}</Text>
                        </BlockStack>
                      </Box>
                      <Box background="bg-surface-secondary" padding="400" borderRadius="300">
                        <BlockStack gap="100">
                          <Text variant="bodyXs" tone="subdued">{t.statTime}</Text>
                          <Text variant="headingLg" tone="success">{statsData.stayTime}</Text>
                        </BlockStack>
                      </Box>
                      <Box background={currentPlan === "free" ? "bg-surface-critical-subdued" : "bg-surface-info-subdued"} padding="400" borderRadius="300">
                        <BlockStack gap="100">
                          <InlineStack gap="050" blockAlign="center">
                            <Box width="14px"><Icon source={AlertBubbleIcon} tone={currentPlan === "free" ? "critical" : "info"} /></Box>
                            <Text variant="bodyXs" tone={currentPlan === "free" ? "critical" : "info"}>{t.statSub}</Text>
                          </InlineStack>
                          <Text variant="headingLg" fontWeight="bold">{getLimitDisplay()}</Text>
                        </BlockStack>
                      </Box>
                    </InlineGrid>
                  </BlockStack>
                </Card>
              </BlockStack>
            </Layout.Section>
          </Layout>

          <Page title="">
            <Text variant="headingLg" as="h2" fontWeight="bold">{t.planSelectTitle}</Text>
            <Box marginTop="400">
              <InlineGrid columns={{ xs: 1, md: 3 }} gap="500">
                
                <Card background={currentPlan === "free" ? "bg-surface-info-subdued" : "bg-surface"}>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="headingLg" fontWeight="bold">{t.tierFreeName}</Text>
                      {currentPlan === "free" && <Badge tone="info">{t.statusActive}</Badge>}
                    </InlineStack>
                    <BlockStack gap="150">
                      <InlineGrid columns="auto 1fr" gap="150"><Box width="16px" paddingBlockStart="050"><Icon source={CheckCircleIcon} tone="info" /></Box><Text>{t.tierFreeF1}</Text></InlineGrid>
                      <InlineGrid columns="auto 1fr" gap="150"><Box width="16px" paddingBlockStart="050"><Icon source={CheckCircleIcon} tone="info" /></Box><Text>{t.tierFreeF2}</Text></InlineGrid>
                      <InlineGrid columns="auto 1fr" gap="150"><Box width="16px" paddingBlockStart="050"><Icon source={CheckCircleIcon} tone="critical" /></Box><Text tone="subdued">{t.tierFreeF3}</Text></InlineGrid>
                      <InlineGrid columns="auto 1fr" gap="150"><Box width="16px" paddingBlockStart="050"><Icon source={CheckCircleIcon} tone="critical" /></Box><Text tone="critical">{t.tierFreeF4}</Text></InlineGrid>
                    </BlockStack>
                    <Divider />
                    <Text variant="heading2xl" fontWeight="bold">$0 <Text variant="bodySm" tone="subdued" as="span">{t.tierFreePrice}</Text></Text>
                    <Button fullWidth disabled size="large">{currentPlan === "free" ? t.btnCurrent : t.btnNA}</Button>
                  </BlockStack>
                </Card>

                <Card background={currentPlan.startsWith("pro") ? "bg-surface-success-subdued" : "bg-surface"}>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="headingLg" fontWeight="bold" tone="success">{t.tierProName}</Text>
                      {currentPlan === "pro" && <Badge tone="success">{t.statusActive}</Badge>}
                    </InlineStack>
                    <BlockStack gap="150">
                      <InlineGrid columns="auto 1fr" gap="150"><Box width="16px" paddingBlockStart="050"><Icon source={CheckCircleIcon} tone="success" /></Box><Text fontWeight="bold">{t.tierProF1}</Text></InlineGrid>
                      <InlineGrid columns="auto 1fr" gap="150"><Box width="16px" paddingBlockStart="050"><Icon source={CheckCircleIcon} tone="success" /></Box><Text fontWeight="bold">{t.tierProF2}</Text></InlineGrid>
                      <InlineGrid columns="auto 1fr" gap="150"><Box width="16px" paddingBlockStart="050"><Icon source={CheckCircleIcon} tone="success" /></Box><Text>{t.tierProF3}</Text></InlineGrid>
                      <InlineGrid columns="auto 1fr" gap="150"><Box width="16px" paddingBlockStart="050"><Icon source={CheckCircleIcon} tone="success" /></Box><Text>{t.tierProF4}</Text></InlineGrid>
                      <InlineGrid columns="auto 1fr" gap="150"><Box width="16px" paddingBlockStart="050"><Icon source={CheckCircleIcon} tone="success" /></Box><Text>{t.tierProF5}</Text></InlineGrid>
                    </BlockStack>
                    <Divider />
                    <BlockStack gap="050">
                      <Text variant="heading2xl" fontWeight="bold" tone="success">$29.99 <Text variant="bodySm" tone="subdued" as="span">{t.tierProPrice}</Text></Text>
                      <Text variant="bodyXs" tone="success">{t.trialText}</Text>
                    </BlockStack>
                    
                    <Button 
                      fullWidth 
                      size="large" 
                      variant="primary" 
                      onClick={() => handleUpgrade("upgrade_pro")} 
                      disabled={currentPlan === "pro" || currentPlan.startsWith("enterprise")}
                    >
                      {currentPlan === "pro" 
                        ? t.btnCurrent 
                        : (currentPlan.startsWith("enterprise") ? t.btnNA : t.btnUpgrade)
                      }
                    </Button>
                  </BlockStack>
                </Card>

                <Card background={currentPlan.startsWith("enterprise") ? "bg-surface-info-subdued" : "bg-surface"}>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="headingLg" fontWeight="bold" tone="info">{t.tierEntName}</Text>
                      {currentPlan === "enterprise" && <Badge tone="info">{t.statusActive}</Badge>}
                    </InlineStack>
                    <BlockStack gap="150">
                      <InlineGrid columns="auto 1fr" gap="150"><Box width="16px" paddingBlockStart="050"><Icon source={CheckCircleIcon} tone="info" /></Box><Text fontWeight="bold">{t.tierEntF1}</Text></InlineGrid>
                      <InlineGrid columns="auto 1fr" gap="150"><Box width="16px" paddingBlockStart="050"><Icon source={CheckCircleIcon} tone="info" /></Box><Text fontWeight="bold">{t.tierEntF2}</Text></InlineGrid>
                      <InlineGrid columns="auto 1fr" gap="150"><Box width="16px" paddingBlockStart="050"><Icon source={CheckCircleIcon} tone="info" /></Box><Text>{t.tierEntF3}</Text></InlineGrid>
                      <InlineGrid columns="auto 1fr" gap="150"><Box width="16px" paddingBlockStart="050"><Icon source={CheckCircleIcon} tone="info" /></Box><Text>{t.tierEntF4}</Text></InlineGrid>
                      <InlineGrid columns="auto 1fr" gap="150"><Box width="16px" paddingBlockStart="050"><Icon source={CheckCircleIcon} tone="info" /></Box><Text>{t.tierEntF5}</Text></InlineGrid>
                    </BlockStack>
                    <Divider />
                    <BlockStack gap="050">
                      <Text variant="heading2xl" fontWeight="bold" tone="info">$49.99 <Text variant="bodySm" tone="subdued" as="span">{t.tierProPrice}</Text></Text>
                      <Text variant="bodyXs" tone="info">{t.entNoTrial}</Text>
                    </BlockStack>
                    
                    <Button 
                      fullWidth 
                      size="large" 
                      variant="primary" 
                      onClick={() => handleUpgrade("upgrade_enterprise")} 
                      disabled={currentPlan === "enterprise"}
                    >
                      {currentPlan === "enterprise" ? t.btnCurrent : t.btnUpgradeEnt}
                    </Button>
                  </BlockStack>
                </Card>

              </InlineGrid>
            </Box>
          </Page>

          {["pro", "enterprise"].includes(currentPlan) && (
            <Box padding="300" background="bg-surface-secondary" borderRadius="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text tone="subdued" variant="bodySm">{t.cancelHint}</Text>
                <Button tone="critical" onClick={handleCancel}>{t.btnCancel}</Button>
              </InlineStack>
            </Box>
          )}

        </BlockStack>
        {showToast && <Toast content={t.toastMsg} onDismiss={() => setShowToast(false)} />}
      </Page>
    </Frame>
  );
}