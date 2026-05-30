import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState, useEffect } from "react";
import { Form, useActionData, useLoaderData, useSubmit } from "react-router"; // 🚨 新增了 useSubmit
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
  const { errors } = actionData || loaderData;
  
  // 🚨 召唤表单自动提交器
  const submit = useSubmit();
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);

  // 🚨 核心拦截逻辑：智能检测 URL 中是否自带店铺参数并无感刷新
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shopParam = urlParams.get("shop");

    // 如果 URL 里偷偷带了 shop 参数，并且当前没有登录报错，我们就截胡！
    if (shopParam && !errors?.shop) {
      setIsAutoLoggingIn(true);
      setShop(shopParam);

      // 在后台悄悄组装一个表单数据，并全自动“点击”提交
      const formData = new FormData();
      formData.append("shop", shopParam);
      submit(formData, { method: "post" });
    }
  }, [submit, errors]);

  // 🚨 拦截成功：直接隐藏丑陋的表单，显示一个极致极简的“正在续签”加载状态
  if (isAutoLoggingIn) {
    return (
      <AppProvider embedded={false}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px', fontFamily: 'sans-serif', color: '#6d7175' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #f4f6f8', borderTop: '3px solid #202223', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: '14px', fontWeight: '500' }}>Authenticating...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </AppProvider>
    );
  }

  // 兜底方案：如果真的是全新设备第一次安装插件，URL 里什么都没有，再老老实实显示表单
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
              error={errors.shop}
            ></s-text-field>
            <s-button type="submit">Log in</s-button>
          </s-section>
        </Form>
      </s-page>
    </AppProvider>
  );
}