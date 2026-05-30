import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState, useEffect } from "react";
import { useActionData, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return { errors };
};

export const action = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return { errors };
};

export default function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const { errors } = actionData || loaderData;
  
  const [shop, setShop] = useState("");
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shopParam = urlParams.get("shop");

    if (shopParam && !errors?.shop) {
      setIsAutoLoggingIn(true);
      
      // 🚨 终极修复：放弃 Remix 的 AJAX，使用原生 JavaScript 动态创建并提交表单！
      // 这能强制浏览器进行硬跳转，完美触发 Shopify 的 iframe 逃脱机制，彻底消灭 200 白屏。
      const form = document.createElement("form");
      form.method = "POST";
      form.action = window.location.pathname + window.location.search;
      
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "shop";
      input.value = shopParam;
      
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
    }
  }, [errors]);

  // 拦截成功：显示极致极简的“正在续签”加载状态
  if (isAutoLoggingIn) {
    return (
      <AppProvider embedded={false}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px', fontFamily: 'sans-serif', color: '#6d7175' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #f4f6f8', borderTop: '3px solid #202223', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: '14px', fontWeight: '500' }}>Authenticating securely...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </AppProvider>
    );
  }

  // 兜底方案：如果 URL 里什么都没有，老老实实显示原生表单
  return (
    <AppProvider embedded={false}>
      <s-page>
        {/* 注意：为了绝对安全，这里将原来的 <Form> 也改为了小写的原生 <form> */}
        <form method="POST" action="">
          <s-section heading="Log in">
            <s-text-field
              name="shop"
              label="Shop domain"
              details="example.myshopify.com"
              value={shop}
              onChange={(e) => setShop(e.currentTarget.value)}
              autocomplete="on"
              error={errors?.shop}
            ></s-text-field>
            <s-button type="submit">Log in</s-button>
          </s-section>
        </form>
      </s-page>
    </AppProvider>
  );
}