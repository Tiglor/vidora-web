# 需求规范（requirements）

本文件管的是「需求怎么写、边界在哪里、什么算做完」。代码层面的约定看 `coding-standards.md`。

---

## 一、Web 端在产品里的定位

vidora 是一个视频播放类应用，四部分构成：

| 项目 | 角色 | 使用者 |
| --- | --- | --- |
| `vidora-web`（本仓库） | 面向**普通观众**的桌面浏览器站点 | 登录用户 + 访客 |
| `vidora-mobile` | uni-app 移动端 / H5 | 普通观众（同一批接口，不同交互形态） |
| `vidora-admin` | 运营与管理后台 | 内部管理员，接口被网关 `ADMIN_PATH_PREFIXES` 按 clientKey 锁定 |
| `vidora-cloud` | Spring Cloud 后端（9 个服务 + 网关），契约的唯一权威源 | — |

技术栈（来自 `package.json`）：Vue 3.5 + Vite 5 + Element Plus 2.8 + Pinia 2 + vue-router 4 + axios 1.7 + hls.js 1.5。**业务源码是纯 JavaScript**（`.js` / `.vue`），没有 `.ts` 业务文件、没有 `tsconfig.json` / `jsconfig.json`、devDependencies 里只有 `@vitejs/plugin-vue` + `vite`（外加 element-plus / hls.js / axios / pinia / vue-router 这些运行时包）。**本端没有类型定义，也没有类型门禁**：接口形状只以注释形式写在 `src/api/*.js` 每个函数上方，权威源在后端。

本端已覆盖的功能面（对应 `src/router/index.js` 的 7 个页面）：首页推荐与分区浏览、搜索与热搜榜、视频详情与 HLS 播放、点赞/收藏/分享、评论发布、投稿与转码进度、个人中心（含主题选择与我的投稿）、登录注册。

## 二、职责边界：哪些事归这个端

**归本端**：

- 展示与交互：布局、组件、路由、表单校验的前置提示、加载/空态/错误态呈现。
- 会话状态的本地持有：JWT 存 `localStorage`（键 `vp_token`）、昵称头像角色权限缓存、登录后 `redirect` 回跳。
- 客户端侧的数据组合：把多个接口的结果拼成一个视图（`VideoDetailView.vue` 就是范例 —— 详情 + 播放地址 + 计数 + 汇总 + 推荐 feed 五个来源）。
- 字典数据的进程内缓存与在途合并（`src/store/dict.js`）。
- 主题落地（CSS 变量 + `<html data-theme>` + 防首屏闪色的内联脚本）。

**不归本端**（提给后端或对应端，由用户决策）：

- **任何业务计算与统计口径**。计数一律读后端返回值，不在前端加减。`VideoDetailView.vue` 里那句注释是标准答案：「后端返回的是重算后的完整计数，直接覆盖，不在前端自己加减」。
- **跨服务数据聚合**。这是 BFF 层的待完成项。现状被迫在前端逐条补全（推荐 feed 只给 `videoId`，于是 `loadRecommends` 里对每条候选各发一次 `getVideo()`；评论只有 `userId` 没昵称，于是显示 `用户 #${userId}`）。后端已经提供了 `POST /api/videos/batch`（见 `VideoController.batch`，上限夹 50 个 id），**新写这类补全应该用它而不是循环单查**；已有的逐条调用若要改，属于跨端协调，先问用户。
- **权限判定本身**。本端只做两件事：路由 `meta.requiresAuth` 拦未登录、用 `userStore.hasPermission('video:upload')` 控制按钮可见性。权限从哪来、怎么分配，是 auth/system 服务和管理端的事。注意「隐藏按钮」不是安全边界，后端 `@PreAuthorize` 才是。
- **运营可配的数据**。分区、标签、热搜榜都由管理端写入 content-service，本端只读（见 `src/api/content.js` 顶部注释）。不要在本端硬编码一份「默认分区」当兜底 —— 历史上 `UploadView.vue` 曾写死 1-7 的分类，已经改掉，注释留在那里作为警示。
- **移动端/管理端的同源问题**。同一个 bug 在三端都可能出现，但跨端修改必须分别确认，不能假设「这边修了那边就好了」。

**需要用户拍板才能启动的需求**：让后端加字段/改接口、影响另外两端的行为一致性、引入新依赖、改变鉴权流程。

---

## 三、需求怎么写：四段式

接到口头需求（尤其来自 AI 会话或随手一句话）时，先把下面四段填出来再动手。填不出「范围」和「验收标准」就不要开始写代码。

