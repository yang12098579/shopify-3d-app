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
    const isRemix200 = isRouteErrorResponse(error) && error.status === 200;
    const isRaw200 = error?.status === 200;
    const isJsonCrash = error instanceof Error && error.message.includes("Unexpected token");

    if (isRemix200 || isRaw200 || isJsonCrash) {
      const retryUrl = window.location.href;
      return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", color: "#6d7175", fontFamily: "sans-serif", flexDirection: "column", gap: "16px" }}>
          <p>Session expired. Please reconnect to continue.</p>
          <a href={retryUrl} style={{ padding: "10px 20px", background: "#000", color: "#fff", borderRadius: "6px", textDecoration: "none", fontWeight: "bold" }}>
            Retry
          </a>
        </div>
      );
    }
  }

  return boundary.error(error);
}