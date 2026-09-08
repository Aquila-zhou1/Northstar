# Northstar 第一阶段：架构、路由与交付基线

> 状态：Vue 重构、Supabase Schema、RLS、邮箱 OTP、云端 Repository、完整页面状态与自动发布检查已建立；Vercel 部署尚未实施。本文是第一阶段的人类可读实施契约，后续代码与验收以本文为准。

## 1. 第一阶段目标与完成定义

将当前单浏览器、单份 `localStorage` 数据的规划工具改造成支持邮箱验证码登录的多用户 Web 应用。完成时必须满足：

1. 提供独立的注册、登录、验证码页面；认证方式为邮箱六位 OTP，不设置密码。
2. 未认证访问者不能进入规划工作台；会话刷新后可恢复；退出后立即失去业务数据访问权。
3. 项目、里程碑、任务保存到 Supabase PostgreSQL；换浏览器登录同一账号仍可读取。
4. 数据隔离由数据库 RLS 强制保证，而非仅依赖前端过滤；用户 A 无法以任何公开客户端请求访问用户 B 的行。
5. 保留当前规划工作台全部能力：任务/里程碑增删改、拖拽状态、搜索、里程碑筛选、进度和逾期计算、重置确认。
6. Vercel 正式环境可访问，认证回调正确，刷新任意前端路由不产生 404；仓库和客户端产物不包含服务端秘密。

本阶段不包含 DeepSeek、团队协作、多项目切换 UI、自定义 SMTP、旧 `localStorage` 自动迁移、账号注销、导入导出和自动备份。

## 2. 改造前行为基线

### 2.1 用户可见基线

| 能力 | 基线行为 | 必须保留的验证 |
|---|---|---|
| 初始数据 | 1 个项目、3 个里程碑、7 个任务 | 首次进入可看到完整示例工作区 |
| 任务管理 | 新建、编辑、删除；字段含名称、里程碑、状态、优先级、截止日、备注 | 保存后卡片及统计同步变化 |
| 状态流转 | 卡片可拖入 Planned / In progress / Review / Done | 目标列数量和总进度同步变化 |
| 里程碑 | 新建、编辑；仅无任务且非最后一个时可删除 | 有关联任务时删除入口受限 |
| 聚焦与检索 | 点击里程碑聚焦；下拉筛选；按任务名或里程碑名搜索 | 四列仅显示命中任务，统计列数量正确 |
| 指标 | 完成率、完成/剩余、七日内到期数、里程碑进度、逾期提示 | 任务变化后指标自动重算 |
| 持久化 | 使用键 `northstar-planner-v1` 写入浏览器 `localStorage` | 刷新后保留；重置恢复默认数据 |
| 响应式 | 桌面双栏概览；窄屏看板和里程碑横向滚动 | 320px 宽度不阻断核心操作 |

### 2.2 技术基线

- 改造前：Vite + 原生 JavaScript + 单一 `src/main.js` 命令式渲染 + 全局 CSS。
- 改造后当前状态：Vue 3 + Vue Router；页面、领域逻辑、状态编排与持久化适配器分层。
- 当前持久化为 Supabase 关系表；`localStorage` 数据路径已移除，不执行隐式旧数据迁移。
- `/app` 已设置 `requiresAuth: true` 并由全局路由守卫保护。

## 3. 目标架构与依赖方向

```text
Vue View / Components
        │ 用户意图、展示状态
        ▼
usePlanner compos/usePlanner composable
        │ 业务动作与响应式状态
        ▼
Planner repository contract
        │ 当前：Supabase row-level CRUD + lifecycle RPC
        ▼
Supabase Data API + PostgreSQL RLS

Vue Router ── auth guard ── Supabase Auth session
```

依赖只能自上而下：组件不得直接调用 Supabase；领域模块不得依赖 Vue；Repository 不负责展示 Toast；路由守卫不读取业务表。这样切换数据源、测试业务规则或增加 DeepSeek 服务时不会重写 UI。

## 4. 当前源码职责

| 路径 | 单一职责 | 禁止承担 |
|---|---|---|
| `src/main.js` | 创建 Vue 应用并注册路由 | 业务状态、DOM 拼接 |
| `src/App` | 根路由出口 | 规划业务逻辑 |
| `src/router/index.js` | 路由表与认证守卫 | 数据库 CRUD |
| `src/domain/planner.js` | 默认数据、状态配置、纯计算、ID/日期规则 | Vue API、网络请求 |
| `src/services/plannerRepository.js` | Supabase 行级 CRUD、工作区初始化与重置适配 | Toast、弹窗、路由跳转 |
| `src/composables/usePlanner.js` | 聚合响应式状态、筛选和用户业务动作 | HTML 与视觉细节 |
| `src/views/PlannerView.vue` | 页面级编排与弹窗生命周期 | 数据源细节 |
| `src/components/*` | 可复用展示及局部交互 | 全局会话和跨页导航 |
| `src/style.css` | 延续既有视觉系统和响应式规则 | 数据与授权判断 |

