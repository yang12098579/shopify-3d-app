import { logError } from "./error-logger.server";
import prisma from "./db.server";
import crypto from "crypto";

const CLOUDCONVERT_API_KEY = process.env.CLOUDCONVERT_API_KEY;
const CLOUDCONVERT_SIGNING_SECRET = process.env.CLOUDCONVERT_SIGNING_SECRET;
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
): Promise<{ success: boolean; error?: string; jobId?: string }> {
  if (!CLOUDCONVERT_API_KEY) {
    console.error("[CloudConvert] Missing CLOUDCONVERT_API_KEY");
    return { success: false, error: "Missing API key" };
  }
  if (!glbUrl) return { success: false, error: "No GLB URL provided" };

  const appBaseUrl = process.env.SHOPIFY_APP_URL;
  if (!appBaseUrl) {
    console.error("[CloudConvert] SHOPIFY_APP_URL not set — webhook callback disabled");
    return { success: false, error: "SHOPIFY_APP_URL not configured" };
  }

  // Create conversion job record in database
  const jobId = crypto.randomUUID();
  try {
    await prisma.conversionJob.create({
      data: { id: jobId, productId, shop: shopDomain, glbUrl, status: "pending" },
    });
  } catch (dbErr) {
    console.error("[CloudConvert] Failed to create DB record:", dbErr);
  }

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
              ...(CLOUDCONVERT_SIGNING_SECRET ? { signing_secret: CLOUDCONVERT_SIGNING_SECRET } : {}),
              webhook: `${appBaseUrl}/webhooks?productId=${encodeURIComponent(String(productId))}&shop=${encodeURIComponent(shopDomain)}`,
            },
          },
        }),
      });

      if (response.ok) {
        console.log(`[CloudConvert] Job dispatched for product ${productId} (attempt ${attempt})`);
        await prisma.conversionJob.update({
          where: { id: jobId },
          data: { status: "processing" },
        }).catch(() => {});
        return { success: true, jobId };
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
        await prisma.conversionJob.update({
          where: { id: jobId },
          data: { status: "failed", error: errorMsg },
        }).catch(() => {});
        return { success: false, error: errorMsg };
      }
    }
  }

  await prisma.conversionJob.update({
    where: { id: jobId },
    data: { status: "failed", error: "Max retries exceeded" },
  }).catch(() => {});
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