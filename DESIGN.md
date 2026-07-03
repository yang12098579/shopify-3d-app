# Vision3D (Product-3D-Viewer) 全方位升级设计方案

> 版本：v2.0 | 日期：2026-07-03 | 基于当前 `main` 分支代码审计

---

## 一、总体目标

| 维度 | 当前状态 | v2.0 目标 |
|------|----------|-----------|
| 安全性 | 存在 3 个已知漏洞 | 零高危漏洞 |
| 可靠性 | 无测试，连接池裸奔 | 核心逻辑 80%+ 单测覆盖 |
| 用户体验 | 转码无反馈，无降级 | 全链路状态可见，低端设备有兜底 |
| 可维护性 | TypeScript `any` 泛滥 | 开启 strict 模式 |
| DevOps | 无 CI/CD | GitHub Actions 全自动 |

---

## 二、Phase 1：安全防线（3-5 天）

### 2.1 CloudConvert 回调签名验证

| 字段 | 内容 |
|------|------|
| **文件** | `app/routes/webhooks.jsx` |
| **当前风险** | 回调无身份校验，任何人 POST 即可写入任意 USDZ URL 到产品 metafield |
| **修复方案** | CloudConvert job 创建时传入 `signing_secret` 参数，回调时 HMAC-SHA256 校验 |
| **改动量** | ~15 行 |
| **依赖** | 无新依赖 |

```ts
// 回调验证伪代码
const signature = request.headers.get("cloudconvert-signature");
const expected = crypto.createHmac("sha256", CLOUDCONVERT_SIGNING_SECRET)
  .update(await request.clone().text()).digest("hex");
if (signature !== expected) return new Response("Unauthorized", { status: 401 });
```

### 2.2 Prisma Serverless 连接池

| 字段 | 内容 |
|------|------|
| **文件** | `prisma/schema.prisma`、环境变量 |
| **当前风险** | 每次冷启动建新直连，高并发打爆 Neon 连接上限（默认 20） |
| **修复方案** | 引入 `directUrl`（用于 migration）+ 主连接串走 pgbouncer，限制 `connection_limit=3` |
| **改动量** | 2 行 schema + 1 个环境变量 |
| **依赖** | Neon 开启 pgbouncer（已默认） |

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // pgbouncer 连接串
  directUrl = env("DIRECT_URL")        // 直连，仅 prisma migrate 用
}
```

### 2.3 速率限制持久化

| 字段 | 内容 |
|------|------|
| **文件** | `app/routes/api.track.jsx` |
| **当前风险** | `Map` 存内存，Serverless 冷启动后计数器归零，限流形同虚设 |
| **修复方案 A** | 改用 Prisma 表存储 `(shop, minute_window)` 计数器，每次 upsert+increment |
| **修复方案 B** | 接入 Upstash Redis（免费层 10K 请求/天），性能更优 |
| **推荐** | 方案 A（零成本，改动量 ~30 行） |
| **依赖** | 无新依赖 |

| 新增 Prisma Model | 字段 |
|------|------|
| `RateLimit` | `shop String`, `windowStart DateTime`, `count Int` |
| 联合唯一索引 | `(shop, windowStart)` |

---

## 三、Phase 2：体验重构（1-2 周）

### 3.1 CloudConvert 全链路状态追踪

| 字段 | 内容 |
|------|------|
| **文件** | `app/routes/app.additional.jsx`、`prisma/schema.prisma` |
| **当前痛点** | 用户绑定模型后完全不知道转码是否在进行、成功、失败 |
| **方案** | 新增 `ConversionJob` 表存 jobId + 状态，前端轮询展示进度条 |

| 新增 Prisma Model | 字段 |
|------|------|
| `ConversionJob` | `id String @id`, `productId String`, `shop String`, `status String (pending/processing/done/failed)`, `glbUrl String`, `usdzUrl String?`, `error String?`, `createdAt DateTime` |

| 前端改动 | 内容 |
|------|------|
| Toast 通知 | 绑定成功后显示 "3D 转码已提交" |
| 状态列 | 产品列表新增一列"AR 转码状态"，Badge 颜色对应状态 |
| 轮询机制 | 每 10 秒 `GET /api/conversion-status?productId=xxx`，最多轮询 2 分钟 |

### 3.2 浏览器 3D 兼容降级

| 字段 | 内容 |
|------|------|
| **文件** | `extensions/3d-viewer-block/blocks/product_3d_viewer.liquid` |
| **当前痛点** | 不支持 WebGL 的设备直接白屏 |
| **方案** | `<model-viewer>` 的 `poster` slot 放产品主图，WebGL 不可用时自动展示静态图 + "View in AR" 按钮 |

```html
<model-viewer poster="{{ product.featured_image | img_url: '800x' }}">
  <!-- 3D 内容正常放 -->
