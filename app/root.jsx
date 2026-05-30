// 🚨 破壁防弹版 ErrorBoundary
export function ErrorBoundary() {
  const error = useRouteError();

  // 1. 扩大捕获网：只要是 200、401、403 或者 JSON 解析报错，统统视为“通行证过期掉线”
  const isSessionExpired = 
    error?.status === 200 || 
    error?.status === 401 || 
    error?.status === 403 || 
    (error?.message && error.message.includes("Unexpected token")) ||
    (error?.message && error.message.includes("JSON"));

  // 2. 🚨 核心修复：打破 iframe 结界！
  useEffect(() => {
    if (isSessionExpired) {
      // 以前是 window.location.reload()，只刷新了画中画，导致被 Shopify 拦截白屏。
      // 现在加上 .top，强制刷新最顶层的浏览器父窗口！瞬间满血复活！
      if (window.top) {
        window.top.location.reload();
      } else {
        window.location.reload();
      }
    }
  }, [isSessionExpired]);

  // 如果判定为掉线，显示安全的加载动画，等待顶级窗口刷新
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

  // 3. 安全提取未知错误信息，防止 React 渲染对象崩溃
  let safeErrorMessage = "Please refresh the page or try again later.";
  if (error?.message) {
    safeErrorMessage = error.message;
  } else if (error?.data) {
    safeErrorMessage = typeof error.data === "string" ? error.data : JSON.stringify(error.data);
  }

  // 其他真正的系统级错误兜底界面
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
            onClick={() => {
              if(window.top) window.top.location.reload();
              else window.location.reload();
            }} 
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