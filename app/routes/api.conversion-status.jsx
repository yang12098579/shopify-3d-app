import { authenticate } from "../shopify.server";
import { checkConversionStatus } from "../cloudconvert.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");
  if (!jobId) return Response.json({ error: "Missing jobId" }, { status: 400 });

  const status = await checkConversionStatus(jobId);
  return Response.json(status);
};
