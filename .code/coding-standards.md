# 编码规范（coding-standards）

本文件描述**当前代码实际长什么样**，以及延续它时应遵守的约定。规则都是从现有文件里归纳的，不是外部标准的移植。冲突时以代码为准并回来修订本文。

---

## 一、目录职责

| 目录 | 放什么 | 不放什么 |
| --- | --- | --- |
| `src/api/` | 一个后端服务一个文件（`video.js` / `comment.js` / `interact.js` / `recommend.js` / `search.js` / `content.js` / `profile.js` / `auth.js`），只导出「一次 HTTP 调用 = 一个函数」 | 不做业务判断、不碰 store、不做数据加工 |
| `src/utils/` | `request.js`：唯一的 axios 实例与全局拦截器 | 不要在别处再 new 一个 axios |
| `src/store/` | Pinia store：`user`（会话）、`theme`（主题落地）、`dict`（字典缓存与在途合并） | 单页面临时状态不要塞进来 |
| `src/views/` | 路由级页面，与 `src/router/index.js` 一一对应 | 不写可复用展示组件 |
| `src/components/` | 展示型组件（`VideoCard` / `CommentList` / `CategoryNav` / `VideoPlayer`） | **不发请求**，数据靠 props 进、事件 emit 出 |
| `src/layouts/` | `DefaultLayout.vue`：顶栏、搜索框、页脚、内容区插槽 | 页面主体逻辑不放这里 |
| `src/config/` | `themes.js`：主题清单与 key 归一化 | — |
| `src/styles/` | `main.css`（默认主题变量 + 全局重置 + `.container`/`.text-ellipsis`/`.text-2-line` 工具类）、`themes.css`（`[data-theme]` 覆盖块） | — |
| `public/` | 静态资源直接按根路径引用（`/default-cover.svg`、`/favicon.svg`） | — |

导入一律用 `@/` 别名（`vite.config.js` 里指向 `./src`），不写 `../../` 相对回溯。

---

## 二、命名

- 文件：Vue 组件用 PascalCase（`VideoDetailView.vue`）；JS 模块用小驼峰或既有名（`request.js`、`dict.js`、`themes.js`）。
- 组件名 = 文件名。视图名后缀统一 `View`，通用组件不带后缀。
- 变量/函数：小驼峰。布尔量用 `isXxx` / `hasXxx`（store getter 里就是 `isLoggedIn` / `hasPermission`）。
- 常量：SCREAMING_SNAKE，放在文件顶部并使用处最近的文件里。例：`VideoDetailView.vue` 的 `ACTION_LIKE = 1` / `ACTION_FAVORITE = 2` / `ACTION_SHARE = 3`，注释标明「对应后端 ActionType 枚举」。
- store id 与文件名对齐：`defineStore('user', ...)`、`defineStore('theme', ...)`、`defineStore('dict', ...)`，导出名固定 `useXxxStore`。
- CSS 类名：kebab-case，且带项目前缀 `vp-` 的是设计令牌（`--vp-primary`），普通布局类用短名（`.player-col`、`.side-title`）。
- 路由 `name` 用 kebab-case（`video-detail`、`user-center`），`path` 用语义段（`/video/:id`）。

---

## 三、组件写法

统一 **`<script setup>` + Composition API**，模板 → 脚本 → `style scoped` 的顺序。仓库内没有 options API 的 `.vue`（Pinia store 用的是 options 式声明，那是 store 不是组件）。

真实骨架（摘自 `HomeView.vue` 的形状）：

```vue
<template>
  <div class="home">
    <div v-loading="loading" class="grid">
      <VideoCard v-for="v in videos" :key="v.id" :video="v" />
      <div v-if="!loading && videos.length === 0" class="empty">该分区暂无视频</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import VideoCard from '@/components/VideoCard.vue'
import { listVideos } from '@/api/video'

const videos = ref([])
const total = ref(0)
const loading = ref(false)

async function fetchList() { /* ... */ }
onMounted(fetchList)
</script>

<style scoped>
.grid { display: grid; }
</style>
```

约定细节：

