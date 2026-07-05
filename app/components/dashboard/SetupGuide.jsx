import { Box, BlockStack, InlineStack, Text, Badge, Button, Divider, Icon, InlineGrid } from "@shopify/polaris";
import { MagicIcon, DatabaseIcon, AutomationIcon, CheckCircleIcon } from "@shopify/polaris-icons";
import { useNavigate, useLocation } from "react-router";

const stepIcon = {
  width: 40, height: 40, borderRadius: 8,
  background: "#f3f4f6", display: "flex",
  alignItems: "center", justifyContent: "center",
};

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
      <BlockStack gap="500">
        <InlineStack align="space-between" blockAlign="center">
          <Text variant="headingMd" as="h2" fontWeight="semibold">{t.setupTitle}</Text>
          <Badge tone={currentPlan !== "free" ? "success" : "attention"}>
            <InlineStack gap="100" blockAlign="center">
              <Icon source={CheckCircleIcon} />
              {currentPlan !== "free" ? t.setupBadgeReady : t.setupBadgePending}
            </InlineStack>
          </Badge>
        </InlineStack>

        <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
          {steps.map((step, idx) => (
            <Box key={idx} background="bg-surface-secondary" padding="400" borderRadius="200">
              <BlockStack gap="300">
                <InlineStack gap="200" blockAlign="center">
                  <div style={stepIcon}><Icon source={step.icon} tone="base" /></div>
                  <BlockStack gap="050">
                    <Text variant="bodyXs" tone="subdued" fontWeight="medium">{"0" + (idx + 1)}</Text>
                    <Text variant="headingSm" as="h3" fontWeight="semibold">{step.title}</Text>
                  </BlockStack>
                </InlineStack>
                <Text variant="bodySm" tone="subdued">{step.desc}</Text>
              </BlockStack>
            </Box>
          ))}
        </InlineGrid>

        <Divider />
        <InlineStack gap="300" wrap={false}>
          <Button variant="primary" size="large" icon={MagicIcon} url={"https://" + shop + "/admin/themes/current/editor?template=product"} target="_blank">{t.btnEditor}</Button>
          <Button size="large" icon={DatabaseIcon} url={"https://" + shop + "/admin/settings/files"} target="_blank">{t.btnFiles}</Button>
          <Button size="large" variant="secondary" onClick={() => navigate("/app/additional" + location.search)}>
            {t.btnGoManage}
          </Button>
        </InlineStack>
      </BlockStack>
    </Box>
  );
}
