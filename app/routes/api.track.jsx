// 🚨 删除了所有 json 的 import！直接使用原生的 Response.json()，彻底避开包依赖冲突

// 🌐 配置强力跨域头 (CORS)，确保独立站前台发起 fetch 时不会被浏览器安全拦截
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// 🛡️ 处理浏览器发出的 OPTIONS 预检请求 (Preflight)
export async function loader({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  // ✅ 使用原生 Response.json()
  return Response.json({ message: "Vision3D Tracking API is active and ready." }, { headers: corsHeaders });
}

// 🎯 核心追踪拦截器：接收前台 Liquid 传来的 3d_view_load 和 3d_view_cart_add 事件
export async function action({ request }) {
  // 拦截 OPTIONS 请求
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 解析前台发来的埋点数据包
    const body = await request.json();
    const { event, productId, shop, timestamp } = body;

    // --- 可以在此处对接 Prisma 写入数据库统计报表 ---
    console.log(`📊 [埋点追踪成功] 店铺: ${shop} | 事件: ${event} | 商品ID: ${productId} | 时间戳: ${timestamp}`);

    // ✅ 使用原生 Response.json()
    return Response.json({ 
      success: true, 
      received: { event, productId }
    }, { 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error("❌ [埋点 API 异常]:", error);
    // ✅ 使用原生 Response.json()
    return Response.json({ 
      success: false, 
      error: "Invalid payload or tracking failure" 
    }, { 
      status: 400, 
      headers: corsHeaders 
    });
  }
}