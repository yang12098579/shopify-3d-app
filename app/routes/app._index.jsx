import { useState, useCallback, useEffect } from "react";
import { useLoaderData, useActionData, useSubmit, useLocation, useNavigate } from "react-router"; 
import {
  Page, Layout, Text, Card, Button, BlockStack, Banner, Divider, Box, Badge,
  Icon, InlineGrid, InlineStack, Popover, ActionList, Toast, Frame,
} from "@shopify/polaris";
import {
  MagicIcon, DatabaseIcon, AutomationIcon, LanguageIcon, CheckCircleIcon, AlertBubbleIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server"; 
import prisma from "../db.server";
import { PLAN_PRO, PLAN_ENTERPRISE } from "../constants"; 

import translations from "../locales/dashboard";

;

export const action = async ({ request }) => {
  // 🚨 修复核心：精准获取 session，拼接 Shopify 后台内部的专属入口
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent"); 
  
  const clientId = process.env.SHOPIFY_API_KEY || "27a6b6770a4af998e5601b052e0d0b53";
  const shopAdminUrl = `https://${session.shop}/admin/apps/${clientId}/app`;

  let planName = "";
  let planPrice = 0.0;
  let trialDaysConfig = 0; 

  if (intent === "upgrade_pro") {
    planName = PLAN_PRO; 
    planPrice = 29.99;
    trialDaysConfig = 3; 
  } else if (intent === "upgrade_enterprise") {
    planName = PLAN_ENTERPRISE; 
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
    return { canceled: true };
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
    if (activeSubs[0].name === PLAN_PRO) currentPlan = "pro";
    if (activeSubs[0].name === PLAN_ENTERPRISE) currentPlan = "enterprise";
  } else {
    const cancelledSub = allSubsEdges.find(({ node }) => node.status === "CANCELLED");
    if (cancelledSub) {
      const periodEnd = new Date(cancelledSub.node.currentPeriodEnd);
      if (periodEnd > new Date()) {
        rawDate = periodEnd.toISOString(); 
        if (cancelledSub.node.name === PLAN_PRO) currentPlan = "pro_cancelled";
        if (cancelledSub.node.name === PLAN_ENTERPRISE) currentPlan = "enterprise_cancelled";
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

  return { shop: session.shop, currentPlan, subscriptionId, dateStr, statsData, arActiveCount };
};

import SetupGuide from "../components/dashboard/SetupGuide";
import StatsOverview from "../components/dashboard/StatsOverview";
import PlanSelector from "../components/dashboard/PlanSelector";

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
    if (currentPlan.startsWith("enterprise")) return `${arActiveCount} / \u221e`;
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
                  <SetupGuide shop={shop} currentPlan={currentPlan} t={t} />
                </Card>

                <Card>
                  <StatsOverview statsData={statsData} currentPlan={currentPlan} arActiveCount={arActiveCount} t={t} getLimitDisplay={getLimitDisplay} />
                </Card>
              </BlockStack>
            </Layout.Section>
          </Layout>

          <PlanSelector currentPlan={currentPlan} t={t} onUpgrade={handleUpgrade} onCancel={handleCancel} />
        </BlockStack>
        {showToast && <Toast content={t.toastMsg} onDismiss={() => setShowToast(false)} />}
      </Page>
    </Frame>
  );
}
