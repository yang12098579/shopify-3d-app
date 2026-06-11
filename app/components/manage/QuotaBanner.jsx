import { Banner, Text } from "@shopify/polaris";

export default function QuotaBanner({ currentPlan, arActiveCount, extraSlots, modelActiveCount, t }) {
  if (currentPlan === "pro") {
    return (
      <Banner tone="info" title={t.quotaBannerProTitle || "Pro Plan Status"}>
        <Text as="p">{t.quotaBannerPro} <b>{arActiveCount} / {10 + extraSlots}</b> {t.quotaBannerProSuffix || ""}</Text>
      </Banner>
    );
  }
  if (currentPlan === "enterprise") {
    return (
      <Banner tone="success" title={t.quotaBannerEnterpriseTitle || "Enterprise Status"}>
        <p>{t.quotaBannerEnterprise}</p>
      </Banner>
    );
  }
  return (
    <Banner tone="warning" title={t.quotaBannerFreeTitle || "Free Plan"}>
      <p>{t.quotaBannerFree.replace("{modelCount}", modelActiveCount)}</p>
    </Banner>
  );
}
