# Skill：接入后端返回的新字段

适用：后端 VO/entity 加了字段前端要展示；某个页面显示空白/`undefined`，怀疑字段名已经和后端对不上；三端契约需要重新对齐。

这是本项目**最容易出错**的一类活 —— 因为 vidora-web 没有 TypeScript、没有类型文件，接口形状全靠 `src/api/*.js` 上方的人工注释传递。历史上 mobile 端就发生过 `HotSearch.heat` 实际已改名 `heatScore` 而代码仍在读旧名的漂移事故。

---

## 步骤

### 1. 从渲染处倒推到源头，先把「用到的字段名」全列出来

打开出问题的组件/页面，把这一路消费的后端字段抄成一张清单。

例：`VideoDetailView.vue` 的主数据来自 `getVideo(id)` → `video.value`，模板里读到 `video.title` / `video.coverUrl` / `video.description` / `video.status` / `video.publishTime`，脚本里读到 `v.playCount` / `v.likeCount` / `v.shareCount` / `v.categoryId` / `v.id`。

不要漏掉藏在计算属性、`map` 回调、子组件 props 里的字段。

### 2. 找到权威源，逐字段核对

按 `requirements.md` 的服务映射表定位 Controller，再顺着返回类型跳到它的 VO / entity / DTO：

```powershell
grep -rn "private" E:/Project/vidora/vidora-cloud/vidora-modules/vidora-video/src/main/java/org/tiglor/video/entity/VideoInfo.java
```

对照要点：

- **Java 字段名 → JSON key**。项目里没有 `@JsonProperty` / 自定义命名策略的痕迹，Lombok `@Data` + Jackson 默认 camelCase，所以 `coverUrl` 就是 `coverUrl`。一旦某处出现注解覆盖，以注解为准。
- **继承链上的字段**。`VideoInfo extends BaseEntity`，`id` / `createTime` / `updateTime` / `isDeleted` 来自父类（`vidora-common\common-core\...\core\BaseEntity.java`），在子类源码里 grep 不到。看到页面用了 `c.createTime` 却查不到声明就是这个原因。
- **不在实体里的展示字段**。`CommentView` 刻意只带 `userId` 不带昵称（它的类注释解释了跨服务补全该由 BFF 做）。这类「后端就是不给你」的字段，前端只能显示占位或换接口，**不要自己拼一个假的**。
- **枚举数字含义**。核对时顺带看 SQL 列注释（`E:\Project\vidora\vidora-cloud\SQL\`），确认本仓库用的档位没串台。

### 3. 用一次真实响应交叉验证（可选但推荐）

如果本地起了网关，直接打一把最准：

```bash
curl -s "http://localhost:8080/api/videos/page?current=1&size=1" | head -c 600
```

不带 token 也能过（`/api/videos/page` 在网关匿名清单里）。有 token 时：

```bash
curl -s -H "Authorization: Bearer <token>" "http://localhost:8080/api/videos/1"
```

注意 curl 拿到的是外层 `{code,message,data}`，而前端代码拿到的是拆包后的 `data`。

起不了服务就明确记为「未与真实响应交叉验证」，别只凭源码就宣称契约一致。

### 4. 改前端消费点

顺序：**先改 api 层注释，再改页面。**

1. 更新 `src/api/xxx.js` 里那个函数上方的返回形状注释，让下一个人抄到的是对的。
2. 页面里赋值/渲染新字段。取值一律带兜底：`x.newField || 0`（数值）、`x.newField || '/default-cover.svg'`（图片）、`x.newField ?? ''`（可能为 null 的布尔/字符串）。
3. 时间字段是 `LocalDateTime` 序列化来的 `"2024-10-05T02:21:00"`，本仓库的处理方式是 `String(t).replace('T', ' ').slice(0, 16)`（见 `VideoDetailView.vue` 的 `publishText`）。**没有引入 dayjs/date-fns，别顺手加依赖。**
4. 新增字段的展示要考虑主题：颜色走 `var(--vp-*)`。

### 5. 验证

```powershell
npm run build
```

浏览器里按 `verify-in-browser.md` 走查，重点看两件事：新字段真的渲染出了值（不是 `0` / 空白 / `undefined`）；控制台没有出现新的 `Cannot read properties of undefined`。

后端没起时，至少要构造一份假响应确认渲染分支不炸（可以临时在 fetch 后打印结构，验完删掉临时代码）。

---

## 常见坑

1. **照旧注释写代码**。`src/api/*.js` 的注释可能落后于后端。**任何情况下都去读 Controller / VO**，注释只当索引入门。
2. **`records` 当成数组根**。分页响应永远是 `IPage` 包装，列表在 `.records`，总数在 `.total`。写成 `list.length` 会得到 undefined。
3. **Long 精度**。`userId` / `videoId` 是 Java `Long`，Jackson 默认序列化成 JSON number。当前 id 量级（自增、远小于 2^53）安全，但**不要在前端对 id 做算术**，只做相等比较与拼接；真要跨端比 id 记得 `String()`。
4. **query 与实体的类型不一致**。`route.query.cat` 是字符串、`category.id` 是数字，`===` 会永远不相等。本仓库统一 `String(a) === String(b)`。
5. **null 与 false 混为一谈**。`ActionCounts.liked` 未登录是 `null`，代表「不知道」而不是「没点过」；用 `!counts.liked` 会把两者合并，导致未登录用户点下去的行为不对。参考 `toggleLike` 的先判登录再取反。
6. **误以为 `ApiResult<String>` 回对象**。`play-url` / `download` 拆包后就是裸字符串，`res.url` 是 undefined。
7. **只改一处渲染点**。同一个字段常在列表卡片、详情页、个人中心多处使用。改前全局搜一遍字段名：

   ```powershell
   grep -rn "heatScore" E:/Project/vidora/vidora-web/src
   ```
8. **把该后端做的补全在前端硬凑**。典型是「feed 只给 videoId → 循环单查 getVideo」。后端已经有 `POST /api/videos/batch`（上限 50 个 id，且不保证顺序、已删除的静默跳过），新写的补全逻辑应该用它；改动既有实现要先征求用户同意。
9. **字段名相似的错配**。管理端踩过 `icon` vs `iconUrl` 的坑。本端也有近义字段并存的情况（`hlsUrl` / `storagePath` / `coverUrl`；`playCount` 在 `VideoInfo` 和 interact 汇总里都有），赋值前确认拿的是哪一个。
10. **删了旧字段却没清理引用**。改名后要搜旧名残留，包括 `v-if`、`:key`、props 声明和 api 注释里的例子。
