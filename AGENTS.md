# AGENTS.md

开始任何开发工作之前，必须先完整阅读 `.code/` 下的四份规范文档，再按任务类型翻 `.code/skills/` 里对应的手册。这份要求适用于所有 AI 工具（Qoder / Codex / Cursor / Claude Code 等），不因工具而异。

## 项目一句话

vidora 视频平台的 **Web 端**（Vue 3 + Vite + Element Plus，纯 JavaScript，无 TypeScript），只服务普通观众；经网关 `/api` 调用 vidora-cloud 后端，与 vidora-mobile、vidora-admin 共用同一套后端契约。

## 构建与验证命令

从 `package.json` 的 scripts 抄录，本项目**只有这三条**：

```powershell
npm run dev      # vite，本地 5173，/api 代理到 VITE_GATEWAY（默认 http://localhost:8080）
npm run build    # vite build，产物在 dist/ —— 这是本仓库唯一的机械门禁
npm run preview  # vite preview --host
```

没有 typecheck、没有 lint、没有 test 脚本，也没有测试框架。**不要声称跑过不存在的检查**。改完代码至少跑一次 `npm run build`，浏览器行为按下述清单人工确认。

## 目录速览

| 路径 | 职责 |
| --- | --- |
| `src/api/*.js` | 一个后端服务一个文件，每个函数上方注释真实路径与返回形状 |
| `src/utils/request.js` | axios 实例：注入 JWT、拆 `ApiResult`、401/403 处理、toast 去重 |
| `src/store/*.js` | Pinia options 式 store：`user` / `theme` / `dict` |
| `src/views/*.vue` | 路由页面，`<script setup>` |
| `src/components/*.vue` | 纯展示组件，props 进 emit 出，不发请求 |
| `src/layouts/DefaultLayout.vue` | 顶栏 + 搜索框 + 内容区容器 + 字典预热 |
| `src/router/index.js` | 路由表与登录守卫 |
| `src/styles/main.css`, `src/styles/themes.css`, `src/config/themes.js` | CSS 变量主题引擎（三处需同步） |

## .code 导览

| 文件 | 讲什么 | 什么时候翻 |
| --- | --- | --- |
| `.code/README.md` | 索引与阅读顺序 | 第一次接触本仓库 |
| `.code/agent-rules.md` | AI 行为规范：必读清单、验证命令、禁止动作、交付口径 | 每次动手前 |
| `.code/coding-standards.md` | 编码规范：目录职责、命名、组件写法、状态与 API、注释、样式 | 写代码时 |
| `.code/requirements.md` | 需求规范：本端职责边界、四段式需求模板、契约以何为准、完成定义 | 接到需求或觉得「这该前端做吗」有疑问时 |
| `.code/skills/add-a-page.md` | 新增页面/视图 | 要加路由级页面时 |
| `.code/skills/add-or-adjust-api-call.md` | 新增或调整一个 API 调用 | 要接新接口或改现有接口参数时 |
| `.code/skills/consume-new-backend-field.md` | 接入后端返回的新字段 | 后端加了字段、要修契约漂移时 |
| `.code/skills/verify-in-browser.md` | 在浏览器里验证一次改动 | 交付前，无论改动大小 |
