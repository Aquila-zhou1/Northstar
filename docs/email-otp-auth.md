# Northstar 邮箱验证码认证：配置与验收手册

> 实现范围：Supabase 邮箱 OTP、注册/登录/验证页面、会话恢复、受保护路由、重发冷却、退出登录。
> 非本步骤范围：规划数据仍由本地 Repository 提供；第六步才切换到用户隔离的 Supabase 表。

## 1. 路由与行为

| 路由 | 用户意图 | 关键安全行为 |
|---|---|---|
| `/signup` | 新用户申请验证码 | `shouldCreateUser: true`，允许创建 Auth 用户 |
| `/login` | 已有用户申请验证码 | `shouldCreateUser: false`，不存在的邮箱不能被隐式注册 |
| `/verify?intent=…&email=…&redirect=…` | 输入六位 OTP | 缺少合法 intent/email 时返回 `/login`；成功后只接受站内 redirect |
| `/app` | 规划工作台 | `requiresAuth: true`；未登录跳转 `/login?redirect=/app` |
| `/` | 入口 | 最终解析到受保护工作台，再按会话决定登录或进入应用 |

会话由 Supabase Client 持久化并自动刷新。页面启动时先读取现有 Session，路由守卫完成判断后再进入目标页面，避免未登录者短暂看到工作台。

## 2. 环境变量与密钥边界

- `.env.local`：真实 Supabase URL 和 Publishable Key，仅本地使用并被 Git 忽略。
- `.env.example`：只包含变量名称和占位值，可提交。
- `VITE_*` 会进入浏览器构建产物，因此只能放公开客户端配置。
- `sb_secret_*`、旧 `service_role`、数据库密码不得写入任何 `VITE_*` 变量。

当前公开 Auth 设置只读检查结果：Email Provider 已启用、Signup 未禁用、Mailer Autoconfirm 为 false，满足邮箱验证前提。

## 3. Supabase 邮件模板必须配置

Supabase 的 `signInWithOtp` 默认可能发送 Magic Link。Northstar 页面要求用户输入六位数字，因此需要在 Supabase Dashboard 配置：

1. Authentication → Email Templates。
2. 打开 Magic Link 模板。
3. 确保正文包含 `{{ .Token }}`，而不是只提供 `{{ .ConfirmationURL }}`。
4. 邮件中清楚说明验证码用途和有效期，不要同时放会绕过输入页的登录链接。
5. 保存模板。

最小正文示意：

```html
<h2>Your Northstar verification code</h2>
<p>Enter this six-digit code to continue:</p>
<p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">{{ .Token }}</p>
```

还应在 Authentication → URL Configuration 中设置本地 Site URL（开发时通常为 `http://localhost:5173`）；正式 Vercel URL 在第九步加入。

## 4. 本地执行

```text
npm install
npm run dev
```

打开开发服务器显示的本地地址。若 5173 被占用，以终端实际显示端口为准。

## 5. 完整人工测试及理想结果

### A. 未登录路由保护

1. 使用无痕窗口打开 `/app`。
2. 观察最终 URL 和页面。

理想结果：跳转到 `/login?redirect=/app`；页面只显示登录表单，不显示规划内容。

### B. 登录不存在用户不得创建账号

1. 在 Authentication → Users 记录当前用户数量。
2. 打开 `/login`，输入一个从未注册且由你控制的邮箱。
3. 点击 Send verification code。
4. 刷新 Users 列表。

理想结果：页面显示无法发送验证码的通用错误；该邮箱收不到登录码；Users 数量不变，不出现该邮箱。

### C. 新用户注册

1. 打开 `/signup`，输入一个全新且可收件的邮箱。
2. 点击 Send verification code。

理想结果：按钮发送期间禁用并显示 Sending；成功后进入 `/verify`；页面回显目标邮箱；邮箱收到六位数字；Authentication → Users 出现该用户。

### D. 错误验证码

1. 在 `/verify` 输入错误的六位数字并提交。

理想结果：保持在验证页；不进入 `/app`；显示“验证码无效或过期”；Supabase 不创建有效 Session。

### E. 正确验证码与会话恢复

1. 输入邮件中的正确验证码。
2. 登录后刷新页面。
3. 关闭标签页，再从同一浏览器打开 `/login`。

理想结果：首次验证成功进入 `/app`；顶部显示登录邮箱和 Log out；刷新仍留在 `/app`；已有会话访问 `/login` 会自动回到 `/app`。

### F. 重发倒计时

1. 注册或登录发码后观察验证页。
2. 在 60 秒内尝试重发。
3. 倒计时结束后点击 Resend code。

理想结果：60 秒内按钮禁用并逐秒倒计时；结束后可点击；成功显示已发送提示并重新从 60 秒计时；连续请求不会绕过 Supabase 限流。

### G. 退出登录

1. 在 `/app` 点击 Log out。
2. 再直接访问 `/app`。

理想结果：退出后进入 `/login`；再次访问 `/app` 仍被拦截；页面不再显示用户邮箱。

### H. 注册/登录语义复核

1. 已注册用户通过 `/login` 获取验证码并登录。
2. 退出。
3. 新邮箱只通过 `/signup` 注册。

理想结果：已有用户可登录；新邮箱不能通过 Login 偷偷创建；Signup 才增加 Auth 用户。

## 6. 自动与静态验证结果

- 正式 Vite 构建通过。
- `/app` 未登录重定向验证通过。
- `/verify` 缺少必要参数时返回 `/login`。
- `/signup` 与 `/login` 页面渲染正常。
- Supabase 公开 Auth 设置确认邮箱 Provider 开启、注册允许、邮件不自动确认。
- 未自动发送真实验证码：发送邮件和创建账号留给人工端到端测试，避免使用未经指定的邮箱产生外部副作用。

## 7. 第五步发布门

- [ ] 邮件模板使用 `{{ .Token }}` 并能收到六位数字。
- [ ] A–H 全部符合预期。
- [ ] Login 不创建不存在用户。
- [ ] 正确 OTP 建立并恢复 Session。
- [ ] 退出后受保护路由不可访问。
- [ ] 浏览器控制台无认证相关未处理错误。
- [ ] Git 中不存在 `.env.local`、secret key 或 service-role key。

全部通过后进入第六步：用 Supabase Repository 替换 `localStorage`，并验证两个登录用户看到各自独立的规划数据。
