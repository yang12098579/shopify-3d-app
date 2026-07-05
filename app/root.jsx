import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from "react-router";
import { useEffect, useLayoutEffect, useState } from "react";

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

  const isSessionExpired = 
    error?.status === 401 || 
    error?.status === 403 || 
    (error?.status === 401 && error?.message && (error.message.includes("Unexpected token") || error.message.includes("JSON")));

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const currentShop = params.get("shop") || (window.shopify?.config?.shop) || "";
    setShop(currentShop);
    if (isSessionExpired && currentShop) {
      try {
        window.top.location.href = "/auth/login?shop=" + currentShop;
      } catch(e) {
        window.location.href = "/auth/login?shop=" + currentShop;
      }
    }
  }, []);

  if (isSessionExpired) {
    return (
      <html lang="en">
        <head><Meta /><Links /></head>
        <body>
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",fontFamily:"system-ui,sans-serif",flexDirection:"column",gap:16}}>
            <div style={{width:32,height:32,border:"3px solid #e5e7eb",borderTop:"3px solid #111",borderRadius:"50%",animation:"spin .6s linear infinite"}} />
            <p style={{color:"#6b7280",fontSize:14}}>Reconnecting...</p>
            <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
          </div>
          <Scripts />
        </body>
      </html>
    );
  }

  console.error("Route error:", error?.status, error?.message);
  return (
    <html lang="en">
      <head><title>Error</title><Meta /><Links /></head>
      <body>
        <div style={{padding:40,fontFamily:"system-ui,sans-serif",textAlign:"center",color:"#111"}}>
          <h2 style={{fontSize:20,fontWeight:600}}>Oops! Something went wrong.</h2>
          <p style={{color:"#6b7280",marginTop:8,fontSize:14}}>If the problem persists, please contact support.</p>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