- 局部状态用 `ref`；表单聚合对象用 `reactive`（`LoginView.vue` 的 `form`）。
- 派生值一律 `computed`，不在 watch 里手动同步。
- 定时器/第三方实例这类需要清理的资源，用模块内 `let` 变量 + `onBeforeUnmount` 释放。见 `UploadView.vue` 的 `timer` / `stopPolling()` 和 `VideoPlayer.vue` 的 `hls` / `destroyHls()`。**新加任何 interval 或外部实例，必须同时加卸载清理。**
- props 用对象式声明并带类型与默认值：`defineProps({ comments: { type: Array, default: () => [] } })`；emit 用 `defineEmits(['submit'])`。
- 组件对外通信：子传父只走 `emit`，不直接改父组件状态。`CategoryNav.vue` 同时 emit `update:modelValue` 和 `change`，配合父级 `v-model` + `@change`。
- Element Plus 图标已在 `main.js` 全局注册，模板里直接 `<el-icon><Search /></el-icon>`，**不需要逐个 import**。其他 EP 组件同理（`el-button`、`el-alert`…）。但函数式的 `ElMessage` / `ElMessageBox` 要显式 `import { ElMessage } from 'element-plus'`。

---

## 四、状态与 API 调用约定

### 4.1 request.js 已经把事做完了，别重复做

`src/utils/request.js` 的行为，写代码时必须假定其为真：

1. `baseURL = import.meta.env.VITE_API_BASE || '/api'`，超时 15s。
2. 请求拦截从 `localStorage.getItem('vp_token')` 取 token，注入 `Authorization: Bearer <token>`。
3. 响应拦截拆包：响应体是对象且含 `code` 字段时，`code !== 200` → 弹 error toast 并 `Promise.reject`；`code === 200` → **直接把 `body.data` 返回给调用方**。因此 `await listVideos(...)` 拿到的是业务数据本身，**不要再写 `.data.data`**。
4. 不含 `code` 的响应原样返回（用于网关直接回纯值的场景）。
5. HTTP 层错误：`401` → `userStore.logout()` + 提示「登录已失效」+ 跳 login 带 `redirect`；`403` → 提示无权限；其余 → 提示网络错误。都 reject。
6. 同一条错误文案 1.5s 内只弹一次（`notifyError`），所以并发请求失败不会叠出多条相同 toast。

### 4.2 api 文件的写法

每个导出函数上方一行注释标真实路径、参数与返回形状，这是本项目事实上的「接口文档」：

```js
// GET /api/videos/page?current=&size=&categoryId=&keyword=
// -> IPage<VideoInfo>  { records:[...], total, current, size, pages }
export function listVideos(params) {
  return request.get('/videos/page', { params })
}
```

- 函数名动宾式：`listVideos` / `getVideo` / `createComment` / `setActive` / `reportPlay` / `recordSearch`。
- 有坑的地方写在注释里，不要埋在实现里。看 `api/recommend.js`：feed「取出的同时候选就被标记为已曝光」「只返回 videoId，标题封面要另外查」——这两句省下后来人半天。
- multipart 单独设 `headers`（`uploadVideo`）。

### 4.3 页面侧的调用模式

- 列表页三件套：`loading` + `records || []` + `total || 0`，失败在 catch 里清空列表。见 `HomeView.vue` 的 `fetchList()`。
- 详情/多源页先拿主数据，再 `Promise.all` 拉次要数据；次要数据失败允许退回初值。见 `VideoDetailView.vue` 的 `load()` → `loadComments/loadInteract/loadRecommends`。
- 「上报型」调用（播放计数、搜索回报、点击上报）一律 `.catch(() => {})` 静默吞掉，绝不让它影响主流程；跳转前的上报必须在 `router.push` **之前**发出（`VideoDetailView.vue` 的 `go()` 有注释说明原因：组件卸载后 promise 无人管）。
- 未登录就跳过需要登录的调用。网关只对 `/api/auth/**`、`PUBLIC_GET_PATHS` / `PUBLIC_GET_PREFIXES` 清单以及 `/api/videos/{数字id}*` 正则放通匿名访问，其余请求不带 token 会拿到**无 body 的 401**并被拦截器直接踹去登录页 —— 所以访客浏览路径上任何「顺手调一下」都必须先判 `userStore.isLoggedIn`。参考 `SearchView.vue` 的 `report()` 与 `VideoDetailView.vue` 的 `loadInteract()`。
- 匿名可用路径的权威清单在 `vidora-cloud/vidora-gateway/src/main/java/org/tiglor/gateway/filter/GatewayAuthFilter.java`（`PUBLIC_GET_PATHS` / `PUBLIC_GET_PREFIXES`）。前端注释里提到的放行情况应以该文件为准，改动前现场核对。

### 4.4 store 使用