## 5. 第一阶段目标路由契约

| 路径 | 含义 | 访问规则 | 成功出口 | 失败/边界 |
|---|---|---|---|---|
| `/` | 应用入口，不承载页面 | 根据会话重定向 | 已登录到 `/app`；否则到 `/login` | 会话检测期间显示启动态，禁止短暂泄露工作台 |
| `/signup` | 新用户注册发码 | 仅游客；已登录转 `/app` | 发码成功到 `/verify?intent=signup&email=…` | 邮箱格式、限流、服务错误使用通用安全提示 |
| `/login` | 已存在用户登录发码 | 仅游客；已登录转 `/app` | 发码成功到 `/verify?intent=login&email=…` | 必须设置 `shouldCreateUser: false`，不能把登录变成隐式注册 |
| `/verify` | 提交六位邮箱 OTP | 必须带合法 `intent` 与 email；已登录转 `/app` | 验证成功建立会话并到 `/app` | 支持过期、错误、重发倒计时和返回修改邮箱 |
| `/app` | 当前规划工作台 | `requiresAuth: true` | 读取当前用户默认项目 | 未登录转 `/login?redirect=/app`；加载、空数据和失败态互斥 |
| `/:pathMatch(.*)*` | 未知地址 | 无 | 按会话返回 `/app` 或 `/login` | 不展示独立 404，第一阶段保持最短路径 |

路由查询参数只用于短期导航上下文，不作为授权依据。`email` 可用于回显，但数据库权限只能来自经 Supabase 验证的会话。后续若增加多项目，使用 `/app/projects/:projectId`，且 `projectId` 仍必须通过 RLS 校验所有权。

## 6. 目标认证状态机

```text
unknown（应用启动）
  ├─ session 有效 → authenticated → /app
  └─ 无 session → anonymous → /login 或 /signup

anonymous → requestOtp → codeSent → verifyOtp
  ├─ 成功 → authenticated
  ├─ 错误/过期 → codeSent（可重试）
  └─ 重发 → cooldown → codeSent

authenticated → signOut → anonymous
session expired → anonymous + redirect 保存原目标
```

硬性要求：启动时完成一次会话恢复后才渲染受保护页面；监听认证事件以处理跨标签页退出；所有异步提交防重复；错误文案不暴露不必要的账号存在信息；OTP 重发按钮体现剩余冷却时间。

## 7. 目标数据库模型

### `projects`

- `id uuid primary key`
- `owner_id uuid not null references auth.users(id) on delete cascade`
- `name text not null`
- `description text not null default ''`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- 第一阶段 UI 默认每用户一个项目；模型不施加单项目限制，为未来扩展保留空间。

### `milestones`

- `id uuid primary key`
- `project_id uuid not null references projects(id) on delete cascade`
- `name text not null`
- `target_date date not null`
- `sort_order integer not null`
- 审计时间字段同上。

### `tasks`

- `id uuid primary key`
- `project_id uuid not null references projects(id) on delete cascade`
- `milestone_id uuid not null`
- `title text not null`
- `status text not null check in ('planned','progress','review','done')`
- `priority text not null check in ('High','Medium','Low')`
- `due_date date null`、`notes text not null default ''`、`sort_order integer not null`
- 审计时间字段同上。
- 数据库必须保证任务的 `milestone_id` 属于同一个 `project_id`，避免跨项目关联。

索引至少覆盖 `projects(owner_id)`、`milestones(project_id, sort_order)`、`tasks(project_id, status, sort_order)` 和 `tasks(milestone_id)`。

## 8. RLS 安全契约

每张公开业务表都必须启用 RLS，并只向 `authenticated` 授予实际需要的 CRUD；`anon` 不得拥有业务表访问权。

- `projects`：`owner_id = auth.uid()` 才能 select/update/delete；insert 必须 `owner_id = auth.uid()`。
- `milestones`：其 `project_id` 对应项目的 `owner_id = auth.uid()` 才能 CRUD。
- `tasks`：其 `project_id` 对应项目的 `owner_id = auth.uid()` 才能 CRUD；写入时同时校验里程碑归属。
- 前端只配置 Supabase URL 与 publishable key；secret/service-role key不得进入 `VITE_*`、Git、客户端请求或构建产物。

发布门：使用用户 A/B 真实会话分别验证 select/insert/update/delete；B 已知 A 的 UUID 时仍应得到空结果或权限错误。任何一项越权均阻断部署。

## 9. Repository 替换契约

下一步新增 Supabase repository，向 composable 提供稳定能力：

- `loadWorkspace(userId)`：读取用户默认项目及有序子项；不存在时原子化创建示例工作区。
- `create/update/deleteTask`、`moveTask`。
- `create/update/deleteMilestone`。
- `resetWorkspace`：明确事务边界；失败不得留下半套示例数据。

