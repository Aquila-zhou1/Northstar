# Northstar 用户隔离：部署与验收手册

> 对应 migration：`supabase/migrations/20260907170000_add_user_isolation_policies.sql`  
> 结构测试：`supabase/tests/002_rls_policy_contract.sql`  
> 双用户功能测试：`supabase/tests/003_rls_two_user_isolation.sql`

## 1. 安全模型

用户隔离由两层共同执行：

1. **GRANT**：`anon` 对三张业务表无权限；`authenticated` 仅有 SELECT/INSERT/UPDATE/DELETE，没有管理 Schema、执行秘密函数或绕过 RLS 的权限。
2. **RLS Policy**：登录用户即使拥有 CRUD 权限，也只能访问 `auth.uid()` 对应 owner 的项目以及该项目下的里程碑和任务。

前端路由守卫只能避免误入页面，不是安全边界。Publishable Key 允许公开；用户 JWT 表示当前身份；数据库根据 JWT 的 `sub` 得到 `auth.uid()` 并逐行执行策略。

## 2. 策略矩阵

| 表 | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `projects` | `owner_id = auth.uid()` | 新行 owner 必须等于当前用户 | 旧行和新行 owner 都必须等于当前用户，禁止转移所有权 | 只能删除自己的项目 |
| `milestones` | 所属项目必须归当前用户 | 只能写入自己的项目 | 更新前后所属项目都必须归当前用户 | 只能删除自己项目内的里程碑 |
| `tasks` | 所属项目必须归当前用户 | 只能写入自己的项目 | 更新前后所属项目都必须归当前用户 | 只能删除自己项目内的任务 |

任务引用的里程碑是否属于同一项目，继续由第三步创建的复合外键保证。RLS 负责“项目属于谁”，外键负责“任务、里程碑、项目是否一致”。

## 3. 在 Supabase 部署

1. 打开项目 → SQL Editor → New query。
2. 完整复制 `20260907170000_add_user_isolation_policies.sql`。
3. 一次性运行，不要只选择部分语句。

理想结果：`Success. No rows returned`，Table Editor 中三个表仍显示 RLS Enabled；每张表出现 4 条策略，总计 12 条。

策略名称应为：

- `projects_select_own`、`projects_insert_own`、`projects_update_own`、`projects_delete_own`
- `milestones_select_own_project`、`milestones_insert_own_project`、`milestones_update_own_project`、`milestones_delete_own_project`
- `tasks_select_own_project`、`tasks_insert_own_project`、`tasks_update_own_project`、`tasks_delete_own_project`

不要对同一项目重复执行 migration；重复创建同名 Policy 会报错。

## 4. 第一层测试：策略结构契约

在 SQL Editor 新建查询，完整复制 `002_rls_policy_contract.sql` 并运行。

理想结果：

```text
PASS: Northstar RLS policy contract is intact
```

测试同时验证：

- 三表 RLS 均开启。
- `anon` 对所有表的 CRUD 均为 false。
- `authenticated` 对所有表的 CRUD 均为 true。
- 12 条策略的表、操作和 authenticated 角色完全匹配。
- 没有向 `anon`/`public` 开放的 Policy。
- SELECT/DELETE 有 `USING`，INSERT 有 `WITH CHECK`，UPDATE 两者都有。

若出现任何 exception，停止后续接入；异常文本会指出缺失权限、缺失 Policy 或不完整谓词。

## 5. 第二层测试：两个真实身份的功能隔离

只在空白测试项目或尚无真实业务数据的当前项目执行。

### 准备

进入 Authentication → Users，确保至少存在两个测试用户。此测试自动选择创建时间最早的两个用户作为 A/B，不需要把 UUID 粘贴进脚本。若不足两个，脚本会明确报错：

```text
TEST SETUP: create at least two users in Authentication > Users
```

### 执行

在 SQL Editor 新建查询，完整复制 `003_rls_two_user_isolation.sql` 并运行。脚本会：

1. 以管理员身份在事务内为 A/B 各创建项目、里程碑和任务。
2. 模拟用户 A 的 authenticated JWT 身份。
3. 验证 A 只能读取 A 的三类记录。
4. 验证 A 能对自己的三类记录 INSERT/UPDATE/DELETE。
5. 验证 A 不能为 B 创建数据，也不能更新或删除 B 的数据。
6. 切换到用户 B，验证 B 只能读取 B 的记录且未被 A 修改。
7. `ROLLBACK` 全部测试数据和修改。

理想最终结果：

```text
PASS: two-user SELECT/INSERT/UPDATE/DELETE isolation is intact
```

理想日志还包含：

- `PASS: user A SELECT sees only user A rows`
- `PASS: project INSERT/UPDATE/DELETE enforce ownership`
- `PASS: milestone INSERT/UPDATE/DELETE enforce project ownership`
- `PASS: task INSERT/UPDATE/DELETE enforce project ownership`
- `PASS: user B sees only user B rows...`

执行后刷新 Table Editor，不应存在名为 `RLS fixture A`、`RLS fixture B` 的项目，因为事务已回滚。

## 6. 匿名访问验证

第四步部署后，使用 Publishable Key 但不提供用户 Access Token 请求 REST API，预期收到权限错误（通常为 HTTP 401/403），而不是业务数据。

PowerShell 示例：

```powershell
$headers = @{
  apikey = '<YOUR_PUBLISHABLE_KEY>'
}

Invoke-WebRequest `
  -Uri 'https://<YOUR_PROJECT_REF>.supabase.co/rest/v1/projects?select=*' `
  -Headers $headers
```

理想效果：命令报告未授权或权限不足。若返回 HTTP 200 且含项目数据，立即停止前端接入并复查 anon grants 与 Policy roles。

## 7. 第四步发布门

以下项目必须全部满足：

- [ ] RLS migration 显示成功。
- [ ] 三表各有 4 条 Policy，共 12 条。
- [ ] `002_rls_policy_contract.sql` 返回 PASS。
- [ ] 两个测试用户存在时，`003_rls_two_user_isolation.sql` 返回 PASS。
- [ ] 测试结束没有 fixture 数据残留。
- [ ] 匿名 REST 请求被拒绝。
- [ ] 仓库中不存在 secret/service-role key。

全部通过后才进入第 5 步邮箱验证码认证。第 5 步会让真实浏览器获得 authenticated JWT，但不会改变本步骤建立的数据安全边界。
