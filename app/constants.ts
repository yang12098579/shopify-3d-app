export const PLAN_PRO = "Vision3D Growth Plan" as const;
export const PLAN_ENTERPRISE = "Vision3D Business Plan" as const;
export const PLAN_FREE_LABEL = "free" as const;

export const QUOTA = {
  FREE_MAX_PRODUCTS: 1,
  PRO_AR_SLOTS: 15,
  PRO_OVERAGE_PRICE: 2.99,
} as const;


export const METAFIELD_NAMESPACE = "product_3d_app" as const;
export const METAFIELD_KEY_PLAN = "plan_level" as const;
export const METAFIELD_KEY_ALLOWED = "allowed_products" as const;
