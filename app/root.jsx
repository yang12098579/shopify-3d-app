import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from "react-router";
import { useEffect, useLayoutEffect, useState } from "react";

export default function App() {
  // Keep-alive: prevents Vercel serverless cold starts
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Ping every 60 seconds to keep server warm
    const keepAlive = setInterval(() => {
      fetch("/auth", { method: "HEAD" }).catch(() => {});
    }, 60_000);
    
    // Auto-retry failed navigations (handles first-click-after-idle failures)
    let retryCount = 0;
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      return originalFetch.apply(this, args).catch(err => {
        if (retryCount < 1 && (err.message?.includes("fetch") || err.message?.includes("network") || err.message?.includes("timeout"))) {
          retryCount++;
          return new Promise(resolve => setTimeout(resolve, 1000)).then(() => {
            return originalFetch.apply(this, args);
          });
        }
        throw err;
      });
    };

    return () => {
      clearInterval(keepAlive);
      window.fetch = originalFetch;
    };
  }, []);

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
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}.fade-up{animation:fadeUp .5s ease-out}.fade-in{animation:fadeIn .6s ease-out}.card-hover{transition:all .25s ease}.card-hover:hover{transform:translateY(-2px);box-shadow:0 4px 24px rgba(0,0,0,.06)}`}</style>
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

export function ErrorBoundary() {
  const error = useRouteError();
  const [shop, setShop] = useState("");
  const [retrying, setRetrying] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const currentShop = params.get("shop") || (window.shopify?.config?.shop) || "";
    setShop(currentShop);

    // For auth errors, redirect to login
    if ((error?.status === 401 || error?.status === 403) && currentShop) {
      try {
        window.top.location.href = "/auth/login?shop=" + currentShop;
      } catch(e) {
        window.location.href = "/auth/login?shop=" + currentShop;
      }
    }
  }, []);

  const handleRetry = () => {
    setRetrying(true);
    // Navigate to dashboard which will trigger re-auth if needed
    try {
      window.location.href = "/app" + (shop ? "?shop=" + shop : "");
    } catch(e) {
      window.location.reload();
    }
  };

  const isAuthError = error?.status === 401 || error?.status === 403;
  
  // Log for debugging
  if (typeof window !== "undefined") {
    console.error("[Vision3D ErrorBoundary]", { status: error?.status, message: error?.message, stack: error?.stack?.substring?.(0, 200) });
  }

  return (
    <html lang="en">
      <head><Meta /><Links /></head>
      <body>
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",fontFamily:"system-ui,sans-serif",flexDirection:"column",gap:20,padding:20,textAlign:"center"}}>
          {isAuthError ? (
            <>
              <div style={{width:32,height:32,border:"3px solid #e5e7eb",borderTop:"3px solid #111",borderRadius:"50%",animation:"spin .6s linear infinite"}} />
              <p style={{color:"#6b7280",fontSize:14,margin:0}}>Reconnecting to Shopify...</p>
            </>
          ) : (
            <>
              <div style={{fontSize:40}}>{"\u26a0\ufe0f"}</div>
              <h2 style={{fontSize:20,fontWeight:600,color:"#111",margin:0}}>Connection interrupted</h2>
              <p style={{color:"#6b7280",fontSize:14,margin:0,maxWidth:320}}>
                The server connection was lost. This usually happens when the app has been idle for a while. Click below to reconnect.
              </p>
              <button
                onClick={handleRetry}
                disabled={retrying}
                style={{
                  marginTop:8, padding:"10px 28px", background:"#111", color:"#fff",
                  border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer",
                  opacity: retrying ? 0.6 : 1,
                }}
              >
                {retrying ? "Reconnecting..." : "Reconnect"}
              </button>
            </>
          )}
          <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
        </div>
        <Scripts />
      </body>
    </html>
  );
}

