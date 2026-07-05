import { useState } from "react";
import { Box, BlockStack, InlineStack, Text, Card, Badge, Button, Divider, Icon, InlineGrid, ButtonGroup } from "@shopify/polaris";
import { CheckCircleIcon } from "@shopify/polaris-icons";

const cardStyle = (active, highlight) => ({
  padding: "32px 28px",
  borderRadius: "10px",
  background: active ? "#f9fafb" : "#fff",
  border: highlight ? "2px solid #111" : "1px solid #e5e7eb",
  position: "relative",
  height: "100%",
});

export default function PlanSelector({ currentPlan, t, onUpgrade, onCancel }) {
  const [billingInterval, setBillingInterval] = useState("monthly");
  const isAnnual = billingInterval === "annual";
  const isActive = (plan) => currentPlan === plan || currentPlan.startsWith(plan);

  return (
    <Box>
      <BlockStack gap="600">
        <InlineStack align="space-between" blockAlign="center">
          <Text variant="headingLg" as="h2" fontWeight="semibold">{t.planSelectTitle}</Text>
          <ButtonGroup>
            <Button pressed={billingInterval === "monthly"} onClick={() => setBillingInterval("monthly")} size="slim">{t.billingMonthly}</Button>
            <Button pressed={billingInterval === "annual"} onClick={() => setBillingInterval("annual")} size="slim">{t.billingAnnual}</Button>
          </ButtonGroup>
        </InlineStack>

        <InlineGrid columns={{ xs: 1, md: 3 }} gap="600">
          {/* Free */}
          <div style={{...cardStyle(isActive("free"), false), animation: "fadeUp .4s ease-out 0s both"}}>
            <BlockStack gap="500">
              <BlockStack gap="200">
                <Text variant="headingMd" fontWeight="semibold">{t.tierFreeName}</Text>
                <Text variant="bodySm" tone="subdued">{t.tierFreeF1}</Text>
              </BlockStack>
              <BlockStack gap="150">
                {[t.tierFreeF1, t.tierFreeF2, t.tierFreeF3, t.tierFreeF4].map((f, i) => (
                  <InlineGrid key={i} columns="auto 1fr" gap="150">
                    <Box width="16px" paddingBlockStart="050">
                      <Icon source={CheckCircleIcon} tone={i < 2 ? "base" : "subdued"} />
                    </Box>
                    <Text variant="bodySm" tone={i < 2 ? undefined : "subdued"}>{f}</Text>
                  </InlineGrid>
                ))}
              </BlockStack>
              <Divider />
              <BlockStack gap="200">
                <Text variant="heading2xl" fontWeight="bold">$0<Text variant="bodySm" tone="subdued" as="span">{t.tierFreePrice}</Text></Text>
              </BlockStack>
              <Button fullWidth size="large" disabled>{t.btnNA}</Button>
            </BlockStack>
          </div>

          {/* Growth */}
          <div style={{...cardStyle(isActive("growth"), true), animation: "fadeUp .4s ease-out .1s both"}}>
            {!isActive("growth") && (
              <div style={{position:"absolute",top:-1,left:-1,right:-1,height:3,background:"#111",borderRadius:"10px 10px 0 0"}} />
            )}
            <BlockStack gap="500">
              <BlockStack gap="200">
                <InlineStack gap="200" blockAlign="center">
                  <Text variant="headingMd" fontWeight="semibold">{t.tierProName}</Text>
                  {isActive("growth") && <Badge tone="success">{t.statusActive}</Badge>}
                </InlineStack>
                <Text variant="bodySm" tone="subdued">{t.tierProF1}</Text>
              </BlockStack>
              <BlockStack gap="150">
                {[t.tierProF1, t.tierProF2, t.tierProF3, t.tierProF4, t.tierProF5].map((f, i) => (
                  <InlineGrid key={i} columns="auto 1fr" gap="150">
                    <Box width="16px" paddingBlockStart="050"><Icon source={CheckCircleIcon} tone={i < 2 ? "success" : "base"} /></Box>
                    <Text variant="bodySm" fontWeight={i < 2 ? "semibold" : undefined}>{f}</Text>
                  </InlineGrid>
                ))}
              </BlockStack>
              <Divider />
              <BlockStack gap="100">
                <Text variant="heading2xl" fontWeight="bold">
                  {isAnnual ? "$539.89" : "$49.99"}
                  <Text variant="bodySm" tone="subdued" as="span">{isAnnual ? t.tierAnnualPrice : t.tierProPrice}</Text>
                </Text>
                <Text variant="bodyXs" tone="subdued">{isAnnual ? t.annualSavings : t.trialText}</Text>
              </BlockStack>
              <Button
                fullWidth size="large"
                variant={isActive("growth") ? undefined : "primary"}
                disabled={isActive("growth") || currentPlan.startsWith("business")}
                onClick={() => onUpgrade(isAnnual ? "upgrade_growth_annual" : "upgrade_growth_monthly")}
              >
                {isActive("growth") ? t.btnCurrent : currentPlan.startsWith("business") ? t.btnNA : t.btnUpgrade}
              </Button>
            </BlockStack>
          </div>

          {/* Business */}
          <div style={{...cardStyle(isActive("business"), false), animation: "fadeUp .4s ease-out .2s both"}}>
            <BlockStack gap="500">
              <BlockStack gap="200">
                <InlineStack gap="200" blockAlign="center">
                  <Text variant="headingMd" fontWeight="semibold">{t.tierEntName}</Text>
                  {isActive("business") && <Badge tone="info">{t.statusActive}</Badge>}
                </InlineStack>
                <Text variant="bodySm" tone="subdued">{t.tierEntF2}</Text>
              </BlockStack>
              <BlockStack gap="150">
                {[t.tierEntF1, t.tierEntF2, t.tierEntF3, t.tierEntF4, t.tierEntF5].map((f, i) => (
                  <InlineGrid key={i} columns="auto 1fr" gap="150">
                    <Box width="16px" paddingBlockStart="050"><Icon source={CheckCircleIcon} tone="base" /></Box>
                    <Text variant="bodySm" fontWeight={i < 2 ? "semibold" : undefined}>{f}</Text>
                  </InlineGrid>
                ))}
              </BlockStack>
              <Divider />
              <BlockStack gap="100">
                <Text variant="heading2xl" fontWeight="bold">
                  {isAnnual ? "$1079.89" : "$99.99"}
                  <Text variant="bodySm" tone="subdued" as="span">{isAnnual ? t.tierAnnualPrice : t.tierProPrice}</Text>
                </Text>
                <Text variant="bodyXs" tone="subdued">{isAnnual ? t.annualSavings : t.entNoTrial}</Text>
              </BlockStack>
              <Button
                fullWidth size="large"
                variant={isActive("business") ? undefined : "primary"}
                disabled={isActive("business")}
                onClick={() => onUpgrade(isAnnual ? "upgrade_business_annual" : "upgrade_business_monthly")}
              >
                {isActive("business") ? t.btnCurrent : t.btnUpgradeEnt}
              </Button>
            </BlockStack>
          </div>
        </InlineGrid>
      </BlockStack>

      {(currentPlan === "growth_monthly" || currentPlan === "growth_annual" || currentPlan === "business_monthly" || currentPlan === "business_annual") && (
        <Box padding="400" background="bg-surface-secondary" borderRadius="200" marginTop="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text tone="subdued" variant="bodySm">{t.cancelHint}</Text>
            <Button tone="critical" onClick={onCancel}>{t.btnCancel}</Button>
          </InlineStack>
        </Box>
      )}
    </Box>
  );
}
