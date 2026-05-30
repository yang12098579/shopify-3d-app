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
  // 🚨 修复 1：100% 还原官方的变量声明方式，完美避开 Vercel 的 TS 类型检查报错
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const shopParam = urlParams.get("shop");

    // 🚨 修复 2：只有在带有 shop 参数，且没有发起过错误请求 (actionData 为空) 时，才自动提交
    // 这样既能无感刷新，又能防止遇到错误时无限死循环
    if (shopParam && !actionData) {
      setIsAutoLoggingIn(true);

      // 用纯原生 DOM 强行创建表单并提交，彻底绕开 Remix 路由的 200 白屏陷阱
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

  // 拦截成功：显示极致极简的“正在续签”状态，瞬间跳回 3D 控制台
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

  // 兜底方案：老老实实显示官方的原生表单
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