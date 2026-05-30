import React, { useState, useEffect } from "react";
// 🌟 1.移除了 useActionData 和 useSubmit
import { useLoaderData, useNavigate, useRevalidator } from "react-router"; 
import {
  Page, Card, Text, Button, BlockStack, Banner, Divider, Thumbnail, Box, Icon,
  Popover, ActionList, Frame, Toast, InlineStack, Badge, TextField, Modal,
  Select, Checkbox, IndexTable, useIndexResourceState, Pagination,
} from "@shopify/polaris";
import {
  SearchIcon, LanguageIcon, DeleteIcon, ViewIcon, PlusIcon, CheckCircleIcon,
  AlertCircleIcon, LockIcon, InfoIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

// 后端辅助函数未做任何改动
async function triggerCloudConvertService(productId, glbUrl, shopDomain) {
  const apiKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNzA2ZmQzOTMzZThjYWFmOTM1YTVkNmMwYTAwZWQzZTNmODZjN2Y1MzQ1ZmI4NWU1ZDQwZWZhZjhjMzA5MTNhMTJlOGE5MzE1ODQ1MGExMzIiLCJpYXQiOjE3NzkwOTI5MTUuMDM3NzQ5LCJuYmYiOjE3NzkwOTI5MTUuMDM3NzUxLCJleHAiOjQ5MzQ3NjY1MTUuMDMyMDQxLCJzdWIiOiI3NTYwMTU0NiIsInNjb3BlcyI6WyJ1c2VyLnJlYWQiLCJ1c2VyLndyaXRlIiwidGFzay5yZWFkIiwidGFzay53cml0ZSIsIndlYmhvb2sud3JpdGUiLCJ3ZWJob29rLnJlYWQiLCJwcmVzZXQucmVhZCIsInByZXNldC53cml0ZSJdfQ.W_KGUDbfKEhM_Q1eTB9DsSviq4cRkDwUBIoEwBj9KsSoWrz52AX6JrgYjD7dGtJAGbNz314uAC7RV9bK5MdlLYYgMgEr9pqpsu5YkXNs1BDUv93mOQHLxUsJwnL5xxjnNuKci3VJpxRXbCCw2kKomV_T6nkvur9Z82KfWoSFYoIvnLDJ2o8TbIpkdqH6NysMPAb9HmJ9agzArvAUQo_XaxH6CPMbMv8bdVvuSUrs0T7I6VzdFPsMgmTpjPJvVU8hh3F_lXSow-bT-yPySivbfs5bf3vWcRXNQ0s0kkbZc3sJwJDC_TM-gRT9qhor_7Mh4eWnjhCzc9-Zd6iFhwzL-TmygKJjpBsTaD7pqoy41L2KlctRtk_yLT3HJ6fCG41o-Vj8_T4gilg7YVsYQZUCqnkXHlRoeweOlNuU0rgr9CJxGNquwac4bqAk55u2bnv_kWx479b_R5TBjOgGL-S6_eeDYlsdZzQtnX9Mx2KScaryJVlemqUMdKFyYcHnytPd5CTK3QpKstT8CzBOoAdW7gH-nTGb6TkyAq9v_mXFy07dFjPJPZvnuNNKvBOlhFTCn01pQKMZP8593UBVuBYXNv5rxBYCR8o3gOp6A2G0c5ek29oJVOOCW_bm1LgqUrCyrgIsAdnm6V6CakBmsxb31ORiVStebY5H8uoE0gKFieA";
  if (!apiKey || !glbUrl) return;

  try {
    const appBaseUrl = `https://${shopDomain}`;
    
    await fetch("https://api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        tasks: {
          "import-1": { operation: "import/url", url: glbUrl },
          "convert-1": { operation: "convert", input: "import-1", output_format: "usdz" },
          "export-1": { 
            operation: "export/url", 
            input: "convert-1",
            webhook: `${appBaseUrl}/webhooks?productId=${encodeURIComponent(productId)}&shop=${encodeURIComponent(shopDomain)}`
          }
        }
      })
    });
    console.log(`📡 [雷达成功发射] 异步追踪商品: ${productId}`);
  } catch (err) {
    console.error("❌ 异步转码调度发生系统级异常:", err);
  }
}

