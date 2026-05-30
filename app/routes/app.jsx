import { Outlet, useLoaderData, useRouteError } from "react-router";
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
        {/* 移除导致死循环和样式错乱的 ui-nav-menu */}
        <Outlet />
      </AppBridgeProvider>
    </PolarisProvider>
  );
}

// 🚨 终极防线：智能拦截 200 幽灵白屏
export function ErrorBoundary() {
  const error = useRouteError();

  // 1. 如果遇到 AJAX 拿错 HTML 导致的 200 崩溃，强制浏览器真实刷新
  if (error?.status === 200) {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
    return null;
  }

  // 2. 如果是其他正常的代码报错，依然使用 Shopify 官方美观的报错 UI
  return boundary.error(error);
}