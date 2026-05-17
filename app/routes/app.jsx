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

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}