const translations = {
  // ... （此处保留了你所有的翻译，完全没动）
  zh: {
    langName: "简体中文",
    pageTitle: "3D 模型与 AR 管理中心",
    pageSubtitle: "高效批处理全店商品 3D 资产，系统将全自动编译转换您的 GLB 资产",
    syncBtn: "同步最新数据",
    backBtn: "返回控制台", 
    searchPlaceholder: "输入商品名称或 SKU 快速搜索...",
    clearBtn: "重置本地更改",
    bound: "已激活 3D 模型",
    unbound: "待绑定",
    btnUnbind: "解除绑定",
    btnModify: "修改配置",
    btnBind: "立即绑定",
    modalTitle: "智能全自动 3D 资产入库",
    modalLabel: "请直接粘贴您在 Shopify 后台“内容 > 文件”中获取的 GLB 文件链接",
    modalHelp: "提示：您可以从 Shopify 后台的“内容 > 文件”中获取模型链接并粘贴到此处。",
    modalPreview: "3D 实时预览与资产优化检测",
    saveBtn: "保存配置关系",
    cancelBtn: "取消",
    toastSave: "操作成功！数据已同步至云端（后台正在全自动异步编译苹果AR端，15秒后手机自动生效）",
    previewWarn: "请输入有效的 .glb 链接以开启实时预览。",
    filterAll: "全部状态",
    filterBound: "已绑定 3D 模型",
    filterUnbound: "待绑定",
    filterArActive: "已激活 AR 实景", 
    arToggleLabel: "激活手机端 AR 实景预览",
    quotaBannerFree: "💡 当前为免费基础版：已绑定 3D 模型 {modelCount} / 3 个。移动端 AR 实景投影功能已锁定，升级套餐立刻解锁！",
    quotaBannerPro: "⚡ 当前为专业出海版：您的移动端 AR 额度正在使用中。当前已占用：",
    quotaBannerEnterprise: "💎 当前为旗舰企业版：全店商品 AR 实景功能已全面解锁，尊享无上限配额！",
    limitModalTitle: "⚠️ 达到当前套餐 AR 激活上限",
    limitModalTitleModel: "⚠️ 达到 3D 模型绑定上限",
    limitModalFreeMsg: "您当前使用的是免费基础版，该版本不包含移动端 AR 空间投影功能。请先前往控制台主页升级至更高阶的套餐以激活该功能！",
    limitModalFreeModelMsg: "您当前使用的是免费基础版，该版本最多仅支持绑定 3 款商品的 3D 模型资产。请先前往控制台主页升级套餐以解除限制！",
    limitModalProMsg: "您当前使用的是专业出海版，该套餐最多仅支持 10 款商品激活 AR 实景功能。当前您的所有可用名额已全部用满！",
    limitModalBtn: "去主页升级套餐",
    perfTitle: "⚡ 资产运行性能分析 (AI)",
    perfGood: "文件状态健康 (建议保持在 10MB 以内)",
    perfWarn: "🚨 警告：检测到该 3D 模型文件可能未经过 Draco 骨骼压缩或贴图过大，可能会严重拖慢消费者的移动端网页加载速度，建议优化！",
    overageTitle: "💎 开启额外 AR 扩展坑位",
    overageMsg: "您当前专业版自带的 10 个免费 AR 额度已全部用满。点击确认将花费 $1.99 额外开通 1 个高级 AR 扩展席位（本月计费启用），本月内该席位额度可任意替换商品，次月若保持勾选将自动续杯，是否立即开通？",
    overageBtn: "确认开通扩展坑位"
  },
  en: {
    langName: "English",
    pageTitle: "3D & AR Assets Manager",
    pageSubtitle: "Manage 3D assets and allocate mobile AR space projection privileges based on your plan.",
    syncBtn: "Sync Data",
    backBtn: "Dashboard", 
    searchPlaceholder: "Search by title or SKU...",
    clearBtn: "Reset Changes",
    bound: "Linked 3D",
    unbound: "Unlinked",
    btnUnbind: "Unbind",
    btnModify: "Modify",
    btnBind: "Link Model",
    modalTitle: "Configure 3D Asset",
    modalLabel: "Model URL (.glb only)",
    modalHelp: "Tip: Copy file links from 'Content > Files' in your Shopify admin.",
    modalPreview: "Live 3D Preview & Performance Check",
    saveBtn: "Save Mapping",
    cancelBtn: "Cancel",
    toastSave: "Action successful! Product asset secured and compiled for Apple iOS Ecosystem.",
    previewWarn: "Enter a valid .glb link for preview.",
    filterAll: "All Status",
    filterBound: "Linked 3D",
    filterUnlinked: "Unlinked",
    filterArActive: "AR Activated", 
    arToggleLabel: "Enable Mobile AR View",
    quotaBannerFree: "💡 Basic Free Plan: 3D Models mapped {modelCount} / 3. Mobile AR features are locked, upgrade to activate!",
    quotaBannerPro: "⚡ Professional Plan: Your mobile AR quota is active. Currently used: ",
    quotaBannerEnterprise: "💎 Enterprise Plan: Full-store AR unlocked with zero limits!",
    limitModalTitle: "⚠️ AR Quota Limit Reached",
    limitModalTitleModel: "⚠️ 3D Model Limit Reached",
    limitModalFreeMsg: "You are currently on the Free Plan, which does not include AR features. Please go to the dashboard to upgrade your subscription.",
    limitModalFreeModelMsg: "You are currently on the Free Plan, which only allows up to 3 active 3D models. Please upgrade your subscription to unlock unlimited models.",
    limitModalProMsg: "Your Professional Plan only allows up to 10 products to activate AR features, and all your spots are fully occupied!",
    limitModalBtn: "Go to Upgrade",
    perfTitle: "⚡ Asset Performance Analytics (AI)",
    perfGood: "Healthy file size (Recommended under 10MB for fast loading)",
    perfWarn: "🚨 Warning: This 3D asset appears uncompressed or high-poly. It may slow down mobile variant loading speeds. Draco optimization recommended.",
    overageTitle: "Unlock Extra AR Product Slot",
    overageMsg: "You have utilized all 10 complimentary AR slots. Confirm to spend $1.99 to unlock 1 extra product slot (renews monthly if kept active). You can freely swap items within this quota.",
    overageBtn: "Unlock Extra Slot"
  }
};

