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
import { PLAN_GROWTH_MONTHLY, PLAN_GROWTH_ANNUAL, PLAN_BUSINESS_MONTHLY, PLAN_BUSINESS_ANNUAL, PRICING } from "./constants";

if (typeof process !== "undefined" && process.env) {
  process.env.NO_PROXY = "127.0.0.1,localhost";
}

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: (process.env.SHOPIFY_API_SECRET || (() => { throw new Error("[Vision3D] CRITICAL: SHOPIFY_API_SECRET is not set. App cannot initialize Shopify API."); })()),
  apiVersion: ApiVersion.April26,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  
  billing: {
    [PLAN_GROWTH_MONTHLY]: {
      lineItems: [
        {
          amount: PRICING.GROWTH_MONTHLY,
          currencyCode: 'USD',
          interval: BillingInterval.Every30Days,
        },
        {
          amount: 150.00,
          currencyCode: 'USD',
          interval: BillingInterval.Usage,
          terms: "Vision3D Extra AR product preview ($2.99 per extra active model overage)",
        }
      ],
      replacementBehavior: BillingReplacementBehavior.ApplyImmediately,
    },
    [PLAN_GROWTH_ANNUAL]: {
      lineItems: [
        {
          amount: PRICING.GROWTH_ANNUAL,
          currencyCode: 'USD',
          interval: BillingInterval.Annual,
        },
        {
          amount: 150.00,
          currencyCode: 'USD',
          interval: BillingInterval.Usage,
          terms: "Vision3D Extra AR product preview ($2.99 per extra active model overage)",
        }
      ],
      replacementBehavior: BillingReplacementBehavior.ApplyImmediately,
    },
    [PLAN_BUSINESS_MONTHLY]: {
      lineItems: [
        {
          amount: PRICING.BUSINESS_MONTHLY,
          currencyCode: 'USD',
          interval: BillingInterval.Every30Days,
        },
      ],
      replacementBehavior: BillingReplacementBehavior.ApplyImmediately,
    },
    [PLAN_BUSINESS_ANNUAL]: {
      lineItems: [
        {
          amount: PRICING.BUSINESS_ANNUAL,
          currencyCode: 'USD',
          interval: BillingInterval.Annual,
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
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.April26;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
