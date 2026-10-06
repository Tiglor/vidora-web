# Video Platform Web

Vue 3 + Vite + Element Plus 的视频网站 Web 客户端，统一通过网关 `/api` 调用后端服务。

AI 协作规范全部在 [`.code/`](.code/README.md)：四份必读文档 + 按任务分类的手册，入口是 `.code/README.md`（本仓库不放根 `AGENTS.md`）。

## 开发

```powershell
npm ci
Copy-Item .env.example .env.development.local
npm run dev
```

默认开发地址为 `http://localhost:5173`，网关地址由 `VITE_GATEWAY` 配置。

## 功能范围

- 登录、注册和 JWT 会话
- 首页推荐、分类导航和搜索（顶栏含搜索联想词）
- 视频详情、HLS 播放、评论发布/刷新
- 视频上传与转码进度轮询、个人中心

## 构建

```powershell
npm run build
```

本端是纯 JavaScript，只有这一条机械门禁（另有 `npm run dev` / `npm run preview`），没有类型检查、没有 lint、没有测试。

接口契约的权威源在后端：`../vidora-cloud` 各服务的 Controller / DTO / VO 与 `SQL/vidora_cloud.sql` 的列注释，运行期体现在每个服务的 `/v3/api-docs` 上。本端 `src/api/*.js` 每个函数上方的注释是**手抄的副本**，后端改名或加减字段时这里不会报错、只会在运行时变成 `undefined`，所以改完必须去读后端并把注释与页面取值点逐个对齐。

播放器使用成熟的 [hls.js](https://github.com/video-dev/hls.js)，UI 使用 [Element Plus](https://github.com/element-plus/element-plus)，不重复实现基础组件。

