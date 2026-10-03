# Video Platform Web

Vue 3 + Vite + Element Plus 的视频网站 Web 客户端，统一通过网关 `/api` 调用后端服务。

## 开发

```powershell
npm ci
Copy-Item .env.example .env.development.local
npm run dev
```

默认开发地址为 `http://localhost:5173`，网关地址由 `VITE_GATEWAY` 配置。

## 功能范围

- 登录、注册和 JWT 会话
- 首页推荐、分类导航和搜索
- 视频详情、HLS 播放、评论发布/刷新
- 视频上传和个人中心

## 构建

```powershell
npm run build
```

播放器使用成熟的 [hls.js](https://github.com/video-dev/hls.js)，UI 使用 [Element Plus](https://github.com/element-plus/element-plus)，不重复实现基础组件。