```markdown
## 背景
为什么要做这件事：当前行为是什么、给用户/业务造成什么问题。
（例：搜索页没有输入框，从 ?keyword=xxx 的分享链接进来后无法改词重搜。）

## 范围
做什么：具体到文件与路径。
不做什么：显式列出容易被顺手带上的东西。
（例：不做热搜榜排序算法调整；不动 mobile 端同名逻辑；不新增依赖。）

## 约束
技术上必须遵守的前提：契约以后端哪个方法为准、鉴权边界、性能/兼容限制、
不能碰的既有约定（如 request.js 的拆包语义、主题三处同步点）。
（例：/api/search/record 要求登录，匿名会拿到无 body 的 401，必须先判 isLoggedIn。）

## 验收标准
可被人肉复核的观察点，一条一个动作。至少包含：
- 正常路径看到什么
- 数据拿不到 / 未登录 / 权限不足时看到什么
- 碰了接口或字段：每个新用到的字段都要在浏览器里看到它真的渲染出值。本端没有类型检查，而模板普遍写了兜底（`{{ video.playCount || 0 }} 播放`），所以字段漂移的症状是**数字恒为 0**、封面恒为默认图，不报错也不空白；只有 `用户 #${c.userId}` 这类现算的展示名才会露出 `#undefined`
- `npm run build` 通过
```

反面例子（不该直接开工的需求写法）：「优化一下详情页」「把推荐做好」「这里顺便改改」。这类描述既没有范围也没有验收标准，做出来的东西没人能判断对不对。

---

## 四、契约以什么为准

**唯一权威源是 vidora-cloud 的 Controller 及其 VO / entity / DTO，不是前端的注释。**

理由：本端与后端之间**没有任何机械校验点**。曾经的离线链路（`../vidora-cloud/openapi/*.json` → `npm run gen:api` → `src/api/generated/*.gen.d.ts` → `npm run typecheck`）已于 2026-10-06 撤掉，理由写在 `.code/README.md`；现在接口形状只活在 `src/api/*.js` 的注释和页面取值点里，全都是手抄副本，拼错字段名不会编译报错，只会在运行时静默变成兜底值。mobile 端那次 `HotSearch.heat` 实为 `heatScore` 的事故就是这类：本端现在没有任何关卡能拦住它，只有浏览器走查能发现。

回后端读要确认的四件事：

1. **字段名与形状**。本端注释可能已经过期，唯一能核对的是后端 VO/entity 的字段声明。
2. **调用本身**。`src/api/*.js` 里的 URL、方法、参数名是手写的，后端改了路径不会通知你。
3. **类型表达不了的语义**：枚举档位、可空列到底是 `null` 还是缺键、某字段只有详情接口才带、写入方向字段（`passwordHash`）照样出现在实体里。
4. **网关鉴权边界**（见下文两节）。

所以规则只有一条：**接入或改动任何后端字段前，现场打开对应 Controller 看方法签名和字段声明**，名字和语义都在那里。

### 服务 → 路径 → 源码位置映射

网关路由定义在 `E:\Project\vidora\vidora-cloud\vidora-gateway\src\main\resources\application.yml`；下表按该文件的路径断言与已读的 Controller 整理。

| 前端 api 文件 | URL 前缀 | 后端 Controller（相对 `vidora-cloud\`） |
| --- | --- | --- |
| `src/api/auth.js` | `/api/auth/**` | `vidora-auth\...\auth\controller\AuthController.java` |
| `src/api/profile.js` | `/api/profile/**` | `vidora-auth\...\auth\controller\ProfileController.java` |
| `src/api/video.js` | `/api/videos/**` | `vidora-modules\vidora-video\...\video\controller\VideoController.java` |
| `src/api/comment.js` | `/api/comments/**` | `vidora-modules\vidora-interact\...\interact\controller\CommentController.java` |
| `src/api/interact.js` | `/api/actions/**`, `/api/play-counts/**` | 同目录 `InteractActionController.java`、`PlayCountController.java` |
| `src/api/content.js` | `/api/categories/**`, `/api/hot-searches/**` | `vidora-modules\vidora-content\...\content\controller\CategoryController.java`、`HotSearchController.java` |
| `src/api/recommend.js` | `/api/recommends/**` | `vidora-modules\vidora-recommend\...\recommend\controller\RecommendResultController.java` |
| `src/api/search.js` | `/api/search/**` | `vidora-modules\vidora-search\...\search\controller\SearchHistoryController.java`、`SearchSuggestController.java` |
| （未接入）消息 | `/api/messages/**` 等 | `vidora-modules\vidora-message\...\message\controller\*` |
| （管理端专用） | `/api/users`,`/roles`,`/menus`,`/clients` | `vidora-modules\vidora-system\...` —— 被 `ADMIN_PATH_PREFIXES` 锁在 admin，web 调会拿 403 |

包根形如 `src\main\java\org\tiglor\<service>\`。

### 响应形状

统一 `ApiResult<T>`（`vidora-common\common-core\...\core\ApiResult.java`）：`{ code, message, data }`，成功恒为 `code = 200`、`message = "success"`。分页是 MyBatis-Plus 的 `IPage`/`Page`：`{ records, total, current, size, pages }`。实体普遍继承 `BaseEntity`（`id` / `createTime` / `updateTime` / `isDeleted`）。

三端的契约副本都靠手写：admin 是 `src/api/types.ts`（一份 TS interface 清单），mobile 是 `src/types/index.ts`，**本端连类型都没有**，形状只写在 `src/api/*.js` 的注释里。所以同一件事要抄三遍，改了后端得挨个点名字提醒。运行层唯一手写的约定在 `src/utils/request.js`：axios 默认 resolve 的是 `AxiosResponse`，这里拆包后 resolve 的是 `ApiResult.data`，页面拿到的直接是业务数据 `T`。另外 MyBatis-Plus 的 `IPage` 带着一批框架内部字段（`countId` / `maxLimit` / `optimizeCountSql` / `orders`），**页面只准读 `records` / `total` / `current` / `size` / `pages`**，别把内部字段带进界面。

### 鉴权边界

匿名可调清单在 `vidora-gateway\...\filter\GatewayAuthFilter.java` 的 `PUBLIC_GET_PATHS`（精确匹配，如 `/api/videos/page`、`/api/categories/tree`、`/api/search/suggests`、`/api/actions/counts`、`/api/recommends/feed`、`/api/hot-searches`）与 `PUBLIC_GET_PREFIXES`（前缀匹配，如 `/api/comments/video/`、`/api/play-counts/`）。此外 `/api/videos/{数字id}` 及其任意子路径（`/play-url`、`/download`、`/transcode-task`…）由正则 `VIDEO_DETAIL_PATH` 整体放行。**这份清单会变，用到时现场读文件，别引用本文的列表当依据。**

判定顺序影响结论，必须知道：匿名浏览白名单**最先判**，命中就直接放行、不解析 token；`ADMIN_PATH_PREFIXES` 的 clientKey 校验发生在 token 校验**之后**，只作用于带令牌的请求。推论是同一个路径可能有相反的命运 —— `/api/search/suggests` 同时出现在两张清单上，游客调用被放行，而带着普通用户 token 调用反而拿 403。所以不要按前缀推断某接口能不能调。

白名单外的请求不带 token 会返回 **401 且响应体为空**（`unauthorized()` 只设状态码就 `setComplete()`），拦截器会直接把用户踹去登录页 —— 所以访客可见页面上的「顺手调用」必须显式判登录态。

### 枚举与状态位

不同表的 `status` 数字含义完全不同，混用过就已经出过事故：

| 来源 | 取值 |
| --- | --- |
| `video_info.status`（`SQL/vidora_cloud.sql` 第三节） | 0-上传中 1-转码中 2-审核中 3-已发布 4-已下架 |
| `video_transcode_task.status`（同节；`TranscodeTask.java`） | 0-待处理 1-处理中 2-成功 3-失败 |
| `content_category.status` / `content_tag.status` | 0-禁用 1-启用 |
| `content_hot_search.status` | 0-下线 1-上线 |
| `interact_action.status` | 0-取消 1-有效 |
| `ActionType` | 1-点赞 2-收藏 3-分享 |

建库脚本是 `E:\Project\vidora\vidora-cloud\SQL\vidora_cloud.sql`（单库单文件、内部按业务分节），列注释是这些语义的第一手出处。

---

## 五、什么算完成

一个需求只有同时满足下列条件才算 done，才可以对用户说「完成」：

1. **代码落在正确的层**：新接口进 `src/api/` 对应服务文件并带路径注释；跨页复用数据进 `store/`；纯展示进 `components/`；不要在页面里内联 `axios` 调用。
2. **契约经现场核对**：涉及的每个后端字段都能指出它在哪个 Controller / VO / entity 的哪一行；本端注释与页面取值点已按那个名字改对，语义（档位、可空、只在某接口返回）以 controller/impl 为准。没去读后端就说「一致」的，一律算未完成。
3. **降级路径想过了**：接口失败、返回 `null`、未登录、无权限、列表为空 —— 这五种情况各自的界面表现明确，且不产生未处理的 Promise rejection，不产生重复 toast。
4. **清理副作用到位**：新加的 `setInterval` / hls 实例 / 事件监听有对应的 `onBeforeUnmount` 释放。
5. **样式跟主题**：新增配色全部走 CSS 变量；如果动了主题相关三处同步点，三处都改了。
6. **`npm run build` 通过**（本端唯一机械门禁），并且按 `.code/skills/verify-in-browser.md` 人工走查过受影响路径（这一步要真的做过，做不到就如实标「未验证」及原因）。
7. **交付说明区分已验证/未验证**，规则见 `agent-rules.md` 第六节。本项目不存在 test / lint / 类型检查，**不许声称跑过它们**；涉及后端字段时只能说「已对照某某 Controller」，不能说「已由类型检查保证」。
8. 若过程中发现规范与代码不一致，**回来修订 `.code/` 对应文件**（修订前征求用户同意）。
