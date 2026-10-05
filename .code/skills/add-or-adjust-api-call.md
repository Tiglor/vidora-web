# Skill：新增或调整一个 API 调用

适用：后端加了一个新接口要接；现有接口的路径/参数/返回形状变了；某个页面需要多打一次请求。

前置阅读：`.code/coding-standards.md` 第四节、`.code/requirements.md` 第四节。核心事实：`src/utils/request.js` 的响应拦截器已经把 `ApiResult.data` 拆出来了，api 层函数拿到的直接是业务数据。

---

## 步骤

### 1. 到后端读 Controller，别从前端的注释倒推

前端 `src/api/*.js` 上方的注释是人工抄录的，会漂。**权威源永远是 Controller。**

定位方法（按 URL 前缀找服务）：

```powershell
# 例：要接 /api/actions/favorites，先在整仓 Java 源码里找 controller（跳过 target 编译产物）
grep -rn --include=*.java "RequestMapping(\"/actions\")" E:/Project/vidora/vidora-cloud --exclude-dir=target
```

必须抄下来的四项：

1. HTTP 方法 + 完整路径（含网关 `/api` 前缀后的相对部分）。Controller 上的 `@RequestMapping` 是类级前缀，方法上是拼接关系。
2. 参数形态：`@RequestParam`（进 query，注意 `required=false` 和 `defaultValue`）/ `@PathVariable`（进 path）/ `@RequestBody`（进 body，对应 DTO 的字段名）。
3. 泛型返回：`ApiResult<T>` 里的 `T` 到底是什么 —— 实体去翻它的字段声明，DTO 同理。分页看是否 `IPage`/`Page`（形状固定 `records/total/current/size/pages`）。
4. 鉴权注解：方法上有没有 `@PreAuthorize("hasAuthority('xxx')")`，以及这个路径在不在网关白名单里（`vidora-gateway\...\filter\GatewayAuthFilter.java` 的 `PUBLIC_GET_PATHS` / `PUBLIC_GET_PREFIXES`）。这决定访客能不能调、要不要判登录态。

   注意该 filter 的顺序：**匿名浏览白名单先判**（命中即直接放行，压根不解析 token），所以某个 GET 路径即使同时落在 `ADMIN_PATH_PREFIXES` 里，也照样能被前端以游客身份调到；`ADMIN_PATH_PREFIXES` 只对**带了合法 token**的请求生效。另外 `/api/videos/{数字id}` 及其子路径是靠正则 `VIDEO_DETAIL_PATH` 放行的，不在精确清单里 —— 别只看 `PUBLIC_GET_PATHS` 就断定某个详情类子接口需要登录。

### 2. 选文件：一个后端服务一个 api 文件

| 后端服务 | 前端文件 |
| --- | --- |
| auth-service | `src/api/auth.js`、`src/api/profile.js` |
| video-service | `src/api/video.js` |
| content-service | `src/api/content.js` |
| interact-service | `src/api/comment.js`、`src/api/interact.js` |
| recommend-service | `src/api/recommend.js` |
| search-service | `src/api/search.js` |

归属看**服务**不看业务概念。比如「点赞计数」虽然语义上属于视频，但接口在 interact-service，就写进 `interact.js`。找不到对应文件时才新建，新建后在文件顶部照 `content.js` 的样子写一段服务级说明。

### 3. 写函数

模板（照 `src/api/interact.js` 的风格）：

```js
import request from '@/utils/request'

// GET /api/actions/favorites?current=&size= -> Page<InteractAction>
// 只存 targetId，标题封面要用 POST /api/videos/batch 批量补（上限 50 个 id）
export function listFavorites(params) {
  return request.get('/actions/favorites', { params })
}
```

规则：