// 后端 action 代码未做任何改动
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = String(formData.get("actionType") || "").trim();
  const productId = String(formData.get("productId") || "").trim();

  const shopQueryRes = await admin.graphql(
    `#graphql
    query getShopDomainExtended {
      shop {
        myshopifyDomain
      }
    }`
  );
  const shopQueryJson = await shopQueryRes.json();
  const shopDomain = shopQueryJson.data?.shop?.myshopifyDomain || request.headers.get("host");

  const subResponse = await admin.graphql(
    `#graphql
    query checkSubscriptionForSecurity {
      currentAppInstallation { 
        id
        activeSubscriptions { id name status lineItems { id plan { pricingDetails { __typename } } } } 
        extraSlotsField: metafield(namespace: "custom", key: "extra_slots") { value }
      }
    }`
  );
  const subJson = await subResponse.json();
  const appInstallationId = subJson.data?.currentAppInstallation?.id;
  const activeSubs = subJson.data?.currentAppInstallation?.activeSubscriptions || [];
  
  let currentPlan = "free";
  let usageLineItemId = null;

  if (activeSubs.length > 0 && activeSubs[0].status === "ACTIVE") {
    if (activeSubs[0].name.includes("Professional")) {
      currentPlan = "pro";
      const uItem = activeSubs[0].lineItems.find(item => 
        item.plan?.pricingDetails?.__typename === "AppUsagePricing"
      );
      usageLineItemId = uItem ? uItem.id : null; 
    }
    if (activeSubs[0].name.includes("Enterprise")) currentPlan = "enterprise";
  }

  if (actionType === "buy_slot") {
    if (!usageLineItemId) {
      return Response.json({ success: false, error: "BILLING_SETUP_ERROR", message: "由于套餐没有开通弹性授权，Shopify 拒绝了扣费。请前往主页重新点击订阅套餐激活按量通道后再试。" });
    }
    try {
      const currentSlots = parseInt(formData.get("currentSlots") || "0", 10);
      const billingRes = await admin.graphql(
        `#graphql
        mutation createOverageCharge($description: String!, $price: MoneyInput!, $subscriptionLineItemId: ID!) {
          appUsageRecordCreate(description: $description, price: $price, subscriptionLineItemId: $subscriptionLineItemId) {
            userErrors { field message }
            appUsageRecord { id }
          }
        }`,
        {
          variables: {
            description: `Vision3D extra AR active overage slot expansion tier charge (monthly billing)`,
            price: { amount: 1.99, currencyCode: "USD" },
            subscriptionLineItemId: usageLineItemId
          }
        }
      );
      const billingJson = await billingRes.json();
      const userErrors = billingJson.data?.appUsageRecordCreate?.userErrors;
      if (userErrors && userErrors.length > 0) {
        return Response.json({ success: false, error: "BILLING_REJECTED", message: userErrors[0].message }); 
      }
      
      const newSlotsValue = (currentSlots + 1).toString();
      const currentMonthStr = new Date().toISOString().substring(0, 7); 

      await admin.graphql(
        `#graphql
        mutation setExtraSlotsAndMonth($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) { metafields { id } }
        }`,
        {
          variables: {
            metafields: [
              { ownerId: appInstallationId, namespace: "custom", key: "extra_slots", type: "integer", value: newSlotsValue },
              { ownerId: appInstallationId, namespace: "custom", key: "last_charged_month", type: "single_line_text_field", value: currentMonthStr }
            ]
          }
        }
      );
      
      return Response.json({ success: true, actionType: "buy_slot", productId });
    } catch (err) {
      return Response.json({ success: false, error: "BILLING_SYSTEM_ERROR", message: "与 Shopify 计费服务器通信失败。" });
    }
  }

  if (actionType === "bind") {
    const modelUrl = String(formData.get("modelUrl") || "").trim();
    if (currentPlan === "free" && modelUrl !== "") {
      const countResponse = await admin.graphql(
        `#graphql
        query countBoundModelsAction {
          products(first: 250) { edges { node { modelUrlField: metafield(namespace: "custom", key: "product_3d_model") { value } } } }
        }`
      );
      const countJson = await countResponse.json();
      const edges = countJson.data?.products?.edges || [];
      const currentBoundCount = edges.filter(e => !!e.node.modelUrlField?.value).length;

      const currentProductResponse = await admin.graphql(
        `#graphql
        query checkSingleProductAction($id: ID!) {
          product(id: $id) { modelUrlField: metafield(namespace: "custom", key: "product_3d_model") { value } }
        }`,
        { variables: { id: productId } }
      );
      const currentProductJson = await currentProductResponse.json();
      const hasExistingModel = !!currentProductJson.data?.product?.modelUrlField?.value;

      if (currentBoundCount >= 3 && !hasExistingModel) {
        return Response.json({ success: false, error: "FREE_MODEL_LIMIT_HIT", targetProductId: productId });
      }
    }

    const payloadResponse = await admin.graphql(
      `#graphql
      mutation metafieldsSetBind($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) { 
          metafields { id value }
          userErrors { field message }
        }
      }`,
      { variables: { metafields: [{ ownerId: productId, namespace: "custom", key: "product_3d_model", type: "single_line_text_field", value: modelUrl }] } }
    );

    const saveMainModelJson = await payloadResponse.json();
    const userErrors = saveMainModelJson.data?.metafieldsSet?.userErrors || [];
    if (userErrors.length > 0) {
      return Response.json({ success: false, error: "SHOPIFY_ERROR", message: userErrors[0].message });
    }

    if (modelUrl && modelUrl.toLowerCase().includes(".glb")) {
      triggerCloudConvertService(productId, modelUrl, shopDomain);
    }

    return Response.json({ success: true, actionType, productId, updatedUrl: modelUrl });
  }

  if (actionType === "toggle_ar") {
    const isEnabling = formData.get("arState") === "true";
    if (isEnabling) {
      if (currentPlan === "free") {
        return Response.json({ success: false, error: "FREE_LIMIT_HIT", targetProductId: productId });
      }
      if (currentPlan === "pro") {
        const countArResponse = await admin.graphql(
          `#graphql
          query getArActiveCountBackend {
            products(first: 250) { edges { node { arEnabledField: metafield(namespace: "custom", key: "ar_enabled") { value } } } }
          }`
        );
        const countArJson = await countArResponse.json();
        const activeArCount = (countArJson.data?.products?.edges || []).filter(e => e.node.arEnabledField?.value === "true").length;

        const extraSlotsValue = parseInt((await admin.graphql(`{currentAppInstallation{extraSlotsField: metafield(namespace: "custom", key: "extra_slots") { value }}}`)).json()?.data?.currentAppInstallation?.extraSlotsField?.value || "0", 10);

        if (activeArCount >= (10 + extraSlotsValue)) {
          return Response.json({ success: false, error: "PRO_LIMIT_HIT", targetProductId: productId });
        }
      }
    }
    
    const arState = formData.get("arState") === "true";
    await admin.graphql(
      `#graphql
      mutation metafieldsSetAr($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) { metafields { id value } }
      }`,
      { variables: { metafields: [{ ownerId: productId, namespace: "custom", key: "ar_enabled", type: "boolean", value: arState ? "true" : "false" }] } }
    );
    return Response.json({ success: true, actionType, productId });
  }

  if (actionType === "bulk_toggle_ar") {
    const productIds = JSON.parse(formData.get("productIds"));
    const arState = formData.get("arState") === "true";
    const metafieldsInput = productIds.map(id => ({
      ownerId: id, namespace: "custom", key: "ar_enabled", type: "boolean", value: arState ? "true" : "false"
    }));
    await admin.graphql(
      `#graphql
      mutation bulkMetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) { metafields { id } }
      }`,
      { variables: { metafields: metafieldsInput } }
    );
    return Response.json({ success: true, actionType });
  }

  if (actionType === "bulk_unbind") {
    const productIds = JSON.parse(formData.get("productIds"));
    const metafieldsToDelete = [];
    productIds.forEach(id => {
      metafieldsToDelete.push({ ownerId: id, namespace: "custom", key: "product_3d_model" });
      metafieldsToDelete.push({ ownerId: id, namespace: "custom", key: "ios_3d_model" }); 
      metafieldsToDelete.push({ ownerId: id, namespace: "custom", key: "ar_enabled" });
    });
    await admin.graphql(
      `#graphql
      mutation bulkMetafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
        metafieldsDelete(metafields: $metafields) { deletedMetafields { key } }
      }`,
      { variables: { metafields: metafieldsToDelete } }
    );
    return Response.json({ success: true, actionType });
  }

  if (actionType === "unbind") {
    await admin.graphql(
      `#graphql
      mutation metafieldsDeleteSingle($metafields: [MetafieldIdentifierInput!]!) {
        metafieldsDelete(metafields: $metafields) { deletedMetafields { key } }
      }`,
      { variables: { metafields: [
        { ownerId: productId, namespace: "custom", key: "product_3d_model" }, 
        { ownerId: productId, namespace: "custom", key: "ios_3d_model" }, 
        { ownerId: productId, namespace: "custom", key: "ar_enabled" }
      ] } }
    );
    return Response.json({ success: true, actionType, productId });
  }

  return Response.json({ success: true });
};

