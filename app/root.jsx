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





// 🚨 终极防弹�?ErrorBoundary：打�?iframe 结界


export function ErrorBoundary() {
  const error = useRouteError();
  const [shop, setShop] = useState("");

  // Get shop from URL synchronously (before any useEffect or render delay)
  const getShopSync = () => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("shop") || (window.shopify?.config?.shop) || "";
  };

  const isSessionExpired = 
    error?.status === 401 || 
    error?.status === 403 || 
    (error?.status === 401 && error?.message && error.message.includes("Unexpected token")) ||
    (error?.status === 401 && error?.message && error.message.includes("JSON"));

  // Immediate redirect without waiting for render/useEffect
  if (typeof window !== "undefined" && isSessionExpired) {
    const currentShop = getShopSync();
    if (currentShop) {
      window.location.replace("/auth/login?shop=" + currentShop);
      return null;
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentShop = getShopSync();
    setShop(currentShop || "");
    if (isSessionExpired && currentShop) {
      window.location.replace("/auth/login?shop=" + currentShop);
    }
  }, [isSessionExpired]);

  // Only show this if we truly can't recover
  if (isSessionExpired) {
    return (
      <html lang="en">
        <head><Meta /><Links /></head>
        <body>
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",fontFamily:"sans-serif",color:"#6d7175",flexDirection:"column",gap:"16px"}}>
            <div style={{width:32,height:32,border:"3px solid #f4f6f8",borderTop:"3px solid #202223",borderRadius:"50%",animation:"spin 0.8s linear infinite"}} />
            <p>Reconnecting to Shopify...</p>
            <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
            <a href={"/auth/login?shop=" + (shop || "")} target="_top" style={{marginTop:20,padding:"10px 20px",background:"#000",color:"#fff",borderRadius:"6px",textDecoration:"none",fontWeight:"bold"}}>Click to Reconnect</a>
          </div>
          <Scripts />
        </body>
      </html>
    );
  }

  // Real code errors
  console.error("Route error:", error?.status, error?.message);
  return (
    <html lang="en">
      <head><title>Error</title><Meta /><Links /></head>
      <body>
        <div style={{padding:40,fontFamily:"sans-serif",textAlign:"center",color:"#202223"}}>
          <h2>Oops! Something went wrong.</h2>
          <p style={{color:"#6d7175",marginTop:10}}>If the problem persists, please contact support.</p>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