- 路径不带 `/api` 前缀（`baseURL` 已经是 `VITE_API_BASE || '/api'`）。
- 函数名动宾式小驼峰：`listXxx` / `getXxx` / `createXxx` / `updateXxx` / `setXxx` / `reportXxx`。
- 参数统一收成一个 `params` 对象传 `{ params }`，不要给每个 query 单独开形参（例外见 `getActionCounts(targetType, targetId)` 这种只有两个必带项的）。
- 注释在第一行给出真实路径与查询串骨架，第二行给出返回类型；**行为上的坑写在注释里**（幂等性、可空语义、副作用、上限、缓存延迟），参照 `api/recommend.js` 里「取出的同时就被标记为已曝光」这类描述。
- multipart 才手动设 header，普通 JSON 不要写 `Content-Type`（axios 自己处理）。参考 `uploadVideo(formData)`。
- **不要在 api 层做数据加工、判登录、弹提示**。它只负责发一次请求。

### 4. 在调用侧接上

- 一次性使用 → 页面里 `await`。
- 多个页面复用且属字典/低频变更数据 → 走 `src/store/dict.js` 那种「缓存 + 在途合并」模式（`categoriesLoaded` 标志 + `_catPromise` 复用同一 promise），避免一次进站打三遍网关。
- 上报型调用（计数字段、埋点）一律 `.catch(() => {})`，且必须在可能跳转的语句**之前**发出。
- 未登录要跳过的，显式 `if (!userStore.isLoggedIn) return`。

### 5. 验证

```powershell
npm run build
```

再起后端联调时的人工核对顺序（详细走查见 `verify-in-browser.md`）：

1. Network 面板确认请求 URL、method、query 与 Controller 一致。
2. 看原始响应体：外层是不是 `{code:200,message:"success",data:...}`；如果 `code != 200`，拦截器会 reject 并弹 toast，这是预期。
3. 确认业务代码拿到的值是 `data` 本身而不是整个壳。
4. 401 / 403 分别试一次：401 应该被踹到登录页并带 `redirect`；403 应该弹「无权限访问」而不会登出。

---

## 常见坑

1. **重复拆包**：写成 `(await listVideos(p)).data.records`。拦截器已经返回 `data`，正确写法是 `(await listVideos(p)).records`。
2. **以为 `ApiResult<Void>` 回 null**。`ApiResult.ok()` 的 `data` 是 `null`，调用方不能当对象用（`profile.js` 的 `updateTheme` 就没人读返回值）。
3. **`@RequestParam(required = false) Long categoryId` 传了字符串 `"null"`** → 后端类型转换直接 400。做法：没值就不带这个 key（`UploadView.vue` 的 FormData 组装有注释；`HomeView.vue` 的 `fetchList` 也是按需塞 `categoryId`）。
4. **布尔/整型枚举的 null 语义**。`ActionCounts.liked` 未登录是 `null` 不是 `false`；后端 `transcodeTask()` 在未开启转码时回 `data: null`。判断要用 `== null` / 显式分支，不能用 `!value` 一把梭。
5. **把需登录的接口当匿名接口用**。白名单外的 401 **没有响应体**（`unauthorized()` 只设状态码），`error.response.data.message` 是 undefined，拦截器会退回默认文案并把人踢到登录页。
6. **分页参数名猜错**。后端统一 `current` / `size`（`defaultValue = "1"` / `"10"` 或 `"20"`），不存在 `pageNum` / `pageSize` / `page`。
7. **改了路径忘了改注释**。api 文件的注释是本项目唯一的接口文档，代码动而注释不动等于留下假线索。
8. **在 api 层 catch 错误再吞掉**。会让调用方以为成功。api 层永远让 promise 直直地冒出来，由页面决定怎么处理。
9. **误用管理端接口**。`ADMIN_PATH_PREFIXES`（`/api/users/`、`/api/roles/`、`/api/menus/`、`/api/categories/`、`/api/tags/`、`/api/hot-searches/`、`/api/search/suggests`、`/api/comments/admin/` 等）只对**携带合法 token**的请求做 clientKey 校验，非 admin 令牌调用返回 403「该接口仅限管理端访问」；而同一前缀里落在匿名浏览白名单中的 GET（如 `/api/categories/list`、`/api/categories/tree`、`/api/hot-searches`、`/api/search/suggests`）会在更早一步被直接放行 —— 也就是说 `/api/search/suggests` 同时出现在两张清单上，游客能用、带普通用户 token 反而会被拒。**同前缀不同命运，只能现场读 `GatewayAuthFilter.java` 确认，别按前缀猜。**
