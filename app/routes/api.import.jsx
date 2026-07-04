import { authenticate } from "../shopify.server";
import { triggerCloudConvert } from "../cloudconvert.server";

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const csvText = formData.get("csv");

  if (!csvText || typeof csvText !== "string") {
    return Response.json({ success: false, error: "No CSV data provided" });
  }

  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    return Response.json({ success: false, error: "CSV must have header + at least 1 row" });
  }

  const header = lines[0].toLowerCase().split(",").map(h => h.trim());
  const handleIdx = header.indexOf("handle");
  const urlIdx = header.indexOf("glb_url");

  if (handleIdx === -1 || urlIdx === -1) {
    return Response.json({ success: false, error: "CSV must have 'handle' and 'glb_url' columns" });
  }

  const results = [];
  let successCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    const handle = cols[handleIdx];
    const glbUrl = cols[urlIdx];

    if (!handle || !glbUrl) continue;

    try {
      const prodRes = await admin.graphql(
        `#graphql
        query getProductByHandle($handle: String!) {
          productByHandle(handle: $handle) { id }
        }`,
        { variables: { handle } }
      );
      const prodJson = await prodRes.json();
      const productId = prodJson.data?.productByHandle?.id;

      if (!productId) {
        results.push({ handle, status: "not found" });
        continue;
      }

      await admin.graphql(
        `#graphql
        mutation setModelMetafield($input: MetafieldsSetInput!) {
          metafieldsSet(metafields: [$input]) { userErrors { field message } }
        }`,
        {
          variables: {
            input: {
              ownerId: productId,
              namespace: "custom",
              key: "product_3d_model",
              type: "single_line_text_field",
              value: glbUrl,
            },
          },
        }
      );

      await triggerCloudConvert(productId, glbUrl, session.shop).catch(() => {});

      results.push({ handle, status: "success" });
      successCount++;
    } catch (err) {
      results.push({ handle, status: "error" });
    }
  }

  return Response.json({ success: true, total: results.length, successCount, results });
};