- 跨页复用的数据才进 store。字典类数据进 `dict` store，它做了两件事：**缓存**（`categoriesLoaded` 标志）和**在途合并**（`_catPromise` 复用同一 promise）。不要绕开它自己调 `getCategoryTree()`。
- 预热位置在 `DefaultLayout.vue` 的 `onMounted`：`dict.loadCategories().catch(() => {})`。页面里默认**不要 force**，只有明确的「重试」入口才传 `force = true`（`UploadView.vue` 的 `loadCategories(true)`）。
- 涉及服务端落地的动作，**先请求成功再改本地状态**。`store/theme.js` 的 `setTheme()` 有整段注释解释为什么反过来会「界面是粉的、账号里是蓝的」。
- store 里的私有动作以 `_` 前缀标记（`_setSession`、`_apply`）。

---

## 五、错误处理约定

1. **toast 由拦截器统一弹**。业务代码的 catch 里**不要再 `ElMessage.error`**，否则两条重复提示。空 catch 加上注释是本仓库的标准写法：

   ```js
   } catch (e) {
     // 拦截器已提示
   }
   ```

   （`UserCenterView.vue` 的 `pickTheme()` 把这个理由写成了完整注释，可作为范本。）

2. catch 里允许做的：复位 `loading` / `saving`（放 `finally`）、把列表清空、退回初始值。
3. 前置校验用 `ElMessage.warning`（`UploadView.vue` 的 submit 三连判空），成功反馈用 `ElMessage.success`。这两个属于用户操作结果，不是错误，不归拦截器管。
4. 破坏性动作前二次确认：`ElMessageBox.confirm(...).then(...).catch(() => {})`，见 `DefaultLayout.vue` 和 `UserCenterView.vue` 的 logout。
5. 不要让未处理的 Promise rejection 冒到控制台：任何 `await` 的入口函数都要有 try/catch 或 `.catch()`。
6. 局部降级优于整块报错：推荐 feed 为空退回同分区最新视频（`loadRecommends`）、评论缺昵称时显示 `用户 #${userId}`（`loadComments`）、热搜没拉到就整块 `v-if` 不渲染（`SearchView.vue`）。**新增消费后端数据的面板时，必须想清楚「拿不到时长什么样」。**

---

## 六、注释规范

主张：**只在「为什么」不显然处写一行中文注释；不复述代码在做什么。**

不该写的（浪费且很快过期）：

```js
// 获取视频列表
const page = await listVideos(params)

// 这里把 loading 设为 false
loading.value = false
```

该写的四类，全部能在仓库里找到实例：

1. **契约与坑**（接口行为不看后端就不可能知道）

   ```js
   // POST /api/play-counts/{videoId} -> Boolean，false 表示落在去重窗口内、本次未计数
   ```

2. **顺序/时序的原因**（反直觉的实现选择）

   ```js
   // 点击上报必须在跳转之前发出：路由切走后当前组件就卸载了
   ```

3. **为什么不那么做**（事故记录，价值最高）

   ```js
   // transcode_task.status 只有 0-待处理 1-处理中 2-成功 3-失败（见 SQL/02 的列注释），
   // 之前这里多写了一个 4，是照着 video_info.status 的档位串了台
   ```

4. **类型/口径陷阱**

   ```js
   // query 永远是字符串，后端回来的 id 是数字，两边都转字符串比（和侧边栏同一处坑）
   ```

其他要求：

- 用中文，一句话到三句话，说清因果即可，不要写成论文。
- 需要长篇论证的（如主题引擎三处同步、字典缓存的收益）放在文件顶部块注释里，不要塞在函数中间 —— `src/config/themes.js`、`src/store/dict.js`、`src/styles/themes.css` 都是这个做法。
- 注释里点名具体文件/表/枚举名（`content_hot_search`、`ActionType`、`GatewayAuthFilter`），便于下一个人直接跳过去查证。
- 代码改了让注释变错，等于埋了个假线索：**改代码必须同步改注释**，宁可删掉也不要留错的。

---

## 七、类型与契约纪律

本项目**没有 TypeScript**，没有 `types.ts`，也没有生成物。所谓「类型」存在于三个地方：

1. 后端 Java Controller 的方法签名 + VO/entity 字段（唯一权威源）；
2. 前端 `src/api/*.js` 的注释（人工抄录，会漂）；
3. 组件里的运行时取值（`props.video.playCount`）。

后端侧的补充权威材料：`E:\Project\vidora\vidora-cloud\docs\ARCHITECTURE.md`（架构与待完成项，前端注释里提到的「BFF 是待完成项」「跨服务事件回写没做」出自这里）和 `E:\Project\vidora\vidora-cloud\README.md`（各服务端口、编译方式、前端对接章节）。源码注释引用这两个文档时用的是简称，查证时按上面的路径找。

