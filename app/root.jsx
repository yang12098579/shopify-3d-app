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
        <script type="module" src="https://unpkg.com/@google/model-viewer@4.0.0/dist/model-viewer.min.js"></script>
        <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}@keyframes pulse-glow{0%,100%{box-shadow:0 0 8px rgba(0,122,255,.2)}50%{box-shadow:0 0 24px rgba(0,122,255,.4)}}@keyframes gradient-spin{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes scaleIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}.animate-float{animation:float 3s ease-in-out infinite}.animate-shimmer{background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);background-size:200% 100%;animation:shimmer 2s infinite}.animate-pulse-glow{animation:pulse-glow 2s ease-in-out infinite}.animate-gradient{background-size:200% 200%;animation:gradient-spin 6s ease infinite}.animate-fade-in{animation:fadeInUp .5s ease-out}.animate-scale-in{animation:scaleIn .4s ease-out}.card-hover{transition:all .3s cubic-bezier(.4,0,.2,1)}.card-hover:hover{transform:translateY(-4px);box-shadow:0 12px 40px rgba(0,0,0,.12)}.stat-value{background:linear-gradient(135deg,#1a1a2e,#16213e);-webkit-background-clip:text;-webkit-text-fill-color:transparent}`}</style>
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