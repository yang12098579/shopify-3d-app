import { Outlet, useLoaderData, useRouteError, isRouteErrorResponse } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as AppBridgeProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url"; 
import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();
  return (
    <PolarisProvider i18n={enTranslations}>
      <AppBridgeProvider apiKey={apiKey}>
        <Outlet />
      </AppBridgeProvider>
    </PolarisProvider>
  );
}

// 🚨 终极暴力防线：天罗地网拦截 200
export function ErrorBoundary() {
  const error = useRouteError();

  if (typeof window !== "undefined") {
    // 检查 1：Remix 官方结构验证 200
    const isRemix200 = isRouteErrorResponse(error) && error.status === 200;
    // 检查 2：原生对象拦截 200
    const isRaw200 = error?.status === 200;
    // 检查 3：拦截 AJAX 拿到 HTML 导致的 JSON 解析崩溃
    const isJsonCrash = error instanceof Error && error.message.includes("Unexpected token");

    // 只要满足任意一个条件，直接暴力切断并强制刷新！
    if (isRemix200 || isRaw200 || isJsonCrash) {
      window.location.reload();
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#6d7175', fontFamily: 'sans-serif' }}>
          <p>Reconnecting securely...</p>
        </div>
      );
    }
  }

  // 其他正常报错兜底
  return boundary.error(error);
}