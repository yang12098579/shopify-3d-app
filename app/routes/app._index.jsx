import { useState, useCallback, useEffect } from "react";
import { useLoaderData, useActionData, useSubmit, useNavigate, useLocation } from "react-router"; 
import {
  Page, Layout, Text, Card, Button, BlockStack, Banner, Divider, Box, Badge,
  Icon, InlineGrid, InlineStack, Popover, ActionList, Toast, Frame,
} from "@shopify/polaris";
import {
  MagicIcon, DatabaseIcon, AutomationIcon, LanguageIcon, CheckCircleIcon, AlertBubbleIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server"; 
import prisma from "../db.server";
import { PLAN_GROWTH_MONTHLY, PLAN_GROWTH_ANNUAL, PLAN_BUSINESS_MONTHLY, PLAN_BUSINESS_ANNUAL, PRICING, QUOTA } from "../constants";

import translations from "../locales/dashboard";

export const action = async ({ request }) => {
  // 🚨 修复核心：精准获取 session，拼接 Shopify 后台内部的专属入口
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent"); 
  
  const clientId = process.env.SHOPIFY_API_KEY;
  const shopAdminUrl = `https://${session.shop}/admin/apps/${clientId}/app`;

  let planName = "";
  let planPrice = 0.0;
  let trialDaysConfig = 1; 

  let isAnnual = false;
  if (intent === "upgrade_growth_monthly") {
    planName = PLAN_GROWTH_MONTHLY;
    planPrice = PRICING.GROWTH_MONTHLY;
  } else if (intent === "upgrade_growth_annual") {
    planName = PLAN_GROWTH_ANNUAL;
    planPrice = PRICING.GROWTH_ANNUAL;
    isAnnual = true;
  } else if (intent === "upgrade_business_monthly") {
    planName = PLAN_BUSINESS_MONTHLY;
    planPrice = PRICING.BUSINESS_MONTHLY;
  } else if (intent === "upgrade_business_annual") {
    planName = PLAN_BUSINESS_ANNUAL;
    planPrice = PRICING.BUSINESS_ANNUAL;
    isAnnual = true;
  } else if (intent === "cancel") {
    const subscriptionId = formData.get("subscriptionId"); 
    const cancelRes = await admin.graphql(
      `#graphql
      mutation appSubscriptionCancel($id: ID!) {
        appSubscriptionCancel(id: $id) { appSubscription { id status } userErrors { field message } }
      }`,
      { variables: { id: subscriptionId } }
    );
    const cancelJson = await cancelRes.json();
    const cancelErrors = cancelJson.data?.appSubscriptionCancel?.userErrors || [];
    if (cancelErrors.length > 0) {
      return { canceled: false, error: cancelErrors[0].message };
    }
    return { canceled: true };
  } else {
    return null;
  }

  const lineItemsPayload = [
    { 
      plan: { 
        appRecurringPricingDetails: { 
          price: { amount: planPrice, currencyCode: "USD" }, 
          interval: isAnnual ? "ANNUAL" : "EVERY_30_DAYS" 
        } 
      } 
    }
  ];

  if (intent === "upgrade_growth_monthly" || intent === "upgrade_growth_annual") {
    lineItemsPayload.push({
      plan: {
        appUsagePricingDetails: {
          terms: "Vision3D Extra AR product preview ($3.99 per extra active model overage)",
          cappedAmount: { amount: 150.00, currencyCode: "USD" }
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
        // 🚨 终极修复：支付成功后，直接把商家硬塞回 Shopify 后台的画中画里！
        returnUrl: shopAdminUrl,
        trialDays: trialDaysConfig > 0 ? trialDaysConfig : null, 
        test: isTestBilling, 
        lineItems: lineItemsPayload
      }
    }
  );
  const responseJson = await response.json();
  return { confirmationUrl: responseJson.data?.appSubscriptionCreate?.confirmationUrl };
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
    const subName = activeSubs[0].name;
    if (subName.includes("Growth") && subName.includes("Annual")) currentPlan = "pro";
    else if (subName.includes("Growth")) currentPlan = "pro";
    else if (subName.includes("Business") && subName.includes("Annual")) currentPlan = "enterprise";
    else if (subName.includes("Business")) currentPlan = "enterprise";
  } else {
    const cancelledSub = allSubsEdges.find(({ node }) => node.status === "CANCELLED");
    if (cancelledSub) {
      const periodEnd = new Date(cancelledSub.node.currentPeriodEnd);
      if (periodEnd > new Date()) {
        rawDate = periodEnd.toISOString(); 
        const cancelledName = cancelledSub.node.name;
        if (cancelledName.includes("Growth") && cancelledName.includes("Annual")) currentPlan = "pro_cancelled";
        else if (cancelledName.includes("Growth")) currentPlan = "pro_cancelled";
        else if (cancelledName.includes("Business") && cancelledName.includes("Annual")) currentPlan = "enterprise_cancelled";
        else if (cancelledName.includes("Business")) currentPlan = "enterprise_cancelled";
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
        }
        `,
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
      }
      `
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

  let statsData = { views: 0, arUses: 0, addCartCount: 0, stayTime: "0.0s", conversion: "0%" };
  try {
    const dbStats = await prisma.appAnalytics.findUnique({ where: { shop: session.shop } });
    if (dbStats) {
      statsData.views = dbStats.views || 0;
      statsData.arUses = dbStats.arUses || 0;
      statsData.addCartCount = Number(dbStats.addCartCount) || 0;
      
      if (statsData.views > 0 && dbStats.totalStayTimeMs) {
        const avgMs = Number(dbStats.totalStayTimeMs) / statsData.views;
        statsData.stayTime = (avgMs / 1000).toFixed(1) + "s";
      }
      if (statsData.views > 0 && statsData.addCartCount > 0) {
        statsData.conversion = ((statsData.addCartCount / statsData.views) * 100).toFixed(1) + "%";
      }
    }
  } catch (error) {
    console.error("获取真实看板数据失败", error);
  }

  // Fetch 30-day trend data
  let dailyData = [];
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().substring(0, 10);
    dailyData = await prisma.dailyStats.findMany({
      where: { shop: session.shop, date: { gte: startDate } },
      orderBy: { date: "asc" },
      select: { date: true, views: true, arUses: true, addCartCount: true },
    });
  } catch { /* table may not exist yet */ }

  return { shop: session.shop, currentPlan, subscriptionId, dateStr, statsData, arActiveCount, dailyData };
};





import SetupGuide from "../components/dashboard/SetupGuide";
import StatsOverview from "../components/dashboard/StatsOverview";
import PlanSelector from "../components/dashboard/PlanSelector";
import TrendChart from "../components/dashboard/TrendChart";

const sectionStyle = { animation: "fadeUp .5s ease-out both" };

export default function Index() {
  const { shop, currentPlan, subscriptionId, dateStr, statsData, arActiveCount, dailyData } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();

  const [locale, setLocale] = useState("en");
  const [popoverActive, setPopoverActive] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const togglePopoverActive = useCallback(() => setPopoverActive((a) => !a), []);
  const navigate = useNavigate();
  const location = useLocation();
  const t = translations[locale];

  useEffect(() => {
    if (actionData?.confirmationUrl) {
      window.top.location.href = actionData.confirmationUrl;
    }
  }, [actionData]);

  const getBannerConfig = () => {
    if (currentPlan === "pro") return { title: t.planPro + " (" + t.statusActive + ")", tone: "success", msg: t.msgPro.replace("{date}", dateStr) };
    if (currentPlan === "business") return { title: t.planEnterprise + " (" + t.statusActive + ")", tone: "success", msg: t.msgEnterprise.replace("{date}", dateStr) };
    if (currentPlan.endsWith("_cancelled")) return { title: t.statusEnding, tone: "critical", msg: t.msgCancelled.replace("{date}", dateStr) };
    return { title: t.planStarter, tone: "warning", msg: t.msgStarter };
  };

  const bannerConfig = getBannerConfig();

  const getLimitDisplay = () => {
    if (currentPlan.startsWith("pro")) return arActiveCount + " / 10";
    if (currentPlan.startsWith("enterprise")) return arActiveCount + " / \u221e";
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
                { content: "\u7b80\u4f53\u4e2d\u6587", active: locale === "zh", onAction: () => { setLocale("zh"); togglePopoverActive(); } },
                { content: "English", active: locale === "en", onAction: () => { setLocale("en"); togglePopoverActive(); } },
              ]}
            />
          </Popover>
        }
      >
        <BlockStack gap="600">
          {/* ===== HERO ===== */}
          <Box borderRadius="300" overflowX="hidden" style={{ background: "#1a1a1e", animation: "fadeIn .6s ease-out" }}>
            <Box padding={{ xs: "500", md: "800" }}>
              <InlineGrid columns={{ xs: 1, md: 2 }} gap="600">
                <BlockStack gap="400">
                  <Text variant="heading2xl" fontWeight="bold" tone="text-inverse" as="h1">
                    {locale === "zh" ? "\u667a\u80fd 3D \u4e0e AR \u589e\u5f3a\u5546\u57ce" : "Smart 3D & AR Commerce"}
                  </Text>
                  <Text variant="bodyLg" as="p" tone="subdued">
                    {locale === "zh"
                      ? "\u4e3a\u6bcf\u4e00\u4ef6\u5546\u54c1\u6ce8\u5165\u6c89\u6d78\u5f0f 3D \u4f53\u9a8c\uff0c\u63d0\u5347\u8f6c\u5316\u7387\u8fbe 22%"
                      : "Immersive 3D experiences for every product. Boost conversion up to 22%."}
                  </Text>
                  <InlineStack gap="300">
                    <Button primary size="large" icon={MagicIcon} onClick={() => navigate("/app/additional" + location.search)}>
                      {locale === "zh" ? "\u7acb\u5373\u5f00\u59cb" : "Get Started"}
                    </Button>
                    <Button size="large" url={"https://" + shop + "/admin/themes/current/editor?template=product"} target="_blank">
                      {locale === "zh" ? "\u4e3b\u9898\u7f16\u8f91" : "Theme Editor"}
                    </Button>
                  </InlineStack>
                </BlockStack>
                <Box display={{ xs: "none", md: "flex" }} alignItems="center" justifyContent="center">
                  <svg width="140" height="140" viewBox="0 0 140 140" fill="none" style={{ opacity: 0.12 }}>
                    <rect x="20" y="40" width="100" height="80" rx="8" stroke="white" strokeWidth="2" />
                    <path d="M40 40 L70 20 L100 40" stroke="white" strokeWidth="2" fill="none" />
                    <path d="M40 120 L70 100 L100 120" stroke="white" strokeWidth="2" fill="none" />
                    <circle cx="70" cy="60" r="6" fill="white" />
                    <circle cx="58" cy="50" r="3" fill="white" />
                    <circle cx="82" cy="50" r="3" fill="white" />
                  </svg>
                </Box>
              </InlineGrid>
            </Box>
          </Box>

          {/* ===== BANNER ===== */}
          <div style={{...sectionStyle, animationDelay: ".1s"}}>
            <Banner title={bannerConfig.title} tone={bannerConfig.tone}>
              <p>{bannerConfig.msg}</p>
            </Banner>
          </div>

          <Layout>
            <Layout.Section>
              <BlockStack gap="500">
                <div style={{...sectionStyle, animationDelay: ".15s"}}>
                  <Card>
                    <SetupGuide shop={shop} currentPlan={currentPlan} t={t} />
                  </Card>
                </div>

                <div style={{...sectionStyle, animationDelay: ".2s"}}>
                  <Card>
                    <StatsOverview statsData={statsData} currentPlan={currentPlan} arActiveCount={arActiveCount} t={t} getLimitDisplay={getLimitDisplay} />
                  </Card>
                </div>

                {currentPlan !== "free" && !currentPlan.endsWith("_cancelled") && (
                  <div style={{...sectionStyle, animationDelay: ".25s"}}>
                    <Card>
                      <TrendChart dailyData={dailyData || []} />
                    </Card>
                  </div>
                )}
              </BlockStack>
            </Layout.Section>
          </Layout>

          <div style={{...sectionStyle, animationDelay: ".3s"}}>
            <PlanSelector currentPlan={currentPlan} t={t} onUpgrade={handleUpgrade} onCancel={handleCancel} />
          </div>
        </BlockStack>
        {showToast && <Toast content={t.toastMsg} onDismiss={() => setShowToast(false)} />}
      </Page>
    </Frame>
  );
}
