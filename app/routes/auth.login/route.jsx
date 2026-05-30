import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState, useEffect } from "react";
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
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  
  // 安全地获取错误信息，防止 Vercel 编译报错
  const errors = (actionData && actionData.errors) ? actionData.errors : (loaderData && loaderData.errors ? loaderData.errors : {});

  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const shopParam = urlParams.get("shop");

    // 检测到店铺名且没有发起过错误请求，立刻执行无感拦截刷新
    if (shopParam && !actionData) {
      setIsAutoLoggingIn(true);

      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/auth/login";

      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "shop";
      input.value = shopParam;

      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
    }
  }, [actionData]);

  // 拦截成功：显示极简加载动画，避免 200 白屏
  if (isAutoLoggingIn) {
    return (
      <AppProvider embedded={false}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #f4f6f8', borderTop: '3px solid #202223', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontFamily: 'sans-serif', color: '#6d7175' }}>Authenticating securely...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </AppProvider>
    );
  }

  // 兜底方案：显示官方默认表单
  return (
    <AppProvider embedded={false}>
      <s-page>
        <Form method="post">
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
        </Form>
      </s-page>
    </AppProvider>
  );
}