// 后端 loader 代码未做任何改动
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const subResponse = await admin.graphql(
    `#graphql
    query getSubscriptionForManager {
      shop { id }
      currentAppInstallation { 
        id
        activeSubscriptions { id name status lineItems { id plan { pricingDetails { __typename } } } } 
        extraSlotsField: metafield(namespace: "custom", key: "extra_slots") { value }
        lastMonthField: metafield(namespace: "custom", key: "last_charged_month") { value }
      }
    }`
  );
  const subJson = await subResponse.json();
  const appInstallationId = subJson.data?.currentAppInstallation?.id;
  const activeSubs = subJson.data?.currentAppInstallation?.activeSubscriptions || [];
  let extraSlots = parseInt(subJson.data?.currentAppInstallation?.extraSlotsField?.value || "0", 10);
  const lastChargedMonth = subJson.data?.currentAppInstallation?.lastMonthField?.value || "";

  let currentPlan = "free";
  let usageLineItemId = null;

  if (activeSubs.length > 0 && activeSubs[0].status === "ACTIVE") {
    if (activeSubs[0].name.includes("Professional")) {
      currentPlan = "pro";
      const uItem = activeSubs[0].lineItems.find(item => 
        item.plan?.pricingDetails?.__typename === "AppUsagePricing"
      );
      usageLineItemId = uItem ? uItem.id : null;
    }
    if (activeSubs[0].name.includes("Enterprise")) currentPlan = "enterprise";
  }

  const response = await admin.graphql(
    `#graphql
    query getProductsWithAr {
      products(first: 250, sortKey: UPDATED_AT, reverse: true) {
        edges {
          node {
            id
            title
            featuredImage { url }
            variants(first: 1) { edges { node { sku } } }
            modelUrlField: metafield(namespace: "custom", key: "product_3d_model") { value }
            arEnabledField: metafield(namespace: "custom", key: "ar_enabled") { value }
          }
        }
      }
    }`
  );

  const responseJson = await response.json();
  const edges = responseJson.data?.products?.edges || [];

  const rawProducts = edges.map((edge) => {
    const node = edge.node;
    return {
      id: node.id,
      title: node.title,
      sku: node.variants?.edges[0]?.node?.sku || "无 SKU",
      image: node.featuredImage?.url || "https://cdn.shopify.com/s/images/admin/no-image-large.gif",
      modelUrl: node.modelUrlField?.value || "",
      arEnabled: node.arEnabledField?.value === "true",
    };
  });

  const arActiveCount = rawProducts.filter(p => p.arEnabled).length;

  if (currentPlan === "pro" && arActiveCount <= 10 && extraSlots > 0) {
    extraSlots = 0;
    await admin.graphql(
      `#graphql
      mutation resetStaleSlots($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) { metafields { id } }
      }`,
      { variables: { metafields: [{ ownerId: appInstallationId, namespace: "custom", key: "extra_slots", type: "integer", value: "0" }] } }
    );
  }

  const currentMonthStr = new Date().toISOString().substring(0, 7); 
  if (currentPlan === "pro" && lastChargedMonth !== currentMonthStr && usageLineItemId) {
    try {
      const actualExcess = Math.max(0, arActiveCount - 10);
      
      if (actualExcess > 0) {
        const totalOveragePrice = (actualExcess * 1.99).toFixed(2);
        const renewRes = await admin.graphql(
          `#graphql
          mutation autoRenewSlotsCharge($description: String!, $price: MoneyInput!, $subscriptionLineItemId: ID!) {
            appUsageRecordCreate(description: $description, price: $price, subscriptionLineItemId: $subscriptionLineItemId) {
              userErrors { field message }
              appUsageRecord { id }
            }
          }`,
          {
            variables: {
              description: `Vision3D extra ${actualExcess} AR slots monthly subscription auto-renewal`,
              price: { amount: parseFloat(totalOveragePrice), currencyCode: "USD" },
              subscriptionLineItemId: usageLineItemId
            }
          }
        );
        const renewJson = await renewRes.json();
        const renewErrors = renewJson.data?.appUsageRecordCreate?.userErrors;

        if (!renewErrors || renewErrors.length === 0) {
          extraSlots = actualExcess; 
        } else {
          extraSlots = 0; 
        }
      } else {
        extraSlots = 0;
      }

      await admin.graphql(
        `#graphql
        mutation updateRenewMonth($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) { metafields { id } }
        }`,
        {
          variables: {
            metafields: [
              { ownerId: appInstallationId, namespace: "custom", key: "extra_slots", type: "integer", value: extraSlots.toString() },
              { ownerId: appInstallationId, namespace: "custom", key: "last_charged_month", type: "single_line_text_field", value: currentMonthStr }
            ]
          }
        }
      );
    } catch (renewErr) {
      console.error("👉 自动续费通信异常:", renewErr);
    }
  }

  const modelActiveCount = rawProducts.filter(p => !!p.modelUrl).length;

  const initialProducts = rawProducts.sort((a, b) => {
    if (a.arEnabled && !b.arEnabled) return -1;
    if (!a.arEnabled && b.arEnabled) return -1;
    if (a.modelUrl && !b.modelUrl) return -1;
    if (!a.modelUrl && b.modelUrl) return 1;
    return 0;
  });

  return Response.json({ initialProducts, currentPlan, arActiveCount, modelActiveCount, extraSlots });
};

