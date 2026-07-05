import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from "react-router";
import { useEffect, useState } from "react";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <footer style={{ textAlign: "center", padding: "16px", fontSize: "12px", color: "#6d7175", fontFamily: "sans-serif" }}>
          <a href="/privacy" target="_blank" style={{ color: "#6d7175" }}>Privacy Policy</a>
        </footer>
      </body>
    </html>
  );
}

// 🚨 终极防弹�?ErrorBoundary：打�?iframe 结界
export function ErrorBoundary() {
  const error = useRouteError();
  const [shop, setShop] = useState("");

  // 1. 判断是否掉线
  const isSessionExpired = 
    error?.status === 200 || 
    error?.status === 401 || 
    error?.status === 403 || 
    (error?.message && error.message.includes("Unexpected token")) ||
    (error?.message && error.message.includes("JSON"));

  // 2. 🚨 核心修复：获取店铺信息，并执�?"_top" 顶级逃逸！
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 尝试�?URL 或�?Shopify 全局对象获取 shop 域名
    const urlParams = new URLSearchParams(window.location.search);
    let currentShop = urlParams.get("shop");
    if (!currentShop && window.shopify?.config?.shop) {
      currentShop = window.shopify.config.shop;
    }
    
    setShop(currentShop || "");

    if (isSessionExpired && currentShop) {
      const authUrl = `/auth/login?shop=${currentShop}`;
      try {
        // 绝杀招：绕开所有安全限制，强制顶层浏览器窗口跳转到登录页！
        window.open(authUrl, "_top");
      } catch (e) {
        console.error("Top navigation failed:", e);
      }
    }
  }, [isSessionExpired]);

  // 如果判断为掉线，提供�?loading 的界面，并加上终极手动的 "_top" 逃逸按�?
  if (isSessionExpired) {
    const fallbackUrl = shop ? `/auth/login?shop=${shop}` : `/auth/login`;
    return (
      <html lang="en">
        <head>
          <Meta />
          <Links />
        </head>
        <body>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif", color: "#6d7175", flexDirection: "column", gap: "16px" }}>
             <div style={{ width: '32px', height: '32px', border: '3px solid #f4f6f8', borderTop: '3px solid #202223', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
             <p>Session expired. Securing connection...</p>
             <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
             
             {/* 终极兜底：如果代码逃逸被浏览器插件拦截，用户只需点这个按钮，target="_top" 绝对生效�?*/}
             <a 
               href={fallbackUrl} 
               target="_top" 
               style={{ marginTop: '20px', padding: '10px 20px', background: '#000', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold' }}
             >
               Click here to Reconnect
             </a>
          </div>
          <Scripts />
        </body>
      </html>
    );
  }

  // 其他真正的代码报错兜�?
  let safeErrorMessage = "Something went wrong. Please try again later.";
  // Internal error details are logged server-side, never shown to users
  console.error("Route error:", error?.status, error?.message);

  return (
    <html lang="en">
      <head>
        <title>Application Error</title>
        <Meta />
        <Links />
      </head>
      <body>
        <div style={{ padding: "40px", fontFamily: "sans-serif", textAlign: "center", color: "#202223" }}>
          <h2>Oops! Something went wrong.</h2>
          <p style={{ color: "#6d7175", marginTop: "10px" }}>If the problem persists, please contact support.</p>
          <p style={{ color: "#6d7175", maxWidth: "600px", margin: "10px auto", wordWrap: "break-word" }}>{safeErrorMessage}</p>
        </div>
        <Scripts />
      </body>
    </html>
  );
}