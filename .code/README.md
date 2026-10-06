# vidora-web · AI 协作规范

**开始任何开发工作之前，必须先完整读完本目录下的四份规范（`agent-rules.md` / `coding-standards.md` / `requirements.md` 与本文件），再按下面的任务映射翻 `.code/skills/` 里对应的手册。** 这份要求适用于所有 AI 工具（Qoder / Codex / Cursor / Claude Code 等），不因工具而异。

本仓库**刻意不放根 `AGENTS.md`**：入口只留这一处，避免两份文件各说一套、改一处忘一处。

## 项目一句话

vidora 视频平台的 **Web 端**：Vue 3 + Vite + Element Plus + Pinia + Vue Router + hls.js，**源码是纯 JavaScript**，只服务普通观众（首页推荐流、搜索与联想、详情播放、评论、投稿上传、个人中心）。经网关 `/api` 调用 `../vidora-cloud` 后端，与 `vidora-mobile`、`vidora-admin` 共用同一套契约。

契约在本端**没有类型定义也没有类型门禁**：接口形状只写在 `src/api/*.js` 每个函数上方的注释里，唯一权威源是后端的 Controller / DTO / VO 与 `SQL/vidora_cloud.sql` 的列注释。

## 构建与验证命令

从 `package.json` 的 scripts 抄录，本项目**只有这三条**：

```bash
npm run dev        # vite，本地 5173，/api 代理到 VITE_GATEWAY（默认 http://localhost:8080）
npm run build      # vite build，产物在 dist/ —— 本端唯一的机械门禁
npm run preview    # vite preview --host
```

没有 lint、没有 test、没有 `typecheck`（曾为离线契约链路配过 `jsconfig.json` + `vue-tsc`，2026-10-06 随该链路一并撤掉）。`build` 只能证明代码能被 Vite 打包，**页面取数对不对、字段名是不是后端今天真的给的名字，它一概不知道** —— 所以交付前必须按 `skills/verify-in-browser.md` 在浏览器里真跑一遍。

## 目录速览

| 路径 | 职责 |
| --- | --- |
| `src/api/*.js` | 一个后端服务一个文件，每个导出函数上方注释真实路径、返回形状与已知坑 |
| `src/utils/request.js` | axios 实例：注入 JWT、拆 `ApiResult`、401/403 处理、toast 去重 |
| `src/store/*.js` | Pinia options 式 store：`user` / `theme` / `dict` |
| `src/views/*.vue` | 路由页面，`<script setup>` |
| `src/components/*.vue` | 纯展示组件，props 进 emit 出，不发请求 |
| `src/layouts/DefaultLayout.vue` | 顶栏 + 搜索框 + 内容区容器 + 字典预热 |
| `src/router/index.js` | 路由表与登录守卫 |
| `src/styles/main.css`, `src/styles/themes.css`, `src/config/themes.js` | CSS 变量主题引擎（三处需同步） |

## 四份规范各讲什么

| 文件 | 管什么 | 典型触发问题 |
| --- | --- | --- |
| `agent-rules.md` | AI 的行为纪律：动手前读什么、能跑哪些命令、什么操作必须先问、交付时怎么区分已验证与未验证 | 「我能不能直接装个包」「要不要先跑测试」「这话我能说成已验证吗」 |
| `coding-standards.md` | 代码怎么写才像本仓库作者写的：目录职责、命名、组件写法、状态与 API 调用、注释纪律、样式与主题 | 「这个组件该放 views 还是 components」「注释该写什么」「颜色该硬编码还是走变量」 |
| `requirements.md` | 需求侧边界：Web 端负责什么、跨端的事归谁、需求四段式怎么写、契约以后端 controller 为准、什么算完成 | 「这个字段前端自己算行吗」「这需求是不是该 admin 端做」 |

## 阅读顺序

第一次接触本仓库，按 `README.md`（本文）→ `agent-rules.md` → `coding-standards.md` → `requirements.md` 通读一遍。

之后的日常开发不必重读全文，按下面的任务映射只翻需要的那几节。

## 什么任务翻哪份 skill

| 任务 | 手册 |
| --- | --- |
| 加一个新的路由级页面（如「我的收藏」列表页） | `skills/add-a-page.md` |
| 接一个新接口，或改现有接口的参数/路径 | `skills/add-or-adjust-api-call.md` |
| 后端 VO/entity 加了字段，前端要展示；或怀疑某个字段名已经漂移 | `skills/consume-new-backend-field.md` |
| 改完任何东西，准备说「done」之前 | `skills/verify-in-browser.md` |
| 调主题色 / 加新主题 | 没有专门手册，看 `src/config/themes.js` 顶部注释 + `src/styles/themes.css` 顶部注释 + `index.html` 内联脚本，三处必须同步 |

## 这个目录本身也可以被修改

规范过期比没规范更危险。当你发现：

- 某条规范与实际代码冲突；
- 某个坑反复被不同人踩（包括你自己）；
- 某个手册的步骤缺了导致返工；

就直接改对应文件，并在改动处留下能让下一个人看懂为什么改的痕迹。但**改 `.code/` 下的内容属于新增/修改受控文档，先征求用户同意**。
