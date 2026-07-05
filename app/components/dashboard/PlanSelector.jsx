import { useState } from "react";
import { Box, BlockStack, InlineStack, Text, Card, Badge, Button, Divider, Icon, InlineGrid, ButtonGroup } from "@shopify/polaris";
import { CheckCircleIcon, StarIcon } from "@shopify/polaris-icons";

export default function PlanSelector({ currentPlan, t, onUpgrade, onCancel }) {
  const [billingInterval, setBillingInterval] = useState("monthly");
  const isAnnual = billingInterval === "annual";
  const isActive = (plan) => currentPlan === plan || currentPlan.startsWith(plan);

  return (
    <Box>
      <InlineStack align="space-between" blockAlign="center">
        <InlineStack gap="200" blockAlign="center">
          <div style={{width:4,height:20,borderRadius:2,background:"linear-gradient(180deg,#f59e0b,#ef4444)"}} />
          <Text variant="headingLg" as="h2" fontWeight="bold">{t.planSelectTitle}</Text>
        </InlineStack>
        <Box maxWidth="220px">
          <ButtonGroup>
            <Button
              pressed={billingInterval === "monthly"}
              onClick={() => setBillingInterval("monthly")}
              size="slim"
            >{t.billingMonthly}</Button>
            <Button
              pressed={billingInterval === "annual"}
              onClick={() => setBillingInterval("annual")}
              size="slim"
            >{t.billingAnnual}</Button>
          </ButtonGroup>
        </Box>
      </InlineStack>
      <Box marginTop="400">
        <InlineGrid columns={{ xs: 1, md: 3 }} gap="500">
          {/* Free Tier */}
          <PricingCard
            name={t.tierFreeName}
            tone="info"
            price="$0"
            period={t.tierFreePrice}
            features={[
              { text: t.tierFreeF1, ok: true },
              { text: t.tierFreeF2, ok: true },
              { text: t.tierFreeF3, ok: false },
              { text: t.tierFreeF4, ok: false },
            ]}
            isActive={isActive("free")}
            activeLabel={t.statusActive}
            buttonLabel={isActive("free") ? t.btnCurrent : t.btnNA}
            disabled
            delay={0}
          />

          {/* Growth Tier */}
          <PricingCard
            name={t.tierProName}
            tone="success"
            price={isAnnual ? "$539.89" : "$49.99"}
            period={isAnnual ? t.tierAnnualPrice : t.tierProPrice}
            subtext={isAnnual ? t.annualSavings : t.trialText}
            features={[
              { text: t.tierProF1, ok: true, bold: true },
              { text: t.tierProF2, ok: true, bold: true },
              { text: t.tierProF3, ok: true },
              { text: t.tierProF4, ok: true },
              { text: t.tierProF5, ok: true },
            ]}
            isActive={isActive("growth")}
            activeLabel={t.statusActive}
            highlight
            buttonLabel={
              isActive("growth") ? t.btnCurrent
                : currentPlan.startsWith("business") ? t.btnNA
                : t.btnUpgrade
            }
            buttonVariant="primary"
            disabled={isActive("growth")}
            onClick={() => onUpgrade(isAnnual ? "upgrade_growth_annual" : "upgrade_growth_monthly")}
            delay={0.1}
          />

          {/* Business Tier */}
          <PricingCard
            name={t.tierEntName}
            tone="info"
            price={isAnnual ? "$1079.89" : "$99.99"}
            period={isAnnual ? t.tierAnnualPrice : t.tierProPrice}
            subtext={isAnnual ? t.annualSavings : t.entNoTrial}
            features={[
              { text: t.tierEntF1, ok: true, bold: true },
              { text: t.tierEntF2, ok: true, bold: true },
              { text: t.tierEntF3, ok: true },
              { text: t.tierEntF4, ok: true },
              { text: t.tierEntF5, ok: true },
            ]}
            isActive={isActive("business")}
            activeLabel={t.statusActive}
            buttonLabel={isActive("business") ? t.btnCurrent : t.btnUpgradeEnt}
            buttonVariant="primary"
            disabled={isActive("business")}
            onClick={() => onUpgrade(isAnnual ? "upgrade_business_annual" : "upgrade_business_monthly")}
            delay={0.2}
          />
        </InlineGrid>
      </Box>

      {(currentPlan === "growth_monthly" || currentPlan === "growth_annual" || currentPlan === "business_monthly" || currentPlan === "business_annual") && (
        <Box padding="300" background="bg-surface-secondary" borderRadius="200" marginTop="300">
          <InlineStack align="space-between" blockAlign="center">
            <Text tone="subdued" variant="bodySm">{t.cancelHint}</Text>
            <Button tone="critical" onClick={onCancel}>{t.btnCancel}</Button>
          </InlineStack>
        </Box>
      )}
    </Box>
  );
}

function PricingCard({ name, tone, price, period, trial, subtext, features, isActive, activeLabel, buttonLabel, buttonVariant, disabled, onClick, highlight, delay }) {
  const bg = isActive ? "bg-surface-" + tone + "-subdued" : "bg-surface";
  return (
    <Card background={bg}>
      <div style={{ animation: "scaleIn .5s ease-out " + (delay||0) + "s both" }}>
        <BlockStack gap="400">
          {highlight && (
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 4,
              background: "linear-gradient(90deg,#10b981,#3b82f6,#8b5cf6)",
              borderRadius: "8px 8px 0 0",
            }} />
          )}
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="100" blockAlign="center">
              {highlight && <Icon source={StarIcon} tone="success" />}
              <Text variant="headingLg" fontWeight="bold" tone={tone}>{name}</Text>
            </InlineStack>
            {isActive && <Badge tone={tone} size="large">{activeLabel}</Badge>}
          </InlineStack>
          <BlockStack gap="150">
            {features.map((f, i) => (
              <InlineGrid key={i} columns="auto 1fr" gap="150">
                <Box width="16px" paddingBlockStart="050">
                  <Icon source={CheckCircleIcon} tone={f.ok ? tone : "critical"} />
                </Box>
                <Text fontWeight={f.bold ? "bold" : undefined} tone={f.ok ? undefined : "subdued"}>
                  {f.text}
                </Text>
              </InlineGrid>
            ))}
          </BlockStack>
          <Divider />
          <BlockStack gap="050">
            <Text variant="heading2xl" fontWeight="bold" tone={tone}>
              {price} <Text variant="bodySm" tone="subdued" as="span">{period}</Text>
            </Text>
            {trial && <Text variant="bodyXs" tone="success">{trial}</Text>}
            {subtext && <Text variant="bodyXs" tone="info">{subtext}</Text>}
          </BlockStack>
          <div style={{ animation: highlight ? "pulse-glow 2s ease-in-out infinite" : "none", borderRadius: 8 }}>
            <Button fullWidth size="large" variant={buttonVariant || (highlight ? "primary" : undefined)} onClick={onClick} disabled={disabled}>
              {buttonLabel}
            </Button>
          </div>
        </BlockStack>
      </div>
    </Card>
  );
}
