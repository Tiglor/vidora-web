# AI 行为规范（agent-rules）

本文件约束 AI 在本仓库的行为。目标是：**在不了解全貌时不做破坏性动作，在没有证据时不做确定性断言。**

---

## 一、动手前的必读清单

按顺序做完，缺一项就补做，不要跳：

1. `AGENTS.md`（仓库根）—— 项目定位与命令。
2. 本文件 + `coding-standards.md` + `requirements.md`。
3. `package.json` —— 确认真实的 scripts 和依赖版本。**不要凭记忆**认为有 lint/typecheck/test。
4. `src/utils/request.js` —— 所有请求的地基。不看它写的代码，就不知道返回值已经被拆成了 `ApiResult.data`，也不知道错误已经统一弹过 toast。
5. 你要改的那个模块的现有文件：
   - 动页面 → 先读 `src/views/` 下同类页面至少一个（列表类看 `HomeView.vue`，详情/多接口聚合类看 `VideoDetailView.vue`）；
   - 动接口 → 先读 `src/api/` 下同服务文件；
   - 动状态 → 先读 `src/store/` 下对应 store。
6. `src/layouts/DefaultLayout.vue` —— 顶栏、搜索框、字典预热都在这里，很多「页面不生效」其实是这里的数据流没搞清楚。
7. 涉及后端字段时，去 `E:\Project\vidora\vidora-cloud` 读对应的 **Controller**（不是前端类型，本项目没有 TS）。路径映射见 `requirements.md`。

---

## 二、不许凭记忆断言代码现状

这是本项目最容易出事的地方：多个源文件尚未提交到 git（`git ls-files` 里没有它们），而历史对话里可能出现过「已经修好」的结论。

规则：

- **任何关于「当前代码是怎么写的」的断言，必须当场 Read/Grep 确认后再说。** 包括「这个 bug 已经修了」「这个字段叫 heatScore」「这个接口要求登录」。
- 引用代码时给出文件路径（必要时带行号），不要复述大意。
- 「我记得 / 通常来说 / 应该是」这类措辞出现时，等于在说自己没查证，立即停止这种表达。
- 数字、枚举值、字段名、路径这四类东西**永远现场查**，它们是契约漂移的重灾区。举例：`transcode_task.status` 是 0-3，`video_info.status` 是 0-4，两串数字曾在 `UploadView.vue` 里被混用过（该文件的注释就是这次事故的记录）。

---

## 三、构建 / 检查 / 验证门禁：具体命令

从 `package.json` 的 `scripts` 原文抄录，全部只有三条：

| 命令 | 实际执行 | 用途 |
| --- | --- | --- |
| `npm run dev` | `vite` | 起本地开发服务器，端口 5173，`/api` 代理到 `VITE_GATEWAY`（默认 `http://localhost:8080`） |
| `npm run build` | `vite build` | **唯一的机械门禁**。产物输出到 `dist/` |
| `npm run preview` | `vite preview --host` | 预览构建产物 |

已验证事实：`npm run build` 在本仓库当前状态下能通过（实测 `built in 5.38s`，仅有 chunk > 500kB 的体积告警，非错误）。

**不存在的东西，别写进交付说明**：

- 没有 `test` 脚本，没有 Vitest/Jest/Playwright/Cypress，仓库里没有任何测试文件。
- 没有 `lint` / `format` 脚本，也没有 ESLint / Prettier 配置文件。
- 没有 TypeScript：没有 `tsconfig.json`、没有 `jsconfig.json`，`vite.config.js` 是 JS，全部源码是 `.js` / `.vue`，因此**没有 `vue-tsc` 可用，也不存在「类型检查通过」这种说法**。缺 `jsconfig.json` 还意味着编辑器不会为 `@/` 别名提供跳转和补全 —— 这是既有限制，**不要为了让 IDE 舒服就擅自加配置文件**。

改动后的最低验证组合：

```powershell
npm run build          # 编译期能不能过
# 然后按 .code/skills/verify-in-browser.md 人工点一遍受影响路径
```

只跑 `npm run build` 不足以声称功能正确：模板里的运行时错误、字段名拼错、异步时序问题都不会被 Vite 构建拦住。

---

## 四、禁止动作清单

未经用户明确同意，**不得执行**下列任一操作：