export default function ModelMappingDashboard() {
  const { initialProducts, currentPlan, arActiveCount, modelActiveCount, extraSlots } = useLoaderData();
  const navigate = useNavigate(); 
  const revalidator = useRevalidator(); 
  
  const [products, setProducts] = useState(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); 
  const [locale, setLocale] = useState("en"); 
  const [popoverActive, setPopoverActive] = useState(false);
  const [toastMessage, setToastMessage] = useState(""); 
  const [showToast, setShowToast] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); 

  const [activeModal, setActiveModal] = useState(false);
  const [limitModal, setLimitModal] = useState(false); 
  const [overageModal, setOverageModal] = useState(false); 
  const [limitModalType, setLimitModalType] = useState("AR"); 
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [inputModelUrl, setInputModelUrl] = useState("");
  const [isLargeFile, setIsLargeFile] = useState(false); 

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const t = translations[locale];

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesStatus = false;
    if (statusFilter === "all") matchesStatus = true;
    else if (statusFilter === "bound") matchesStatus = !!p.modelUrl;
    else if (statusFilter === "unbound") matchesStatus = !p.modelUrl;
    else if (statusFilter === "ar_active") matchesStatus = !!p.modelUrl && p.arEnabled;
    return matchesSearch && matchesStatus;
  });

  const { selectedResources, allResourcesSelected, handleSelectionChange, clearSelection } = useIndexResourceState(filteredProducts);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPagedProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const filterOptions = [
    { label: t.filterAll, value: "all" },
    { label: t.filterBound, value: "bound" },
    { label: t.filterUnbound, value: "unbound" },
    { label: t.filterArActive, value: "ar_active" }, 
  ];

  const handleSyncProducts = () => {
    setIsSyncing(true);
    if (revalidator && revalidator.revalidate) revalidator.revalidate(); 
    setTimeout(() => { setIsSyncing(false); }, 600);
  };

  useEffect(() => {
    if (inputModelUrl.toLowerCase().includes("heavy") || inputModelUrl.length > 120) {
      setIsLargeFile(true);
    } else {
      setIsLargeFile(false);
    }
  }, [inputModelUrl]);

  // 🌟 核心引擎改造：构建属于我们自己的隐形重连请求函数 safeSubmit
  const safeSubmit = async (payload) => {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => formData.append(key, value));
    
    try {
      // 无论后台多久没点，这句代码都会在后台静默补齐身份，永不白屏崩溃
      const response = await window.shopify.fetch(window.location.pathname + window.location.search, {
        method: "POST",
        body: formData
      });
      const actionData = await response.json();

      // 原来在 useEffect 里的数据处理逻辑，现在全部顺滑地接管在这里
      if (actionData?.error === "FREE_LIMIT_HIT" || actionData?.error === "PRO_LIMIT_HIT") {
        setLimitModalType("AR");
        setLimitModal(true);
      } else if (actionData?.error === "FREE_MODEL_LIMIT_HIT") {
        setLimitModalType("MODEL");
        setLimitModal(true);
      } else if (actionData?.error?.includes("BILLING_")) {
        setToastMessage(`开通异常: ${actionData.message}`);
        setShowToast(true);
      } else if (actionData?.success && actionData?.actionType === "buy_slot") {
        setToastMessage("成功开通 1 个月度高级 AR 扩容坑位！");
        setShowToast(true);
        // 继续递归去开启 AR
        safeSubmit({ actionType: "toggle_ar", productId: actionData.productId, arState: "true" });
      } else if (actionData?.success && actionData?.actionType === "bind") {
        setToastMessage(t.toastSave);
        setShowToast(true);
        if (actionData.productId && actionData.updatedUrl) {
          setProducts(prev => prev.map(p => p.id === actionData.productId ? { ...p, modelUrl: actionData.updatedUrl } : p));
        }
        if (revalidator && revalidator.revalidate) revalidator.revalidate();
      } else if (actionData?.success) {
        if (revalidator && revalidator.revalidate) revalidator.revalidate();
      }
    } catch (error) {
      // 网络如果真断了，也只会弹一个友好的提示框，不会再毁掉整个页面
      setToastMessage("系统正在自动重连中，请稍后刷新...");
      setShowToast(true);
    }
  };

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setProducts(prev => {
        return initialProducts.map(initItem => {
          const matchedLocal = prev.find(p => p.id === initItem.id);
          if (matchedLocal && matchedLocal.modelUrl && !initItem.modelUrl) {
            return { ...initItem, modelUrl: matchedLocal.modelUrl };
          }
          return initItem;
        });
      });
    }
  }, [initialProducts]);

  useEffect(() => {
    if (!window.customElements.get('model-viewer')) {
      const script = document.createElement("script");
      script.type = "module";
      script.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";
      document.head.appendChild(script);
    }
  }, []);

  const handleToggleAr = (product, newChecked) => {
    if (newChecked) {
      if (currentPlan === "free") {
        setLimitModalType("AR");
        setLimitModal(true);
        return;
      }
      if (currentPlan === "pro") {
        const currentlyCheckedCount = products.filter(p => p.arEnabled).length;
        if (currentlyCheckedCount >= (10 + extraSlots)) {
          setSelectedProduct(product);
          setOverageModal(true); 
          return;
        }
      }
    }

    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, arEnabled: newChecked } : p));
    // 🌟 换上了隐形引擎
    safeSubmit({ actionType: "toggle_ar", productId: product.id, arState: newChecked ? "true" : "false" });
  };

  const handleConfirmOverage = () => {
    setOverageModal(false);
    // 🌟 换上了隐形引擎
    safeSubmit({ actionType: "buy_slot", currentSlots: extraSlots.toString(), productId: selectedProduct.id });
  };

  const handleBulkToggleAr = (enable) => {
    if (selectedResources.length === 0) return;
    if (enable && currentPlan === "free") {
      setLimitModalType("AR");
      setLimitModal(true);
      return;
    }
    if (enable && currentPlan === "pro") {
      const itemsToEnable = filteredProducts.filter(p => selectedResources.includes(p.id) && !p.arEnabled && !!p.modelUrl).length;
      const currentTotal = products.filter(p => p.arEnabled).length;
      if (currentTotal + itemsToEnable > (10 + extraSlots)) {
        setToastMessage("批量激活数量超出了当前坑位上限，请单独点击开通坑位。");
        setShowToast(true);
        return;
      }
    }

    setProducts(prev => prev.map(p => selectedResources.includes(p.id) ? { ...p, arEnabled: enable ? (!!p.modelUrl) : false } : p));
    // 🌟 换上了隐形引擎
    safeSubmit({ actionType: "bulk_toggle_ar", productIds: JSON.stringify(selectedResources), arState: enable ? "true" : "false" });
    clearSelection();
  };

  const handleBulkUnbind = () => {
    if (selectedResources.length === 0) return;
    if (confirm(`确定要批量解除这 ${selectedResources.length} 个商品的 3D 模型绑定吗？`)) {
      setProducts(prev => prev.map(p => selectedResources.includes(p.id) ? { ...p, modelUrl: "", arEnabled: false } : p));
      // 🌟 换上了隐形引擎
      safeSubmit({ actionType: "bulk_unbind", productIds: JSON.stringify(selectedResources) });
      clearSelection();
    }
  };

  const handleOpenModal = (product) => {
    if (currentPlan === "free" && !product.modelUrl) {
      const currentBoundCount = products.filter(p => p.modelUrl).length;
      if (currentBoundCount >= 3) {
        setLimitModalType("MODEL");
        setLimitModal(true);
        return; 
      }
    }
    const latestStateProduct = products.find(p => p.id === product.id) || product;
    setSelectedProduct(latestStateProduct);
    setInputModelUrl(latestStateProduct.modelUrl || "");
    setActiveModal(true);
  };

  const handleSaveMapping = () => {
    const targetUrl = inputModelUrl.trim();
    if (!selectedProduct?.id || !targetUrl) return;

    setProducts(prev => prev.map(p => p.id === selectedProduct.id ? { ...p, modelUrl: targetUrl } : p));
    setActiveModal(false);
    
    // 🌟 换上了隐形引擎
    safeSubmit({ actionType: "bind", productId: selectedProduct.id, modelUrl: targetUrl });
  };

  const handleUnbind = (product) => {
    if (confirm("解除绑定会同步关闭该商品的移动端 AR 实景功能。确定吗？")) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, modelUrl: "", arEnabled: false } : p));
      // 🌟 换上了隐形引擎
      safeSubmit({ actionType: "unbind", productId: product.id });
    }
  };

  const renderQuotaBanner = () => {
    if (currentPlan === "pro") {
      return <Banner tone="info" title="专业版 套餐状态"><Text as="p">{t.quotaBannerPro} <b>{arActiveCount} / {10 + extraSlots}</b> 个商品名额</Text></Banner>;
    }
    if (currentPlan === "enterprise") {
      return <Banner tone="success" title="旗舰版 套餐状态"><p>{t.quotaBannerEnterprise}</p></Banner>;
    }
    return <Banner tone="warning" title="免费版 套餐状态"><p>{t.quotaBannerFree.replace("{modelCount}", modelActiveCount)}</p></Banner>;
  };

  const rowMarkup = currentPagedProducts.map((product, index) => (
    <IndexTable.Row id={product.id} key={product.id} selected={selectedResources.includes(product.id)} position={index}>
      <IndexTable.Cell>
        <InlineStack gap="300" blockAlign="center">
          <Thumbnail source={product.image} alt={product.title} size="small" />
          <BlockStack gap="050">
            <Text variant="bodyMd" fontWeight="bold" as="span">{product.title}</Text>
            <Text variant="bodySm" tone="subdued" as="span">SKU: {product.sku}</Text>
          </BlockStack>
        </InlineStack>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={product.modelUrl ? "success" : "attention"}>
          <InlineStack gap="100" blockAlign="center">
            <Icon source={product.modelUrl ? CheckCircleIcon : AlertCircleIcon} tone={product.modelUrl ? "success" : "attention"} />
            {product.modelUrl ? t.bound : t.unbound}
          </InlineStack>
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <InlineStack gap="100" blockAlign="center">
          <Checkbox label="" checked={product.arEnabled} disabled={!product.modelUrl} onChange={(newChecked) => handleToggleAr(product, newChecked)} />
          {currentPlan === "free" && <Icon source={LockIcon} tone="subdued" />}
          <Text variant="bodySm" tone={product.arEnabled ? "base" : "subdued"}>{t.arToggleLabel}</Text>
        </InlineStack>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <InlineStack gap="150" align="end" blockAlign="center">
          {product.modelUrl && <Button variant="plain" tone="critical" icon={DeleteIcon} onClick={() => handleUnbind(product)} />}
          <Button variant={product.modelUrl ? "secondary" : "primary"} onClick={() => handleOpenModal(product)}>{product.modelUrl ? t.btnModify : t.btnBind}</Button>
        </InlineStack>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Frame>
      <Page
        backAction={{ content: t.backBtn, onAction: () => navigate("/app" + window.location.search) }} 
        title={t.pageTitle}
        subtitle={t.pageSubtitle}
        primaryAction={{ content: t.syncBtn, icon: PlusIcon, onAction: handleSyncProducts, loading: isSyncing }}
        secondaryActions={
          <Popover active={popoverActive} activator={<Button onClick={() => setPopoverActive(!popoverActive)} icon={LanguageIcon} disclosure>{t.langName}</Button>} onClose={() => setPopoverActive(false)}>
            <ActionList items={[{ content: "简体中文", active: locale === "zh", onAction: () => { setLocale("zh"); setPopoverActive(false); } }, { content: "English", active: locale === "en", onAction: () => { setLocale("en"); setPopoverActive(false); } }]} />
          </Popover>
        }
      >
        <BlockStack gap="400">
          {renderQuotaBanner()}
          <Card padding="0">
            <Box padding="400">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="300" blockAlign="center">
                  <Box minWidth="320px"><TextField prefix={<Icon source={SearchIcon} />} placeholder={t.searchPlaceholder} value={searchQuery} onChange={setSearchQuery} autoComplete="off" clearButton onClearButtonClick={() => setSearchQuery("")} /></Box>
                  <Box minWidth="160px"><Select label="statusFilter" labelHidden options={filterOptions} value={statusFilter} onChange={setStatusFilter} /></Box>
                </InlineStack>
                <Button variant="plain" tone="critical" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }} disabled={searchQuery === "" && statusFilter === "all"}>{t.clearBtn}</Button>
              </InlineStack>
            </Box>

            {filteredProducts.length === 0 ? (
              <Box padding="800" textAlign="center"><Text tone="subdued">暂无对应条件商品</Text></Box>
            ) : (
              <BlockStack>
                <IndexTable
                  resourceName={{ singular: '商品', plural: '商品' }}
                  itemCount={currentPagedProducts.length}
                  selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
                  onSelectionChange={handleSelectionChange}
                  bulkActions={[
                    { content: '批量激活手机端 AR', onAction: () => handleBulkToggleAr(true) },
                    { content: '批量关闭手机端 AR', onAction: () => handleBulkToggleAr(false) },
                    { content: '批量解除 3D 绑定', destructive: true, onAction: handleBulkUnbind },
                  ]}
                  headings={[{ title: '商品展示信息' }, { title: '3D 模型状态' }, { title: '手机端 AR 控制' }, { title: '基础管理操作', alignment: 'end' }]}
                >
                  {rowMarkup}
                </IndexTable>
                
                {totalPages > 1 && (
                  <Box padding="400" borderBlockStart="1px solid var(--p-color-border-subdued)">
                    <InlineStack align="center">
                      <Pagination
                        hasPrevious={currentPage > 1}
                        onPrevious={() => { setCurrentPage(prev => prev - 1); clearSelection(); }}
                        hasNext={currentPage < totalPages}
                        onNext={() => { setCurrentPage(prev => prev + 1); clearSelection(); }}
                        label={`${currentPage} / ${totalPages}`}
                      />
                    </InlineStack>
                  </Box>
                )}
              </BlockStack>
            )}
          </Card>
        </BlockStack>

        <Modal open={activeModal} onClose={() => setActiveModal(false)} title={t.modalTitle} primaryAction={{ content: t.saveBtn, onAction: handleSaveMapping }} secondaryActions={[{ content: t.cancelBtn, onAction: () => setActiveModal(false) }]}>
          <Modal.Section>
            <BlockStack gap="400">
              <TextField label={t.modalLabel} value={inputModelUrl} onChange={setInputModelUrl} autoComplete="off" placeholder="粘贴您的官方商品 .glb 链接" />
              
              {inputModelUrl && inputModelUrl.toLowerCase().endsWith(".glb") && (
                <BlockStack gap="300">
                  <InlineStack gap="100" blockAlign="center"><Icon source={ViewIcon} tone="info" /><Text variant="headingSm">{t.modalPreview}</Text></InlineStack>
                  <Box background="bg-surface-secondary-active" borderRadius="300" minHeight="300px" style={{ border: '1px solid #ddd', overflow: 'hidden' }}><model-viewer src={inputModelUrl} camera-controls auto-rotate ar shadow-intensity="1" environment-image="neutral" style={{ width: '100%', height: '300px', '--poster-color': 'transparent' }} /></Box>
                </BlockStack>
              )}
            </BlockStack>
          </Modal.Section>
        </Modal>

        <Modal open={limitModal} onClose={() => setLimitModal(false)} title={limitModalType === "AR" ? t.limitModalTitle : t.limitModalTitleModel} primaryAction={{ content: t.limitModalBtn, onAction: () => navigate("/app" + window.location.search) }} secondaryActions={[{ content: t.cancelBtn, onAction: () => setLimitModal(false) }]}>
          <Modal.Section>
            <BlockStack gap="300">
              <Banner tone="critical" title="Quota Exceeded">
                <p>{limitModalType === "AR" ? (currentPlan === "free" ? t.limitModalFreeMsg : t.limitModalProMsg) : t.limitModalFreeModelMsg}</p>
              </Banner>
              <Text as="p" tone="subdued">独立站大数据研究表明：全店开启 3D 交互与 AR 实景，买家转化率最高可拉升 22%！建议您立即升级套餐。</Text>
            </BlockStack>
          </Modal.Section>
        </Modal>

        <Modal open={overageModal} onClose={() => setOverageModal(false)} title={t.overageTitle} primaryAction={{ content: t.overageBtn, onAction: handleConfirmOverage }} secondaryActions={[{ content: t.cancelBtn, onAction: () => setOverageModal(false) }]}>
          <Modal.Section>
            <BlockStack gap="300">
              <Banner tone="info" title="Flexible Usage Billing">
                <p>{t.overageMsg}</p>
              </Banner>
              <Text as="p" tone="subdued">温馨提示：额外席位费将在月底随 Shopify 账单合并结算。本周期内只要取消勾选，次月即可自动停止扣款并缩减额度。</Text>
            </BlockStack>
          </Modal.Section>
        </Modal>
        {showToast && <Toast content={toastMessage} onDismiss={() => setShowToast(false)} />}
      </Page>
    </Frame>
  );
}