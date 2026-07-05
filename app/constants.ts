export const PLAN_GROWTH_MONTHLY = "Vision3D Growth Plan (Monthly)" as const;
export const PLAN_GROWTH_ANNUAL = "Vision3D Growth Plan (Annual)" as const;
export const PLAN_BUSINESS_MONTHLY = "Vision3D Business Plan (Monthly)" as const;
export const PLAN_BUSINESS_ANNUAL = "Vision3D Business Plan (Annual)" as const;
export const PLAN_FREE_LABEL = "free" as const;

export const PRICING = {
  GROWTH_MONTHLY: 49.99,
  GROWTH_ANNUAL: 539.89,
  BUSINESS_MONTHLY: 99.99,
  BUSINESS_ANNUAL: 1079.89,
  OVERAGE: 3.99,
} as const;

export const QUOTA = {
  FREE_MAX_PRODUCTS: 3,
  PRO_AR_SLOTS: 10,
  PRO_OVERAGE_PRICE: 3.99,
} as const;

export const METAFIELD_NAMESPACE = "product_3d_app" as const;
export const METAFIELD_KEY_PLAN = "plan_level" as const;
export const METAFIELD_KEY_ALLOWED = "allowed_products" as const;
