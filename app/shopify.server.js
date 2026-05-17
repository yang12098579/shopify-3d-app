import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
  BillingInterval,
  BillingReplacementBehavior,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

export const PLAN_PRO = 'Vision3D Professional Plan';
export const PLAN_ENTERPRISE = 'Vision3D Enterprise Plan';

if (typeof process !== "undefined" && process.env) {
  process.env.NO_PROXY = "127.0.0.1,localhost";
}

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  
  billing: {
    [PLAN_PRO]: {
      lineItems: [
        {
          amount: 29.99,
          currencyCode: 'USD',
          interval: BillingInterval.Every30Days,
        },
        // ❗ 核心修复：必须在全局注册 usage 弹性计费项，否则 Shopify 会判定为非法扣款
        {
          amount: 1.99,
          currencyCode: 'USD',
          interval: BillingInterval.Usage,
          terms: "Vision3D Extra AR product preview active mode overage usage tier",
        }
      ],
      trialDays: 3, 
      replacementBehavior: BillingReplacementBehavior.ApplyImmediately,
    },
    [PLAN_ENTERPRISE]: {
      lineItems: [
        {
          amount: 49.99,
          currencyCode: 'USD',
          interval: BillingInterval.Every30Days,
        },
      ],
      replacementBehavior: BillingReplacementBehavior.ApplyImmediately,
    },
  },

  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks",
    },
    APP_SUBSCRIPTIONS_UPDATE: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks",
    },
  },

  future: {
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;