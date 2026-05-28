import { redirect } from "react-router";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  
  // 如果是 Shopify 带着店铺参数来敲门，立刻把它引路到 /app 仪表盘
  if (url.searchParams.get("shop")) {
    return redirect(`/app?${url.searchParams.toString()}`);
  }
  
  // 拒之门外
  return new Response("Not found", { status: 404 });
};

export default function Index() {
  return null;
}