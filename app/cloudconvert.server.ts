import { logError } from "./error-logger.server";

const CLOUDCONVERT_API_KEY = process.env.CLOUDCONVERT_API_KEY;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert GLB to USDZ with automatic retry on failure.
 */
export async function triggerCloudConvert(
  productId: string,
  glbUrl: string,
  shopDomain: string
): Promise<{ success: boolean; error?: string }> {
  if (!CLOUDCONVERT_API_KEY) {
    console.error("[CloudConvert] Missing CLOUDCONVERT_API_KEY");
    return { success: false, error: "Missing API key" };
  }
  if (!glbUrl) return { success: false, error: "No GLB URL provided" };

  const appBaseUrl = process.env.SHOPIFY_APP_URL || `https://${shopDomain}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch("https://api.cloudconvert.com/v2/jobs", {
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

      if (response.ok) {
        console.log(`[CloudConvert] Job dispatched for product ${productId} (attempt ${attempt})`);
        return { success: true };
      }

      const errorBody = await response.text();
      console.error(`[CloudConvert] HTTP ${response.status} on attempt ${attempt}: ${errorBody}`);

      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * attempt);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[CloudConvert] Network error on attempt ${attempt}: ${errorMsg}`);

      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * attempt);
      } else {
        await logError(err instanceof Error ? err : new Error(errorMsg), {
          route: `/api/cloudconvert/${productId}`,
          shop: shopDomain,
        }).catch(() => {});
        return { success: false, error: errorMsg };
      }
    }
  }

  return { success: false, error: "Max retries exceeded" };
}
/**
 * Check CloudConvert job status.
 */
export async function checkConversionStatus(jobId: string): Promise<{
  status: string;
  progress: number;
  usdzUrl?: string;
}> {
  if (!CLOUDCONVERT_API_KEY) return { status: "error", progress: 0 };

  try {
    const res = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${CLOUDCONVERT_API_KEY}` },
    });
    const data = await res.json();
    const jobData = data.data;
    const task = jobData?.tasks?.find((t: any) => t.operation === "convert");
    const exportTask = jobData?.tasks?.find((t: any) => t.operation === "export/url");

    return {
      status: jobData?.status || "unknown",
      progress: task?.percent ?? 0,
      usdzUrl: exportTask?.result?.files?.[0]?.url,
    };
  } catch {
    return { status: "error", progress: 0 };
  }
}