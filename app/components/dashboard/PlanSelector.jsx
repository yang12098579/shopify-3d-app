import { Box, BlockStack, InlineStack, Text, Card, Badge, Button, Divider, Icon, InlineGrid } from "@shopify/polaris";
import { CheckCircleIcon } from "@shopify/polaris-icons";

export default function PlanSelector({ currentPlan, t, onUpgrade, onCancel }) {
  const isActive = (plan) => currentPlan === plan || currentPlan.startsWith(plan);

  return (
    <Box>
      <Text variant="headingLg" as="h2" fontWeight="bold">{t.planSelectTitle}</Text>
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
          />

          {/* Pro Tier */}
          <PricingCard
            name={t.tierProName}
            tone="success"
            price="$29.99"
            period={t.tierProPrice}
            trial={t.trialText}
            features={[
              { text: t.tierProF1, ok: true, bold: true },
              { text: t.tierProF2, ok: true, bold: true },
              { text: t.tierProF3, ok: true },
              { text: t.tierProF4, ok: true },
              { text: t.tierProF5, ok: true },
            ]}
            isActive={isActive("pro")}
            activeLabel={t.statusActive}
            buttonLabel={
              isActive("pro") ? t.btnCurrent
                : currentPlan.startsWith("enterprise") ? t.btnNA
                : t.btnUpgrade
            }
            buttonVariant="primary"
            disabled={isActive("pro") || currentPlan.startsWith("enterprise")}
            onClick={() => onUpgrade("upgrade_pro")}
          />

          {/* Enterprise Tier */}
          <PricingCard
            name={t.tierEntName}
            tone="info"
            price="$49.99"
            period={t.tierProPrice}
            subtext={t.entNoTrial}
            features={[
              { text: t.tierEntF1, ok: true, bold: true },
              { text: t.tierEntF2, ok: true, bold: true },
              { text: t.tierEntF3, ok: true },
              { text: t.tierEntF4, ok: true },
              { text: t.tierEntF5, ok: true },
            ]}
            isActive={isActive("enterprise")}
            activeLabel={t.statusActive}
            buttonLabel={isActive("enterprise") ? t.btnCurrent : t.btnUpgradeEnt}
            buttonVariant="primary"
            disabled={isActive("enterprise")}
            onClick={() => onUpgrade("upgrade_enterprise")}
          />
        </InlineGrid>
      </Box>

      {(currentPlan === "pro" || currentPlan.startsWith("enterprise")) && (
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

/** Reusable pricing card */
function PricingCard({ name, tone, price, period, trial, subtext, features, isActive, activeLabel, buttonLabel, buttonVariant, disabled, onClick }) {
  const bg = isActive ? `bg-surface-${tone}-subdued` : "bg-surface";
  return (
    <Card background={bg}>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text variant="headingLg" fontWeight="bold" tone={tone}>{name}</Text>
          {isActive && <Badge tone={tone}>{activeLabel}</Badge>}
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
        <Button fullWidth size="large" variant={buttonVariant} onClick={onClick} disabled={disabled}>
          {buttonLabel}
        </Button>
      </BlockStack>
    </Card>
  );
}
