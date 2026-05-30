import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from "react-router";

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

// 🚨 终极防线：部署在项目最高层的拦截器
export function ErrorBoundary() {
  const error = useRouteError();

  // 1. 核心拦截逻辑：只要状态码是 200，立刻强制刷新页面
  if (typeof window !== "undefined" && error?.status === 200) {
    window.location.reload();
    return (
      <html lang="en">
        <head>
          <Meta />
          <Links />
        </head>
        <body>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif", color: "#6d7175", flexDirection: "column", gap: "16px" }}>
             <div style={{ width: '32px', height: '32px', border: '3px solid #f4f6f8', borderTop: '3px solid #202223', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
             <p>Reconnecting securely...</p>
             <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
          <Scripts />
        </body>
      </html>
    );
  }

  // 2. 如果遇到真正的系统错误（比如 404, 500），提供一个相对美观的兜底界面，代替那个瞎眼的巨大数字
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
          <p style={{ color: "#6d7175" }}>
            {error?.data || error?.message || "Please refresh the page or try again later."}
          </p>
          <button 
            onClick={() => window.location.reload()} 
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