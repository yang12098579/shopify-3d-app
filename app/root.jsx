import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from "react-router";
// 🚨 修复关键：引入 useEffect
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

export function ErrorBoundary() {
  const error = useRouteError();

  // 🚨 修复关键：把“强制刷新”放进 useEffect 里。
  // 这样 React 就会先乖乖把画面画出来，然后再去执行刷新，绝不会再白屏崩溃了！
  useEffect(() => {
    if (error?.status === 200) {
      window.location.reload();
    }
  }, [error]);

  // 如果是 200 错误，安全地显示一个加载动画，等待 useEffect 触发刷新
  if (error?.status === 200) {
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

  // 其他真正的系统错误兜底界面
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
            Status: {error?.status || "Unknown Error"}
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