因为第 2 项靠手抄，**契约漂移是本项目最常见的 bug 类别**（mobile 端已经踩过 `HotSearch.heat` → `heatScore`）。纪律：

- **接入或修改任何后端字段名前，去 vidora-cloud 读对应的 Controller / VO / entity**，用字段声明行作为证据。查询起点见 `requirements.md` 的服务映射表。
- 注意 MyBatis-Plus 的 `IPage` 包装形状：分页响应永远读 `records` / `total` / `current` / `size` / `pages`。
- 注意可空语义差异：`ActionCounts.liked` / `favorited` 未登录时是 `null` 而不是 `false`（后端 DTO 上有明确注释），前端必须区分「没登录」和「登录了没点过」。
- 注意 `Long` 序列化成 JSON 是数字，而 URL query 回来是字符串：比较 id 前先 `String(a) === String(b)`。
- 后端返回纯值时（`ApiResult<String>` 的 play-url / download-url），拦截器拆完包后拿到的就是一个字符串，别当对象用。
- **绝不为了让代码「看起来有类型」而新建一套手写 `types.js`/JSDoc 契约文件**。那只会制造第二个会漂的真相源。要做的是让 `api/*.js` 的注释贴近后端。
- 后端刻意不校验的枚举（例如 `themeKey` 后端不校验，就是为了加主题不用发版），前端要有兜底：`normalizeThemeKey()` 认不出的 key 一律落回默认。
- **本文举例的代码也要现场核一遍**。规范里的例子来自某个时间点的仓库快照，可能已经过期或本就带错。给一个已核实为真的对照案例：后端 `CommentView` 的类注释明确写「只带 userId，不带昵称头像」（跨服务补全归 BFF），但 `VideoDetailView.vue` 的 `loadComments()` 读的是 `comment.userName` —— 该字段后端不返回，实际永远走 `用户 #${userId}` 那条兜底分支。这类「代码读了一个后端压根不给的字段」就是漂移的真实形态，只能靠逐字段比对 DTO 抓出来。

---

## 八、样式规范

- 组件样式一律 `<style scoped>`。全局样式只在 `src/styles/main.css` 和 `themes.css`。
- **颜色不允许硬编码**。所有配色走 CSS 变量：`--vp-primary` / `--vp-primary-dark` / `--vp-primary-light` / `--vp-text` / `--vp-text-2` / `--vp-bg` / `--vp-card` / `--vp-border`，Element Plus 组件跟 `--el-color-primary*` 系列。硬编码色值会让组件在新主题下脱节 —— 历史提交里就有一批 `btn-pink` / `#999` 被替换成 `type="primary"` / `var(--vp-text-2)`（见 `git diff` 中的 `CommentList.vue`）。
- **例外**：语义固定的颜色可以直连 EP 的语义变量，且必须留注释说明为什么不跟主题走。范本是 `UploadView.vue`：

  ```css
  .err {
    /* 错误提示必须恒为红色，不能跟着主题走，否则会丢掉「红=出错」的含义 */
    color: var(--el-color-danger);
  }
  ```

  播放器底色 `#000`、封面占位灰 `#e9ebed` 也属于「不随主题的物理事实」，可以保留。
- 卡片圆角统一 `10px`（详情页 `.card`、个人中心 `.card`），登录卡用 `12px`；阴影用低透明度黑。新样式先看同类页面。
- 容器宽度用 `.container`（`max-width: 1200px`）；文本截断用现成的 `.text-ellipsis`（单行）/ `.text-2-line`（两行），不要在组件里重写。
- 网格列表统一写法（首页/搜索/个人中心三处一致，新增列表继续用它）：

  ```css
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  ```
- 主题相关改动必须同时覆盖三处同步点：`src/config/themes.js` 的 `THEME_OPTIONS`、`src/styles/themes.css` 的 `[data-theme='xxx']` 块、`index.html` 内联脚本的 `VALID` 数组。`--el-color-primary-light-N` 按 themes.css 顶部注释里的公式算，少写一档就会出现「按钮变色了但 hover 还是蓝的」。
- 引入新的全局 CSS 要注意顺序：`main.js` 里 `themes.css` 必须排在 element-plus 的 css 与 `main.css` 之后，否则覆盖不掉 EP 的 `:root` 主色（这条注释就在 `main.js` 里）。
- 响应式仅在有明确需求时加，且用断点隐藏次要信息面板的做法（`SearchView.vue` 在 `max-width: 900px` 隐藏热搜榜），不要重构整体布局。
