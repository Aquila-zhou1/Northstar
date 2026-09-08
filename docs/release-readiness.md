# Northstar 第八步：发布与安全检查手册

> 本步骤是 Vercel 部署前的发布门。自动检查负责构建和可静态证明的安全边界；浏览器检查负责运行期错误与网络请求内容。

## 1. 一条命令完成自动发布检查

在项目根目录运行：

```bash
npm run check:release
```

理想结果：命令退出码为 0，并依次出现以下结果：

```text
✓ built
PASS: only .env.example is tracked
PASS: tracked files contain no server-secret pattern
PASS: planner source has no legacy localStorage data path
PASS: public environment contract contains exactly two variables
PASS: browser build contains no server-secret pattern
PASS: Northstar release safety contract is intact
```

这条命令会阻断以下情况：私有 `.env` 被 Git 跟踪、仓库或浏览器包出现 Supabase secret/service-role 特征、`VITE_*` 包含服务端秘密、源码重新使用旧规划 `localStorage`、公开环境变量契约被扩张，以及正式构建失败。

`VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY` 本来就会进入浏览器包，这是 Supabase 的公开客户端设计，不是泄密。绝不能出现 `sb_secret_*`、service-role key、数据库密码或私钥。

## 2. 依赖安全审计

运行：

```bash
npm audit --audit-level=high
```

理想结果：

```text
found 0 vulnerabilities
```

审计结果会随 npm 安全数据库变化，应在每次正式部署前重新运行。任何 high 或 critical 漏洞都阻断部署；先评估并升级依赖，再重新构建与回归。

## 3. 浏览器控制台检查

1. 运行 `npm run dev` 并登录。
2. 按 `F12` 打开开发者工具的 **Console**。
3. 清空 Console，依次执行：刷新 `/app`、新建并编辑一条临时任务、拖拽、删除、退出。

理想结果：没有红色未捕获异常、Vue warning、失败的模块加载或无限重复请求。人为切换 Offline 时允许看到浏览器自身的网络失败记录，但页面必须按第七步显示可恢复错误。

## 4. 浏览器网络与密钥检查

1. 打开开发者工具的 **Network**，刷新 `/app`。
2. 选择发往 `*.supabase.co` 的请求，查看 Request Headers 和 Payload。
3. 在 **Sources** 全局搜索 `sb_secret_`、`service_role`、数据库密码。

理想结果：

- 请求只使用 publishable key 和当前登录用户的短期会话令牌。
- 不出现 service-role/secret key、数据库密码或其他用户邮箱与业务数据。
- Sources 搜索不到 `sb_secret_` 或 service-role 凭证。
- 未登录访问 `/app` 自动转到 `/login?redirect=/app`；业务表请求不会在未登录页面持续重试。

Authorization 中出现当前登录用户的 JWT 是正常的；它受过期时间和 RLS 约束。不要把完整令牌复制到聊天、Issue 或截图中。

## 5. Git 与构建产物检查

运行：

```bash
git status --short
git ls-files .env .env.local .env.example
```

理想结果：完成提交后 `git status --short` 没有输出；第二条命令只输出 `.env.example`。`dist/` 和 `.env.local` 均被忽略，不进入提交。

## 6. Node 版本门槛

当前依赖的 Vite 7 要求 Node `^20.19.0` 或 `>=22.12.0`。部署建议选择 Node 22 LTS；本机 Node 20.18 虽能完成当前构建，但其版本警告不应被当成长期生产基线。

Vercel 部署时，在项目设置中将 Node.js Version 设为可用的 Node 22 版本。若平台选项版本发生变化，以 Vercel 当前支持且满足 Vite 要求的 Node 22 版本为准。

## 7. 第八步通过标准

- [ ] `npm run check:release` 全部 PASS。
- [ ] `npm audit --audit-level=high` 返回 0 个漏洞。
- [ ] Console 正常用户旅程没有红色应用错误或 Vue warning。
- [ ] Network/Sources 只暴露允许公开的 publishable key，不含服务端秘密。
- [ ] 未登录 `/app` 被保护且没有业务请求循环。
- [ ] Git 只跟踪 `.env.example`，工作区在提交后干净。
- [ ] Vercel 将使用满足 Vite 要求的 Node 22。

全部通过后进入第九步：连接 GitHub、配置 Vercel 环境变量和 Supabase URL，再执行正式部署。