不得继续采用“每次改动覆盖整份 state JSON”的云端实现。每个动作只修改对应行，返回数据库确认后的记录；乐观更新若失败必须回滚并提示。首次发布不自动上传现有本地数据，防止共享设备的数据被错误绑定到当前邮箱。

## 10. 部署契约

1. GitHub 主分支连接 Vercel；预览部署用于回归，正式部署指向生产环境。
2. Vercel 公开变量仅含 `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`。
3. Supabase Site URL 设置为正式域名；Redirect URLs 至少允许本地开发地址和 Vercel 正式地址，预览域名应使用最小必要范围。
4. SPA history fallback 必须覆盖 `/signup`、`/login`、`/verify`、`/app` 的直接刷新。
5. 发布后执行线上完整路径：注册 → 验证 → 自动初始化 → CRUD → 刷新 → 退出 → 再登录 → 跨用户隔离。
6. 回滚以 Vercel 上一稳定部署和可逆数据库 migration 为单位；破坏性 schema 变更不得与前端一次性无回滚发布。

## 11. 分阶段验收清单

### 已完成：改造基线与 Vue 重构

- [x] 原始功能和数据契约已记录。
- [x] Vue 3 与 Vue Router 作为运行依赖。
- [x] `/` 重定向 `/app`；工作台成为路由视图。
- [x] 领域纯函数、Repository、Composable、View、Components 分层。
- [x] Vue 重构阶段曾保留原 `localStorage` 键以完成回归；云端接入后已移除正式读写路径。
- [x] 正式构建通过；浏览器桌面交互回归通过，控制台无错误。
- [ ] 移动端视口回归（在认证页面加入后统一执行，避免重复验收）。

### 后续：认证与数据库

- [x] Supabase 环境和变量配置。
- [x] Schema migration：表、关系约束、字段约束、索引和更新时间触发器。
- [x] 三张业务表启用 RLS，客户端角色默认锁闭。
- [x] Schema 契约测试与人工验证手册。
- [x] Schema migration 在目标 Supabase 项目执行并通过契约测试。
- [x] `authenticated` 最小 grants 与 12 条用户隔离 RLS policies。
- [x] RLS 结构契约测试与双用户 CRUD 隔离测试。
- [x] RLS migration 在目标项目执行并通过两层测试。
- [x] Supabase Client、Auth 会话状态与路由守卫。
- [x] `/signup`、`/login`、`/verify` 邮箱 OTP 页面。
- [x] 注册/登录创建语义、六位码校验、重发冷却和退出入口。
- [x] 邮件模板配置；注册、错误码、正确码和退出路径人工抽查通过。
- [x] Auth store、启动会话恢复和路由守卫。
- [x] 注册/登录/验证 UI 及 OTP 错误状态。
- [x] Supabase repository 替换本地 repository。
- [x] 首次初始化与重置使用数据库原子化 RPC。
- [x] 云端 CRUD、跨浏览器一致性和 A/B 隔离人工验收。
- [x] A/B 用户隔离测试。
- [x] 首次加载、加载失败与重试状态。
- [x] 保存中防重复提交、失败保留表单与明确错误提示。
- [x] 空工作区恢复入口与会话失效回登录页。
- [ ] 第七步页面状态人工验收。
- [x] 正式构建、依赖审计、密钥与旧数据源自动安全检查。
- [ ] 第八步浏览器控制台与网络请求人工抽查。
- [ ] Vercel 预览与生产部署、线上冒烟测试。

## 12. 工程决策记录

1. **现在迁移 Vue，而不是认证后再迁移**：当前应用较小；先建立组件和数据边界，可避免 Supabase 逻辑继续堆入命令式单文件。
2. **暂不引入 Pinia**：第一阶段只有认证与单工作区两类状态，Composable 足够；出现跨多视图复杂缓存时再评估。
3. **迁移期间曾保留 Repository 接口下的 `localStorage`**：重构与数据迁移因此可以分别验证；第六步已由 Supabase 实现替换并移除正式读写路径。
4. **采用 Vue Router history 模式**：URL 语义清晰；部署必须提供 SPA fallback。
5. **数据库关系化而非整份 JSON**：支持 RLS、单行更新、AI 结构化建议和未来多项目，且避免并发覆盖整份规划。
6. **授权落在数据库**：前端守卫仅改善体验，RLS 才是安全边界。

## 13. 环境与已知风险

- Vite 7 当前要求 Node `^20.19.0` 或 `>=22.12.0`；本机检测为 `20.18.0`。虽然开发服务器可能启动，持续构建前应升级到 Node 22 LTS 并在 CI 固定版本。
- Supabase 内置邮件适合 MVP，但存在项目级发信/OTP 限流和送达率风险；公开推广前应配置自定义 SMTP。
- Vercel Hobby 仅适合个人非商业用途；若项目产生商业用途，应切换符合其条款的方案。
- 免费 Supabase 项目可能因低活跃暂停，且免费层不提供生产级备份保证；上线后需记录恢复策略。
