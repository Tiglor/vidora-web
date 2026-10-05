# Skill：新增一个页面 / 视图

适用：要加一个路由级页面（例：「我的收藏」列表、「弹幕」页、「设置」页）。本仓库现有 7 个页面，形态可以直接照抄，不需要新框架。

前置阅读：`.code/coding-standards.md` 第一/三/四节、`.code/requirements.md` 第二节。

---

## 步骤

### 1. 先确定页面属于哪一类，选一个同类模板读一遍

| 类型 | 参照文件 | 特征 |
| --- | --- | --- |
| 分页列表 | `src/views/HomeView.vue` | loading + grid + el-pagination + query 驱动筛选 |
| 多接口聚合详情 | `src/views/VideoDetailView.vue` | 主数据先行、次要数据 `Promise.all`、失败退回初值 |
| 表单提交 | `src/views/LoginView.vue` / `RegisterView.vue` | `reactive form` + `el-form rules` + `formRef.validate()` |
| 上传 + 轮询 | `src/views/UploadView.vue` | FormData、权限判断、interval 清理 |
| 个人数据 + 偏好设置 | `src/views/UserCenterView.vue` | store 直读、tabs |

不要凭空造结构；同类的 CSS 和状态流都已经有成熟写法。

### 2. 确认数据来源，缺接口就先补 api 层

- 需要的后端能力在 `src/api/*.js` 里有没有对应函数？没有就走 `.code/skills/add-or-adjust-api-call.md`。
- **一定要去 vidora-cloud 的 Controller 核对方法签名**（映射表在 `requirements.md` 第四节），尤其是分页参数名（后端是 `current` / `size`，不是 `page` / `pageSize`）。
- 需要的是「另一个页面也会用的字典或用户态」才进 store；否则留在页面局部。

### 3. 写视图文件

创建 `E:\Project\vidora\vidora-web\src\views\XxxView.vue`，骨架：

```vue
<template>
  <div class="xxx">
    <!-- 内容 -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { someApi } from '@/api/xxx'

const loading = ref(false)
const rows = ref([])

async function fetchData() {
  loading.value = true
  try {
    const page = await someApi({ current: 1, size: 24 })
    rows.value = page.records || []
  } catch (e) {
    // 拦截器已提示
    rows.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
/* 颜色只用 var(--vp-*) */
</style>
```

硬性要求（违反就是返工）：

- `<script setup>`，导入用 `@/`。
- `<style scoped>`，配色走 CSS 变量。
- 任何 `await` 入口都要有 try/catch 或 `.catch()`，catch 里不重复弹 toast。
- 空态、加载态、拿不到数据的降级态都要有。
- 加了 `setInterval` / hls / addEventListener，配 `onBeforeUnmount` 清理。

### 4. 注册路由

编辑 `E:\Project\vidora\vidora-web\src\router\index.js`，在兜底路由 `{ path: '/:pathMatch(.*)*', redirect: '/' }`（文件 routes 数组的最后一条，可用 `grep -n pathMatch src/router/index.js` 定位）**之前**插入：

```js
{
  path: '/xxx',
  name: 'xxx',
  component: () => import('@/views/XxxView.vue'),
  meta: { title: '页面标题', requiresAuth: true }   // 需要登录才加 requiresAuth
}
```

- `name` 用 kebab-case，`path` 语义化，动态段用 `:id`。
- 需要登录的一律靠 `meta.requiresAuth`，守卫已经统一处理跳转与 `redirect` 回跳，**不要在页面里自己判登录再 push**。
- `meta.title` 会被守卫拼成「标题 · 微视频」写进 `document.title`，漏了就是浏览器标签显示上一站的标题。

### 5. 加导航入口

按需改 `E:\Project\vidora\vidora-web\src\layouts\DefaultLayout.vue`：

- 顶栏主导航：`<nav class="top-nav">` 区块（搜 `class="top-nav"`）。注意一级分区是从 `dict.flatCategories` 取 `depth === 0` 且**上限 8 个**（给右侧按钮留位，见 `topCategories` 这个 computed），静态链接直接加 `router-link` 即可。
- 账号下拉菜单：`el-dropdown-menu` 里的 `el-dropdown-item command="..."` 列表 + `onCommand(cmd)` 函数的分支，两处要一起改。

### 6. 验证

```powershell
npm run build
```

然后按 `.code/skills/verify-in-browser.md` 走一遍：直接访问新路径、刷新后仍在正确页、未登录访问被拦到登录页并能回跳、控制台无新报错。

---

## 常见坑

1. **把展示组件写在 views 里**。只在这个页面用 → 留在 `views/`；会在两个以上页面复用 → 拆到 `src/components/`，且拆出去的组件不许发请求（对照 `VideoCard.vue` / `CommentList.vue`，都是纯 props）。
2. **query 参数类型**。`route.query.xxx` 永远是字符串，后端 id 是数字。比较前先 `String(a) === String(b)` —— `CategoryNav.vue` 和 `DefaultLayout.vue` 的 `isCatActive` 都有这条注释，是被咬过的地方。
3. **忘了页面在 DefaultLayout 的 slot 里**。所有页面已经被顶栏/页脚/`.container` 包住，不要再自己套一层 header 或 `max-width`。
4. **访客页面调了需登录接口**。网关白名单外的请求不带 token 会拿到**无 body 的 401**，拦截器直接把访客踹去登录页。调用前判 `userStore.isLoggedIn`，参考 `SearchView.vue` 的 `report()`。
5. **依赖 `dict` 却假设它一定拉到了**。字典预热在 layout 里且失败被吞掉，页面要有兜底展示 —— `HomeView.vue` 的注释就写了这一点（拉不到时侧边栏至少还有前端自加的「推荐」项）。
6. **keep-alive / 组件复用导致 watch 不触发**。同一路由换参数（如从 `/video/1` 跳 `/video/2`）不会重跑 `onMounted`，必须 `watch(() => route.params.id, ...)` 并在里面清空旧数据，见 `VideoDetailView.vue` 末尾。
7. **在页面里内联 axios 或 `fetch`**。全站只有一个 request 实例，绕过它就绕过了 token 注入、拆包和错误提示。
