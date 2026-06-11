import { Box, BlockStack, InlineStack, Text, Badge, Button, Divider, Icon, InlineGrid } from "@shopify/polaris";
import { MagicIcon, DatabaseIcon, AutomationIcon } from "@shopify/polaris-icons";
import { useNavigate, useLocation } from "react-router";

export default function SetupGuide({ shop, currentPlan, t }) {
  const navigate = useNavigate();
  const location = useLocation();

  const steps = [
    { title: t.step1, desc: t.step1Desc, icon: DatabaseIcon },
    { title: t.step2, desc: t.step2Desc, icon: AutomationIcon },
    { title: t.step3, desc: t.step3Desc, icon: MagicIcon },
  ];

  return (
    <Box>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text variant="headingMd" as="h2">{t.setupTitle}</Text>
          <Badge tone={currentPlan !== "free" ? "success" : "attention"}>
            {currentPlan !== "free" ? t.setupBadgeReady : t.setupBadgePending}
          </Badge>
        </InlineStack>

        <InlineGrid columns={{ xs: 1, sm: 3 }} gap="200">
          {steps.map((step, idx) => (
            <Box key={idx} background="bg-surface-secondary" padding="300" borderRadius="200">
              <BlockStack gap="050">
                <InlineStack gap="100" align="start" blockAlign="center">
                  <Box width="20px"><Icon source={step.icon} tone="base" /></Box>
                  <Text variant="headingSm" as="h3">{step.title}</Text>
                </InlineStack>
                <Text variant="bodySm" tone="subdued">{step.desc}</Text>
              </BlockStack>
            </Box>
          ))}
        </InlineGrid>

        <Divider />
        <InlineStack gap="300">
          <Button variant="primary" size="large" icon={MagicIcon} url={`https://${shop}/admin/themes/current/editor?template=product`} target="_blank">{t.btnEditor}</Button>
          <Button size="large" icon={DatabaseIcon} url={`https://${shop}/admin/settings/files`} target="_blank">{t.btnFiles}</Button>
          <Button size="large" variant="secondary" onClick={() => navigate(`/app/additional${location.search}`)}>
            {t.btnGoManage}
          </Button>
        </InlineStack>
      </BlockStack>
    </Box>
  );
}
