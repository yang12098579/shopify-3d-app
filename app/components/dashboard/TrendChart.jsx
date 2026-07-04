import { useEffect, useRef } from "react";
import { Box, Text, BlockStack } from "@shopify/polaris";

export default function TrendChart({ dailyData }) {
  var canvasRef = useRef(null);
  var chartRef = useRef(null);
  var data = dailyData || [];

  useEffect(function() {
    if (!canvasRef.current || data.length === 0) return;
    if (data.length < 2) return;

    function render() {
      if (chartRef.current) chartRef.current.destroy();
      var Chart = window.Chart;
      if (!Chart) return;
      var ctx = canvasRef.current.getContext("2d");
      chartRef.current = new Chart(ctx, {
        type: "line",
        data: {
          labels: data.map(function(d) { return d.date.substring(5); }),
          datasets: [{
            label: "3D Views", data: data.map(function(d) { return d.views; }),
            borderColor: "#5c6ac4", backgroundColor: "rgba(92,106,196,0.1)", tension: 0.3, fill: true,
          }, {
            label: "AR Clicks", data: data.map(function(d) { return d.arUses; }),
            borderColor: "#50b83c", backgroundColor: "rgba(80,184,60,0.1)", tension: 0.3, fill: true,
          }, {
            label: "Cart Adds", data: data.map(function(d) { return d.addCartCount; }),
            borderColor: "#f49342", backgroundColor: "rgba(244,147,66,0.1)", tension: 0.3, fill: true,
          }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
      });
    }

    if (window.Chart) { render(); } else {
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";
      s.onload = render;
      document.head.appendChild(s);
    }
    return function() { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  if (data.length < 2) return null;

  return (
    <Box padding="400" background="bg-surface-secondary" borderRadius="300">
      <BlockStack gap="300">
        <Text variant="headingSm">30-Day Trend</Text>
        <div style={{ height: "240px" }}>
          <canvas ref={canvasRef} />
        </div>
      </BlockStack>
    </Box>
  );
}
