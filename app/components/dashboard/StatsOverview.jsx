import { Box, BlockStack, InlineStack, Text, Icon, InlineGrid } from "@shopify/polaris";
import { AlertBubbleIcon } from "@shopify/polaris-icons";

export default function StatsOverview({ statsData, currentPlan, arActiveCount, t, getLimitDisplay }) {
  return (
    <BlockStack gap="400">
      <Text variant="headingMd" as="h2">{t.insightTitle}</Text>
      <InlineGrid columns={{ xs: 2, md: 4 }} gap="400">
        <Box background="bg-surface-secondary" padding="400" borderRadius="300">
          <BlockStack gap="100">
            <Text variant="bodyXs" tone="subdued">{t.statViews}</Text>
            <Text variant="headingLg" tone="base">{statsData.views}</Text>
          </BlockStack>
        </Box>
        <Box background="bg-surface-secondary" padding="400" borderRadius="300">
          <BlockStack gap="100">
            <Text variant="bodyXs" tone="subdued">{t.statAR}</Text>
            <Text variant="headingLg" tone="base">{statsData.arUses}</Text>
          </BlockStack>
        </Box>
        <Box background="bg-surface-secondary" padding="400" borderRadius="300">
          <BlockStack gap="100">
            <Text variant="bodyXs" tone="subdued">{t.statAddCart}</Text>
            <Text variant="headingLg" tone="base">{statsData.addCartCount || 0}</Text>
          </BlockStack>
        </Box>
        <Box background={currentPlan === "free" ? "bg-surface-critical-subdued" : "bg-surface-info-subdued"} padding="400" borderRadius="300">
          <BlockStack gap="100">
            <InlineStack gap="050" blockAlign="center">
              <Box width="14px"><Icon source={AlertBubbleIcon} tone={currentPlan === "free" ? "critical" : "info"} /></Box>
              <Text variant="bodyXs" tone={currentPlan === "free" ? "critical" : "info"}>{t.statSub}</Text>
            </InlineStack>
            <Text variant="headingLg" fontWeight="bold">{getLimitDisplay()}</Text>
          </BlockStack>
        </Box>
      </InlineGrid>
    </BlockStack>
  );
}
