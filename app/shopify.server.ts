import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
  BillingInterval,
  BillingReplacementBehavior, DeliveryMethod,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { PLAN_PRO, PLAN_ENTERPRISE } from "./constants";




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
        // 1. 鍥哄畾鏈堣垂椤圭洰
        {
          amount: 29.99,
          currencyCode: 'USD',
          interval: BillingInterval.Every30Days,
        },
        // 2. 寮规€ф寜閲忚璐归」鐩?
        {
          amount: 100.00, 
          currencyCode: 'USD',
          interval: BillingInterval.Usage,
          terms: "Vision3D Extra AR product preview ($1.99 per extra active model overage)",
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
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
    },
    APP_SUBSCRIPTIONS_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks",
    },
  },

  future: {
    expiringOfflineAccessTokens: true, // 馃挕 宸茬粡瀹岀編淇锛屽幓鎺変簡澶氫綑鐨勯敊瀛?
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

