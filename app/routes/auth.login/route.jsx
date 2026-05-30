import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState, useEffect } from "react";
// 🚨 修复 1：把官方的 Form 重新引进来，满足 Vercel 的语法检查
import { Form, useActionData, useLoaderData } from "react-router";
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
  // 🚨 修复 2：加上安全兜底 (|| {})，防止云端渲染时拿到空数据导致应用崩溃
  const loaderData = useLoaderData() || {};
  const actionData = useActionData() || {};
  const errors = actionData.errors || loaderData.errors || {};

  const [shop, setShop] = useState("");
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shopParam = urlParams.get("shop");

    // 只有在带了店铺参数，且没有报错的情况下，才触发无感自动登录
    if (shopParam && !errors.shop) {
      setIsAutoLoggingIn(true);

      // 用原生 DOM 强行跳脱框架，避免 200 白屏
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
  }, [errors.shop]); // 依赖项精确到具体错误，防止死循环

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

  // 兜底方案：如果 URL 里什么都没有，显示官方的登录表单
  return (
    <AppProvider embedded={false}>
      <s-page>
        {/* 🚨 修复 3：使用大写的 Form 配合 reloadDocument，既满足规范，又能硬刷新！ */}
        <Form method="post" reloadDocument>
          <s-section heading="Log in">
            <s-text-field
              name="shop"
              label="Shop domain"
              details="example.myshopify.com"
              value={shop}
              onChange={(e) => setShop(e.currentTarget.value)}
              autocomplete="on"
              error={errors.shop}
            ></s-text-field>
            <s-button type="submit">Log in</s-button>
          </s-section>
        </Form>
      </s-page>
    </AppProvider>
  );
}