</model-viewer>
<!-- model-viewer 内置 WebGL 检测，不支持时自动显示 poster -->
```

### 3.3 仪表盘功能增强

| 新增功能 | 文件 | 说明 |
|------|------|------|
| **日期筛选** | `app/routes/app._index.jsx` | 统计面板支持"今日/本周/本月/自定义"时间范围 |
| **数据导出** | 同上 | "导出 CSV"按钮，一键下载统计报表 |
| **Top 产品排行** | 同上 | 按 3D 查看次数排行的产品 Top 10 |
| **转化漏斗** | 同上 | 查看 → AR 激活 → 加购 → 下单，漏斗图 |

### 3.4 3D 管理中心增强

| 新增功能 | 说明 |
|------|------|
| **拖拽排序** | 按绑定时间 / 查看次数 / AR 状态排序 |
| **批量 URL 导入** | CSV 粘贴多产品模型链接，批量绑定 |
| **一键同步** | 对比 Shopify 线上 metafield 与数据库，差异告警 |
| **模型预览放大** | 弹窗中 3D 预览支持全屏模式 |

---

## 四、Phase 3：架构升级（2-4 周）

### 4.1 数据库层重构

| 项目 | 文件 | 内容 |
|------|------|------|
| **新增表** | `prisma/schema.prisma` | `ConversionJob`、`RateLimit`、`OperationLog` |
| **Session 表优化** | 同上 | 为 `shop` 列加索引，加速查询 |
| **迁移脚本 API** | `app/routes/api.migration.jsx` | 加安全校验（仅管理员可执行） |

| 新增 Prisma Model | 字段 |
|------|------|
| OperationLog | `id Int @id @default(autoincrement())`, `shop String`, `action String (bind/unbind/ar_on/ar_off/bulk)`, `productId String?`, `detail String?`, `createdAt DateTime @default(now())` |

### 4.2 TypeScript 严格模式

| 文件 | 改动 |
|------|------|
| `tsconfig.json` | 开启 `"strict": true` |
| 所有 `.ts/.tsx` | 消除 `any` 类型，补全接口定义 |
| 新增 | `app/types.ts`（共享类型：`Product`, `Subscription`, `ConversionJob` 等） |

### 4.3 错误处理统一层

| 文件 | 内容 |
|------|------|
| `app/error-handler.server.ts`（新） | 统一的错误响应格式 `{ error: string, code: string, status: number }` |
| 所有 route | 替换散落的 `Response.json({ error: ... })` 为统一调用 |

### 4.4 测试体系

| 测试类型 | 工具 | 覆盖目标 |
|------|------|------|
| 单元测试 | Vitest | `cloudconvert.server.ts`、URL 验证、计费逻辑、速率限制 |
| 集成测试 | Vitest + Prisma mock | Webhook 处理、Session 管理、Analytics API |
| E2E 测试 | Playwright | 用户绑定模型 → 转码 → AR 预览完整流程 |

---

## 五、Phase 4：DevOps（持续）

### 5.1 GitHub Actions CI/CD

| Job | 触发条件 | 内容 |
|------|------|------|
| `lint` | PR / push main | ESLint + Prettier 检查 |
| `typecheck` | PR / push main | `tsc --noEmit` |
| `test` | PR / push main | Vitest 单测 + 集成测试 |
| `deploy` | merge main | 自动触发 Vercel deploy |

### 5.2 监控与告警

| 工具 | 用途 |
|------|------|
| Sentry（已有） | 扩展：加 Performance Monitoring，追踪慢请求 |
| Vercel Analytics | 页面性能、Web Vitals |
| Uptime Monitor | `vision3d-app.vercel.app` 5 分钟心跳检测 |

### 5.3 环境变量管理

| 变量 | 用途 | 状态 |
|------|------|------|
| `SHOPIFY_API_KEY` | OAuth 密钥 | ✅ 已有 |
| `SHOPIFY_API_SECRET` | OAuth 密钥 | ✅ 已有 |
| `SHOPIFY_APP_URL` | 应用域名 | ✅ 已有 |
| `DATABASE_URL` | pgBouncer 连接串 | 🔧 待改为 pgbouncer |
| `DIRECT_URL` | 直连数据库 | 🆕 新增 |
| `CLOUDCONVERT_API_KEY` | 转码 API | ✅ 已有 |
| `CLOUDCONVERT_SIGNING_SECRET` | 回调签名 | 🆕 新增 |
| `SENTRY_DSN` | 错误监控 | ✅ 已有 |

---

## 六、文件变更总览

| Phase | 新建文件 | 修改文件 |
|------|------|------|
| Phase 1 | — | `webhooks.jsx`、`schema.prisma`、环境变量 |
| Phase 2 | — | `app.additional.jsx`、`app._index.jsx`、`product_3d_viewer.liquid`、`schema.prisma` |
| Phase 3 | `app/types.ts`、`app/error-handler.server.ts`、测试文件 | `tsconfig.json`、所有 `.ts/.tsx`、`schema.prisma` |
| Phase 4 | `.github/workflows/*.yml` | — |

| 合计 | **新增 ~8 个文件** | **修改 ~15 个文件** |

---

## 七、时间线

| 阶段 | 预计耗时 | 优先级 |
|------|------|------|
| Phase 1：安全防线 | 3-5 天 | 🔴 最高 |
| Phase 2：体验重构 | 1-2 周 | 🟡 高 |
| Phase 3：架构升级 | 2-4 周 | 🟢 中 |
| Phase 4：DevOps | 持续 | 🟢 中 |

---

## 八、一句话总结

> **先修漏洞保安全 → 再补体验留用户 → 最后上工程化提效率。**  
> 四个阶段下来，这个插件从一个"能用的 MVP"蜕变为一个"可卖的 SaaS 产品"。
