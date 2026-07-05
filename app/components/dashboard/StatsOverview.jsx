import { Box, BlockStack, InlineStack, Text, Icon, InlineGrid } from "@shopify/polaris";
import { AlertBubbleIcon, ViewIcon, CartAbandonedIcon, ClockIcon, TargetIcon, MobileIcon } from "@shopify/polaris-icons";

const cardStyle = {
  padding: "24px",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
};

const iconStyle = {
  width: 36, height: 36, borderRadius: 8,
  background: "#f3f4f6", display: "flex",
  alignItems: "center", justifyContent: "center",
};

function StatCard({ icon, label, value, delay }) {
  return (
    <div className="card-hover" style={{...cardStyle, animation: "fadeUp .4s ease-out " + delay + "s both"}}>
      <BlockStack gap="200">
        <div style={iconStyle}><Icon source={icon} tone="base" /></div>
        <BlockStack gap="050">
          <Text variant="bodySm" tone="subdued">{label}</Text>
          <Text variant="headingLg" fontWeight="bold">{value}</Text>
        </BlockStack>
      </BlockStack>
    </div>
  );
}

export default function StatsOverview({ statsData, currentPlan, arActiveCount, t, getLimitDisplay }) {
  const isFree = currentPlan === "free";
  return (
    <BlockStack gap="500">
      <InlineStack align="space-between" blockAlign="center">
        <Text variant="headingMd" as="h2" fontWeight="semibold">{t.insightTitle}</Text>
        <div style={{fontSize:12,color:"#6b7280",fontWeight:500,letterSpacing:".5px",textTransform:"uppercase"}}>
          {isFree ? "Free" : currentPlan.startsWith("growth") ? "Growth" : "Business"}
        </div>
      </InlineStack>

      <InlineGrid columns={{ xs: 2, md: 4 }} gap="400">
        <StatCard icon={ViewIcon} label={t.statViews} value={statsData.views} delay={0} />
        <StatCard icon={MobileIcon} label={t.statAR} value={statsData.arUses} delay={0.05} />
        <StatCard icon={CartAbandonedIcon} label={t.statAddCart} value={statsData.addCartCount || 0} delay={0.1} />
        <StatCard icon={ClockIcon} label={t.statTime} value={statsData.stayTime} delay={0.15} />
      </InlineGrid>

      <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
        <div className="card-hover" style={{...cardStyle, animation: "fadeUp .4s ease-out .2s both"}}>
          <BlockStack gap="200">
            <div style={iconStyle}><Icon source={TargetIcon} tone="base" /></div>
            <BlockStack gap="050">
              <Text variant="bodySm" tone="subdued">Conversion</Text>
              <Text variant="headingLg" fontWeight="bold">{statsData.conversion || "0%"}</Text>
            </BlockStack>
          </BlockStack>
        </div>

        <div className="card-hover" style={{
          ...cardStyle, animation: "fadeUp .4s ease-out .25s both",
          border: isFree ? "1px solid #fecaca" : "1px solid #bfdbfe",
          background: isFree ? "#fef2f2" : "#eff6ff",
        }}>
          <BlockStack gap="200">
            <InlineStack gap="100" blockAlign="center">
              <Icon source={AlertBubbleIcon} tone={isFree ? "critical" : "info"} />
              <Text variant="bodySm" tone={isFree ? "critical" : "info"}>{t.statSub}</Text>
            </InlineStack>
            <Text variant="headingLg" fontWeight="bold">{getLimitDisplay()}</Text>
          </BlockStack>
        </div>
      </InlineGrid>
    </BlockStack>
  );
}
