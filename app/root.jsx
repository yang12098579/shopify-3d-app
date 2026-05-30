import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from "react-router";
import { useEffect } from "react";

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
      </body>
    </html>
  );
}

// 🚨 终极防弹版 ErrorBoundary
export function ErrorBoundary() {
  const error = useRouteError();

  const isSessionExpired = 
    error?.status === 200 || 
    error?.status === 401 || 
    error?.status === 403 || 
    (error?.message && error.message.includes("Unexpected token")) ||
    (error?.message && error.message.includes("JSON"));

  // 🚨 核心修复：带护盾的安全跳转
  useEffect(() => {
    if (isSessionExpired) {
      // 放弃强攻 window.top，改用 try-catch 保护的合法重载。
      // 这样能 100% 保证 React 不会因为跨域报错而白屏崩溃！
      try {
        window.location.href = window.location.pathname + window.location.search;
      } catch (e) {
        console.error("Secure reconnect failed:", e);
      }
    }
  }, [isSessionExpired]);

  // 显示加载动画，此时 React 绝对安全，不会再闪退白屏
  if (isSessionExpired) {
    return (
      <html lang="en">
        <head>
          <Meta />
          <Links />
        </head>
        <body>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif", color: "#6d7175", flexDirection: "column", gap: "16px" }}>
             <div style={{ width: '32px', height: '32px', border: '3px solid #f4f6f8', borderTop: '3px solid #202223', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
             <p>Session expired. Reconnecting securely...</p>
             <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
          <Scripts />
        </body>
      </html>
    );
  }

  // 安全提取报错信息
  let safeErrorMessage = "Please refresh the page or try again later.";
  if (error?.message) {
    safeErrorMessage = error.message;
  } else if (error?.data) {
    safeErrorMessage = typeof error.data === "string" ? error.data : JSON.stringify(error.data);
  }

  // 兜底错误页
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
          <p style={{ color: "#6d7175", marginTop: "10px" }}>
            Status: {error?.status || "Unknown"}
          </p>
          <p style={{ color: "#6d7175", maxWidth: "600px", margin: "10px auto", wordWrap: "break-word" }}>
            {safeErrorMessage}
          </p>
          <button 
            onClick={() => window.location.href = window.location.pathname + window.location.search} 
            style={{ marginTop: '20px', padding: '8px 16px', background: '#000', color: '#fff', borderRadius: '6px', cursor: 'pointer', border: 'none' }}
          >
            Refresh Page
          </button>
        </div>
        <Scripts />
      </body>
    </html>
  );
}