/**
 * CloudConvert server-side integration.
 * API key is stored in environment variables ONLY — never bundled to the client.
 */
const CLOUDCONVERT_API_KEY = process.env.CLOUDCONVERT_API_KEY;

/**
 * Fire-and-forget async conversion: GLB → USDZ for Apple AR.
 */
export async function triggerCloudConvert(
  productId: string,
  glbUrl: string,
  shopDomain: string
): Promise<void> {
  if (!CLOUDCONVERT_API_KEY) {
    console.error("[CloudConvert] Missing CLOUDCONVERT_API_KEY env var");
    return;
  }
  if (!glbUrl) return;

  try {
    const appBaseUrl = process.env.SHOPIFY_APP_URL || `https://${shopDomain}`;

    await fetch("https://api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDCONVERT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: {
          "import-1": { operation: "import/url", url: glbUrl },
          "convert-1": {
            operation: "convert",
            input: "import-1",
            output_format: "usdz",
          },
          "export-1": {
            operation: "export/url",
            input: "convert-1",
            webhook: `${appBaseUrl}/webhooks?productId=${encodeURIComponent(String(productId))}&shop=${encodeURIComponent(shopDomain)}`,
          },
        },
      }),
    });
    console.log(`[CloudConvert] Async conversion dispatched for product: ${productId}`);
  } catch (err) {
    console.error("[CloudConvert] Dispatch error:", err);
  }
}
