import { Box, BlockStack, InlineStack, Text, Badge, Button, Divider, Icon, InlineGrid } from "@shopify/polaris";
import { MagicIcon, DatabaseIcon, AutomationIcon, CheckCircleIcon } from "@shopify/polaris-icons";
import { useNavigate, useLocation } from "react-router";

const stepStyles = [
  { iconBg: "linear-gradient(135deg,#667eea,#764ba2)", glow: "rgba(102,126,234,.2)" },
  { iconBg: "linear-gradient(135deg,#f093fb,#f5576c)", glow: "rgba(240,147,251,.2)" },
  { iconBg: "linear-gradient(135deg,#43e97b,#38f9d7)", glow: "rgba(67,233,123,.2)" },
];

export default function SetupGuide({ shop, currentPlan, t }) {
  const navigate = useNavigate();
  const location = useLocation();

  const steps = [
    { title: t.step1, desc: t.step1Desc, icon: DatabaseIcon, num: "01" },
    { title: t.step2, desc: t.step2Desc, icon: AutomationIcon, num: "02" },
    { title: t.step3, desc: t.step3Desc, icon: MagicIcon, num: "03" },
  ];

  return (
    <Box>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="200" blockAlign="center">
            <div style={{width:4,height:20,borderRadius:2,background:"linear-gradient(180deg,#667eea,#764ba2)"}} />
            <Text variant="headingMd" as="h2">{t.setupTitle}</Text>
          </InlineStack>
          <Badge tone={currentPlan !== "free" ? "success" : "attention"} size="large">
            <InlineStack gap="100" blockAlign="center">
              <Icon source={CheckCircleIcon} />
              {currentPlan !== "free" ? t.setupBadgeReady : t.setupBadgePending}
            </InlineStack>
          </Badge>
        </InlineStack>

        <InlineGrid columns={{ xs: 1, sm: 3 }} gap="300">
          {steps.map((step, idx) => (
            <Box key={idx} background="bg-surface-secondary" padding="400" borderRadius="300">
              <BlockStack gap="150">
                <InlineStack gap="200" align="start" blockAlign="center">
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: stepStyles[idx].iconBg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 16px " + stepStyles[idx].glow,
                  }}>
                    <Icon source={step.icon} tone="base" />
                  </div>
                  <BlockStack gap="050">
                    <Text variant="bodyXs" tone="subdued" fontWeight="bold">STEP {step.num}</Text>
                    <Text variant="headingSm" as="h3">{step.title}</Text>
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
