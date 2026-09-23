# blog-frontend

DevLog 个人博客的**前端**：Vue 3.4 + Vite 5 + Ant Design Vue 4。
只管界面与交互——不碰数据库，所有数据都来自后端接口。

后端在 [blog-backend](https://github.com/muning0214/blog-backend)。

## 技术栈

| 用途 | 选型 |
|---|---|
| 框架 | Vue 3.4（`<script setup>` 组合式 API） |
| 构建 | Vite 5 |
| 组件库 | Ant Design Vue 4（按需注册，见 `main.js`） |
| 路由 | vue-router 4（history 模式） |
| 请求 | Axios（统一封装在 `api/request.js`） |
| 状态 | 不用 pinia：一个 `reactive` 对象装在 `store/user.js` |
| Markdown | marked 12 解析 → DOMPurify 消毒 → 写入 DOM → highlight.js 高亮 |
| 时间 | dayjs |

## 目录结构

```
src/
├── main.js                 创建应用，按需注册 antd 组件
├── App.vue                 ConfigProvider：把 antd 主题对齐站点配色
├── api/                    按域拆分，request.js 是唯一的 axios 封装
│   ├── request.js          令牌注入 · 拆统一响应体 · 401 处理 · assetUrl
│   ├── auth.js  article.js  tag.js  settings.js  file.js
├── store/user.js           登录态 + ensureLoaded/login/logout
├── router/index.js         路由表 + 守卫（未登录重定向到 /login）
├── composables/            useTheme · useSiteSettings · useDocumentTitle
├── utils/
│   ├── markdown.js         解析 + 消毒 + 高亮 + 代码块外壳 + 目录
│   ├── format.js           日期 · 相对时间 · 字节 · 阅读时长 · slug
│   └── oauthPending.js     记录「这次 OAuth 是登录还是绑定」
├── components/             BlogLayout · AdminLayout · MarkdownView · ArticleCard
│                           ArticleRow · PageState · CoverImage · TagPill
├── views/
│   ├── blog/               首页 · 文章列表 · 文章详情 · 标签 · 关于
│   ├── admin/              工作台 · 编辑器 · 账号
│   ├── Login.vue  GithubCallback.vue  NotFound.vue
└── assets/main.css         全部样式（纯 CSS，含深浅两套主题变量）
```

## 快速启动

**先起后端**（前端所有数据都来自它，后端没起页面会是空的）：

```bash
cd blog-backend && mvn spring-boot:run
```

然后：

```bash
npm install
npm run dev        # http://localhost:5173
```

开发期 Vite 把 `/api` 与 `/uploads` 都代理到 `http://localhost:8080`，
所以代码里统一用相对路径，**没有任何环境相关的接口地址配置**。

生产构建：`npm run build` → `dist/`，交给 Nginx 托管，
由它把 `/api` 与 `/uploads` 反向代理到后端（与开发期的行为一致）。

## 页面与路由

| 路由 | 页面 | 需要登录 |
|---|---|---|
| `/` | 首页：精选位 + 最新文章 + 标签云 | 否 |
| `/articles` | 文章列表：搜索、按标签筛选、分页（状态在 URL query 里，可分享） | 否 |
| `/article/:slug` | 文章详情：Markdown 渲染 + 代码高亮 + 目录 + 上下篇 + 相关文章 + 附件下载 | 否 |
| `/tags` | 标签云 + 统计表 | 否 |
| `/about` | 关于页（正文可在工作台里用 Markdown 改写） | 否 |
| `/login` | 登录 / 注册 / GitHub 登录 | 否 |
| `/auth/github/callback` | GitHub 授权回调中转页 | 否 |
| `/admin/dashboard` | 工作台：文章管理 / 站点设置 / 标签管理 | **是** |
| `/admin/article/edit`、`/admin/article/edit/:id` | Markdown 编辑器 | **是** |
| `/admin/account` | 登录方式与密码 | **是** |

## 与后端的约定

这是对接时最容易踩的部分，集中写在这里。

**统一响应体**：`{ code, message, data }`，`api/request.js` 里的拦截器会把 `data` 直接
交给调用方，所以业务代码拿到的就是数据本身。**失败时后端返回真实 HTTP 状态码**，
前端按状态码判断而不是看 `code` 字段——这一点很关键，见下方「401 处理」。

**⚠️ 请求体字段必须用 snake_case**：后端开了 Jackson 的 `SNAKE_CASE` 策略，
它同时作用于序列化与反序列化。请求体写成驼峰（`coverPath`）**不会报错，
而是被当成字段没传静默丢弃**。真实踩过两次：

- 封面上传成功，保存后却没了
- 改密码永远提示「请输入新密码」

多词字段：`cover_path`、`old_password` / `new_password`、
`site_name` / `author_name` / `author_bio` / `about_md`。

**对象键 vs 访问地址**：数据库里存的是对象键（`covers/ab12.png`），不是完整 URL。
展示前用 `assetUrl()`（在 `api/request.js`）解析成 `/uploads/...`。
将来换域名或加 CDN 时老数据一行都不用改。

**令牌**：存 `localStorage` 的 `devlog_token`，由请求拦截器注入 `Authorization`。

## 关键设计说明

**401 处理放在拦截器里，不放在页面里**
令牌失效必须由拦截器统一清掉本地凭据并回调 `router` 跳登录页。
只要有一个页面"忘了处理 401"，用户就会停在一个每个操作都失败的后台页面上。
路由守卫则负责拦「未登录访问受保护页面」，两件事分开管。

**登录态的唯一依据是「当前用户对象」，不是「localStorage 里有没有令牌」**
令牌可能已经过期或被吊销。只看它存在会让守卫误判为已登录。

**为什么不用 pinia**
只有一个用户对象要共享，`reactive` + 模块级函数足够了。
引入状态库会让「读一次用户」这种事多出一层样板代码。

**MarkdownView 的时序（踩过坑）**
`marked` 解析 → `DOMPurify` 消毒 → `v-html` 写入 DOM → **再**对已落地的节点套代码块外壳、
做高亮、抽目录。高亮必须在 DOM 之后做，否则既躲不开 marked 各版本的 renderer 签名差异，
也会被消毒器把高亮产生的 class 清掉。

而那个「再」字有陷阱：`watch(..., { immediate: true })` 的回调是**同步**执行的，
此刻组件还没挂载、`ref` 是 null，后处理会被整个跳过（编译通过、页面也正常渲染，
只是代码块没有外壳、没有高亮、目录空白）。正确写法是 `onMounted` 里跑一次，
watcher 只负责后续变化并配 `flush: 'post'`。

**为什么用了 antd 还自己写 CSS**
`assets/main.css` 是整套设计（布局、文章卡片、编辑器、Markdown 排版、深浅两套主题变量）。
antd 只用在「表单、反馈、浮层」这类交互密集件上：`Form` / `Input` / `message` /
`Modal` / `Tabs` / `Select` / `Switch` / `Spin` / `Empty` / `Result` / `Dropdown` / `Drawer`。
`App.vue` 里用 `ConfigProvider` 把 antd 的主色与圆角对齐站点变量，两边观感才是一套。

另外 antd 有个默认行为要关掉：它会在**两个汉字的按钮文案中间插空格**
（「发布」渲染成「发 布」），既破坏排版也让按文案找元素的测试失效。
关它的属性是 ConfigProvider **顶层**的 `auto-insert-space-in-button`，
放进 `theme` 对象里不生效（ant-design-vue 4 用这个旧名，antd 5 才改名 `button.autoInsertSpace`）。

**主题**：`composables/useTheme.js` 用模块级状态，改的是 `<html data-theme>`；
`index.html` 里内联了一段脚本在首屏之前就把主题定下来，避免闪一下浅色再变深色。

## 常见问题

**页面能打开但列表是空的、登录报「连不上后端服务」**
后端没起。前端所有数据都来自后端，先确认 <http://localhost:8080/api/articles> 能返回 JSON。

**上传的图片 404**
`vite.config.js` 里的 `/uploads` 代理丢了，或者后端没在 8080。

**GitHub 登录按钮不显示**
后端没配置 GitHub 登录——接口返回 `enabled: false`，前端据此把入口藏起来。
这是刻意的降级，比让用户点下去再弹「未配置」好。配置方法见 [后端 README](https://github.com/muning0214/blog-backend)。

**登录后过一段时间操作全部报错**
令牌默认 24 小时过期。过期后拦截器会清掉本地令牌并跳回登录页，
按预期应该看到「登录已过期，请重新登录」。
