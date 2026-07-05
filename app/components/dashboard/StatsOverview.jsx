import { Box, BlockStack, InlineStack, Text, Icon, InlineGrid } from "@shopify/polaris";
import { AlertBubbleIcon, ViewIcon, ChartLineIcon, CartAbandonedIcon, ClockIcon, TargetIcon, MobileIcon } from "@shopify/polaris-icons";

const cardBase = {
  padding: "20px", borderRadius: "12px", transition: "all .3s cubic-bezier(.4,0,.2,1)",
  cursor: "default", position: "relative", overflow: "hidden",
  background: "#fff", border: "1px solid rgba(0,0,0,.06)",
};

const iconBox = (grad) => ({
  width: 40, height: 40, borderRadius: 10,
  background: grad, display: "flex", alignItems: "center", justifyContent: "center",
});

function MiniCard({ icon, gradient, label, value, delay }) {
  return (
    <div className="card-hover" style={{...cardBase, animation: "fadeInUp .5s ease-out " + (delay||0) + "s both"}}>
      <InlineStack align="space-between" blockAlign="start">
        <BlockStack gap="050">
          <Text variant="bodyXs" tone="subdued">{label}</Text>
          <Text variant="headingLg" fontWeight="bold">{value}</Text>
        </BlockStack>
        <div style={iconBox(gradient)}>
          <Icon source={icon} tone="base" />
        </div>
      </InlineStack>
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:gradient,borderRadius:"0 0 12px 12px",opacity:.6}} />
    </div>
  );
}

export default function StatsOverview({ statsData, currentPlan, arActiveCount, t, getLimitDisplay }) {
  const isFree = currentPlan === "free";
  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center">
        <InlineStack gap="200" blockAlign="center">
          <div style={{width:4,height:20,borderRadius:2,background:"linear-gradient(180deg,#667eea,#764ba2)"}} />
          <Text variant="headingMd" as="h2">{t.insightTitle}</Text>
        </InlineStack>
        <div style={{padding:"2px 10px",borderRadius:"12px",background:"rgba(99,102,241,.08)",fontSize:12,color:"#6366f1",fontWeight:500}}>
          {isFree ? "Free" : currentPlan.startsWith("growth") ? "Growth" : "Business"}
        </div>
      </InlineStack>

      <InlineGrid columns={{ xs: 2, md: 4 }} gap="400">
        <MiniCard icon={ViewIcon} gradient="linear-gradient(135deg,#667eea,#764ba2)" label={t.statViews} value={statsData.views} delay={0} />
        <MiniCard icon={MobileIcon} gradient="linear-gradient(135deg,#f093fb,#f5576c)" label={t.statAR} value={statsData.arUses} delay={0.1} />
        <MiniCard icon={CartAbandonedIcon} gradient="linear-gradient(135deg,#4facfe,#00f2fe)" label={t.statAddCart} value={statsData.addCartCount || 0} delay={0.2} />
        <MiniCard icon={ClockIcon} gradient="linear-gradient(135deg,#43e97b,#38f9d7)" label={t.statTime} value={statsData.stayTime} delay={0.3} />
      </InlineGrid>

      <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
        <div className="card-hover" style={{...cardBase, animation: "fadeInUp .5s ease-out .4s both"}}>
          <InlineStack align="space-between" blockAlign="start">
            <BlockStack gap="050">
              <Text variant="bodyXs" tone="subdued">Conversion</Text>
              <Text variant="headingLg" fontWeight="bold">{statsData.conversion || "0%"}</Text>
            </BlockStack>
            <div style={iconBox("linear-gradient(135deg,#a18cd1,#fbc2eb)")}>
              <Icon source={TargetIcon} tone="base" />
            </div>
          </InlineStack>
          <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:"linear-gradient(135deg,#a18cd1,#fbc2eb)",borderRadius:"0 0 12px 12px",opacity:.6}} />
        </div>

        <div className="card-hover" style={{
          ...cardBase, animation: "fadeInUp .5s ease-out .5s both",
          background: isFree ? "linear-gradient(135deg,#fff5f5,#ffe3e3)" : "linear-gradient(135deg,#f0f9ff,#e0f2fe)",
          border: isFree ? "1px solid rgba(220,38,38,.15)" : "1px solid rgba(59,130,246,.15)",
        }}>
          <BlockStack gap="100">
            <InlineStack gap="050" blockAlign="center">
              <Box width="14px"><Icon source={AlertBubbleIcon} tone={isFree ? "critical" : "info"} /></Box>
              <Text variant="bodyXs" tone={isFree ? "critical" : "info"}>{t.statSub}</Text>
            </InlineStack>
            <Text variant="headingLg" fontWeight="bold">{getLimitDisplay()}</Text>
          </BlockStack>
        </div>
      </InlineGrid>
    </BlockStack>
  );
}
