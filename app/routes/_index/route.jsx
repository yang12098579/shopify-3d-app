import { redirect } from "@remix-run/node";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  
  // 如果是 Shopify 带着店铺参数来敲门，立刻把它引路到 /app 仪表盘
  if (url.searchParams.get("shop")) {
    return redirect(`/app?${url.searchParams.toString()}`);
  }
  
  // 如果是有人在浏览器里瞎输入网址，直接拒之门外
  return new Response("Not found", { status: 404 });
};

// 补充一个空的默认组件，防止 Remix 编译时因为找不到 UI 而报错
export default function Index() {
  return null;
}