| 类别 | 具体 | 为什么危险 |
| --- | --- | --- |
| 依赖变更 | `npm install` / `npm uninstall` / 升级或新增 package.json 依赖 / 删除 `package-lock.json` 重新生成 | 会改动锁文件与 `node_modules`，影响其他人；本项目 `node_modules` 已就位，只读命令够用 |
| 构建产物 | 手工编辑或删除 `dist/` | 是生成物，不该人肉改 |
| Git 写操作 | `git commit` / `git push` / `git reset --hard` / `git checkout --` / `git clean -f` / `git branch -D` / 改写历史 | 本仓库工作区有大量未提交改动，任何 reset/checkout/clean 都会直接吃掉别人的活 |
| 绕过检查 | `--no-verify`、跳过 hook、修改 CI 配置 | 不允许 |
| 删文件 | 删除任何既有源文件、`.env`、SQL、文档 | 不可逆且难发现 |
| 配置 | 改 `vite.config.js` 的 proxy/target、改 `.env`、加环境变量 | 影响联调目标；`.env` 已被 gitignore，改错了别人复现不了 |
| 跨项目 | 修改 `vidora-web` 以外的目录（`vidora-cloud`、`vidora-mobile`、`vidora-admin`、根目录 docx/md） | 那些端各有负责人和节奏 |
| 服务 | 重启/停止网关或后端服务、连数据库执行写 SQL | 属于用户的运行环境 |

允许执行的只读或局部安全操作：`ls` / `cat` / `find` / `grep` / `git status` / `git diff` / `git log` / `git ls-files` / `npm run build` / `npm run dev`（需要用户同意启动长驻进程）。

---

## 五、哪些改动必须先征求用户同意

除了上面第四节，以下**代码层面**的改动也要先问：

1. **改变请求/鉴权语义**：动 `src/utils/request.js` 的拦截器、token 存储键（`vp_token`）、401 跳转策略、toast 去重窗口。全站都建立在这套约定上。
2. **动登录态与权限口径**：`src/store/user.js` 的 `_setSession` / `logout`，以及 `meta.requiresAuth` 的使用。
3. **新增第三方依赖**（哪怕只是图表库、日期库）。
4. **改主题引擎的三处同步点**：`src/config/themes.js`、`src/styles/themes.css`、`index.html` 内联防闪脚本的 `VALID` 数组。这三处刻意有一份重复（内联脚本 import 不到模块），漏改会造成首屏闪色或选中态丢失。
5. **删除或重命名任何 `src/api/*.js` 导出的函数**：其他端与后续需求可能引用。
6. **提出「让后端配合改接口/加字段」**：这会影响 vidora-cloud 和其他两端，必须由用户决策。
7. **改动路由 path 或 name**：外部分享链接和 `?redirect=` 回跳依赖它们。
8. 任何**大范围重写**（把 options API 改 setup、把所有 store 重构成 composable、批量改样式命名）。本仓库风格高度一致，重写会让 diff 失去可读性。

---

## 六、交付时如何区分「已验证」与「未验证」

交付说明必须分成两块，逐条对齐真实跑过的命令。

**已验证**：写清「跑了什么命令 + 观察到什么结果」。例：

- `npm run build` 通过，无 error；仅有 index chunk 超过 500 kB 的体积告警。
- 浏览器打开 `/search?keyword=xxx`，顶栏输入框回填出关键词，控制台无新增报错。（这条要真的做过才能写）

**未验证**：把没做过但相关的项显式列出来，不要沉默。例：

- 后端服务未启动，`/api/videos/page` 的真实返回形状本次未对照 controller 复核。
- HLS 播放路径未验证（需要一个 status=3 且已转码的视频）。
- 移动端/管理端的同源逻辑未同步检查（不在本次范围）。

硬性禁令：

- **不要把没跑过的检查说成跑过。** 包括但不限于：「已通过类型检查」（不存在）、「测试通过」（不存在）、「lint 干净」（不存在）、「后端也验过了」（除非真的起了服务并调用）。
- 不要因为「代码看起来对」就写「已验证」。视觉判断不是验证。
- 无法验证时直说是阻塞在哪（后端没起、缺账号、缺数据），而不是含糊过去。
- 结论与证据分离：先给证据（命令/文件路径/行号），再给结论。
