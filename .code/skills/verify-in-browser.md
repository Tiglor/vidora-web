# Skill：在浏览器里验证一次改动

适用：任何准备对用户说「做完了」的时刻。本项目没有测试框架、没有 lint、没有 typecheck，`npm run build` 只能证明代码能被 Vite 编译，**剩下的正确性只有人工走查能证明**。

---

## 第 0 步：机械门禁

```powershell
cd E:\Project\vidora\vidora-web
npm run build
```

判定标准：**不能有 error**。下面这类告警是既有状态，不算失败，也不要在交付里把它写成问题或假装没看见：

- `Some chunks are larger than 500 kB after minification`（index chunk 约 1.27 MB，含 Element Plus + hls.js；`VideoDetailView` 601 kB）。这是已知体积状况，未经用户同意不要动 `vite.config.js` 的 manualChunks。

构建通过不代表功能对：模板里的运行时错误、字段名拼错、异步时序问题都不会被拦住。所以必须继续往下走。

## 第 1 步：起开发服务器

```powershell
npm run dev
```

打开 `http://localhost:5173`。这一步需要用户同意（长驻进程）。

代理关系（来自 `vite.config.js`）：`/api` → `env.VITE_GATEWAY || 'http://localhost:8080'`。**网关没配 CORS，只能走代理，不要改成直连。** 本地网关端口不是 8080 或有第二套时，配 `.env` 里的 `VITE_GATEWAY`，不要改代码。

登录联调需要的账号 / 后端服务由用户提供。后端没起时的表现是：请求失败、toast 弹「网络错误」、列表空 —— 这属于**降级路径验证**，仍然有价值，但不能替代契约验证，交付时要写清楚。

## 第 2 步：按改动类型选走查清单

无论哪一类，先做通用两项：

- 打开 DevTools Console，确认**没有新增报错或未处理的 Promise rejection**。
- Network 面板看请求：URL 前缀是 `/api/...`、带 `Authorization`（已登录时）、状态码与响应体 `{code,message,data}` 符合预期。

### A. 改了页面/组件

1. 直接访问该路由 URL 并**硬刷新**（history 模式下深链刷新依赖服务端 fallback，出问题表现为 404 回首页）。
2. 走一遍正常数据路径，确认新 UI 元素出现且值不是空白/`undefined`/`NaN`。
3. 空态：切到一个没数据的分区或搜一个不存在的关键词，应有形如「该分区暂无视频」「没有找到相关视频」的文案而不是空白块。
4. 加载态：慢网络（DevTools 限速 Slow 3G）下 `v-loading` 生效，不会先闪空列表。
5. 换参数不重载：从 `/video/A` 点侧栏跳到 `/video/B`，标题、播放地址、评论、推荐都要跟着换（依赖 `route.params.id` 的 watch，见 `VideoDetailView.vue` 末尾）。

### B. 改了 API 调用 / 接了新字段

1. Network 里核对请求形状（method、path、query/body）与 Controller 一致。
2. 点开 Response 原始 JSON，把前端读的每个字段名逐个和 JSON key 对齐 —— **这是防契约漂移最有效的一步**。
3. 未登录再走一遍同一页面：访客能看到的内容不能被打到登录页（若被踹走，说明调了白名单外的接口且没判 `isLoggedIn`）。
4. 权限不足场景：用一个没有 `video:upload` 的账号开 `/upload`，应看到黄色 `el-alert` 提示且上传按钮 disabled（`UploadView.vue`）。

### C. 改了鉴权 / store/user.js / request.js

1. 未登录访问 `/upload` 或 `/user` → 跳 `/login?redirect=/upload`。
2. 登录后回到 redirect 指定的原页面，而不是无脑回首页。
3. 手动把 `localStorage.vp_token` 改坏（DevTools → Application → Local Storage），刷新后触发 401 → 自动 logout、弹「登录已失效，请重新登录」、留在可浏览状态。
4. 登录后顶栏昵称/头像/下拉菜单更新；退出后清空并回默认主题。

### D. 改了主题相关（三处同步点任一）

改一处就要三处一起验：`src/config/themes.js` 的 `THEME_OPTIONS`、`src/styles/themes.css` 的 `[data-theme]` 块、`index.html` 内联脚本的 `VALID` 数组。

1. 个人中心 → 外观设置，色块数量与 `THEME_OPTIONS` 一致，选中态（外圈描边）看得出。
2. 点切换后，EP 组件（主按钮 hover、tag、tabs 下划线）跟自定义区块一起变色，不能出现「按钮变了但 hover 还是蓝的」（少写一档 `--el-color-primary-light-N` 就是这个症状）。
3. 刷新页面：首屏不应先闪一下浅蓝再跳成目标色（`index.html` 的内联防闪脚本负责这件事）。
4. 退出登录后回到默认主题。
5. 多设备语义无法本地验证，如实标未验证。

### E. 改了轮询 / 播放器 / 定时器

1. 上传走完转码流程或在无转码配置下投稿，观察进度卡终态：成功、失败(3)、以及后端 `transcode.enabled=false` 时返回 `null data` 的「未转码」分支（`UploadView.vue` 的 `poll()`）。
2. 关键一条：**离开页面后轮询必须停**。上传页停留一会儿后切到首页，Network 面板不该还有每 3 秒一次的 `/api/videos/{id}/transcode-task`。同类要求适用于 hls 实例（`VideoPlayer.vue` 的 `onBeforeUnmount` → `destroyHls()`）。
3. HLS 播放需要一个 `status === 3` 且已产出 m3u8 的视频；缺这种数据就明说没验到，不要靠推断。

---

## 第 3 步：收尾

- 删掉所有临时调试语句（`console.log`、临时 mock、假数据兜底）。用 `grep -rn "console.log" src` 扫一遍。
- `git status` 检查有没有误改到不该动的文件（`dist/` 会被 gitignore，但别手改它）。
- 清理测试期造的脏数据（例如为了走查而发的评论、投的测试稿件），并告知用户清了什么。

## 第 4 步：怎么写验证结论

分两块列，逐条对应真实动作：

```
已验证
- npm run build 通过，仅既有的 chunk 体积告警。
- /video/1 硬刷新：标题、播放计数、点赞数渲染正常，Console 无新增报错。
- 未登录访问 /video/1：详情与评论可见，未被踹到登录页（loadInteract 走了 isLoggedIn 短路）。

未验证（及原因）
- 点赞/收藏的真实计数变化：本地 interact-service 未启动。
- HLS 实际播放：库里没有 status=3 且已转码的视频。
```

禁止写法：

- 「已通过类型检查」—— 本项目没有 TypeScript，也没有 `vue-tsc`。
- 「测试通过」—— 没有任何测试脚本或测试文件。
- 「lint 干净」—— 没有 ESLint/Prettier 配置。
- 「应该没问题 / 理论上是对的」代替明确标注未验证。
- 把 `npm run build` 通过说成功能验证完成。
