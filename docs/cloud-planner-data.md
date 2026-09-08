# Northstar 云端规划数据：部署与验收手册

> 数据实现：`src/services/plannerRepository.js`
> 数据库 migration：`supabase/migrations/20260907183000_add_workspace_lifecycle_functions.sql`
> 数据库契约测试：`supabase/tests/004_workspace_lifecycle_contract.sql`

## 1. 本步骤的数据契约

- 登录用户只加载自己的默认项目；RLS 仍是最终安全边界。
- 用户没有默认项目时，`initialize_user_workspace()` 在一个数据库事务内创建 1 个项目、3 个里程碑和 7 个任务。
- `projects.is_default` 加部分唯一索引，保证每个用户最多一个默认项目；并发刷新不会创建重复工作区。
- 页面 CRUD 只修改对应数据库行，不再保存整份 JSON。
- 重置调用 `reset_user_workspace(project_id)`，删除旧子项并重建示例数据；任一步失败时整个事务回滚。
- 旧浏览器 `localStorage` 不自动迁移、不再读取，也不会覆盖云端数据。

## 2. 前端字段映射

| 页面字段 | 数据库字段 |
|---|---|
| `projectId` | `projects.id` |
| `projectName` | `projects.name` |
| `projectDescription` | `projects.description` |
| `milestone.date` | `milestones.target_date` |
| `task.milestoneId` | `tasks.milestone_id` |
| `task.due` | `tasks.due_date` |

Repository 是唯一知道 snake_case 数据库字段的前端模块；组件和 Composable 继续使用既有 camelCase 领域结构。

## 3. 部署数据库生命周期 Migration

在 Supabase → SQL Editor → New query 中完整粘贴并运行：

`supabase/migrations/20260907183000_add_workspace_lifecycle_functions.sql`

理想结果：

```text
Success. No rows returned
```

部署后应存在：

- `projects.is_default boolean not null default false`
- 唯一部分索引 `projects_one_default_per_owner_idx`
- RPC `initialize_user_workspace()`
- RPC `reset_user_workspace(uuid)`
- `anon` 无两个函数的执行权
- `authenticated` 有两个函数的执行权

不要重复执行 Migration。

## 4. 数据库契约测试

在 SQL Editor 新建查询，完整粘贴并运行：

`supabase/tests/004_workspace_lifecycle_contract.sql`

理想结果：

```text
PASS: Northstar workspace lifecycle contract is intact
```

该测试不创建数据，并在末尾回滚。

## 5. 浏览器完整测试

### A. 首次初始化

1. 使用一个 Auth 中存在、但 `projects` 表尚无数据的用户登录。
2. 正确输入 OTP 并进入 `/app`。
3. 打开 Supabase Table Editor 检查三张表。

理想结果：页面显示 Website launch、3 个里程碑、7 个任务和 14% 进度；数据库为该用户创建 1 个 `is_default=true` 项目、3 个关联里程碑、7 个关联任务。所有外键指向同一个项目。

### B. 幂等初始化

连续刷新 `/app` 三次，再检查数据库。

理想结果：仍然只有 1 个默认项目、3 个里程碑、7 个任务；没有重复示例数据。

### C. 新建任务与刷新持久化

1. 新建任务 `Cloud persistence test`，选择任意里程碑。
2. 刷新页面。
3. 在 Supabase `tasks` 表搜索该标题。

理想结果：保存后出现 Task added；刷新后任务仍存在；数据库恰好一行同名任务，`project_id` 和 `milestone_id` 正确；总任务数变为 8。

### D. 编辑任务

编辑测试任务的标题、里程碑、状态、优先级、截止日期和备注，再刷新。

理想结果：六类字段全部保留；数据库对应 `title`、`milestone_id`、`status`、`priority`、`due_date`、`notes` 与页面一致；`updated_at` 晚于 `created_at`。

### E. 拖拽状态

将测试任务拖到另一列，然后刷新。

理想结果：任务留在目标列；数据库 `status` 更新为目标状态；完成率和列计数同步变化。

### F. 删除任务

删除测试任务并刷新。

理想结果：页面和数据库中都不存在该任务；其他任务不受影响。

### G. 里程碑 CRUD

1. 新建里程碑 `Cloud milestone`。
2. 编辑名称和日期并刷新。
3. 在无关联任务时删除并刷新。

理想结果：每一步都与 `milestones` 表同步；刷新不恢复旧值；删除后只有目标行消失。

### H. 重置事务

先新增一个任务或里程碑，再点击 Reset workspace 并确认。

理想结果：恢复到 Website launch、3 个里程碑、7 个任务和 14%；用户的项目 ID 保持不变；自定义数据消失；数据库不存在半套示例数据。

### I. 同账号跨浏览器同步

1. 浏览器 A 登录并新建 `Cross browser test`。
2. 浏览器 B 或无痕窗口登录同一邮箱。

理想结果：浏览器 B 能看到相同任务；刷新后两边读取同一数据库记录。

### J. 两账号隔离

1. 用户 A 新建唯一任务 `Only user A can see this`。
2. 在另一无痕窗口登录用户 B。
3. B 新建 `Only user B can see this`。
4. 分别刷新两个窗口。

理想结果：A 只看到 A 的唯一任务，B 只看到 B 的唯一任务；两人各有独立默认项目；Supabase 管理员能看到两组数据，但 owner 和 project 外键完全分开。

### K. 清除本地存储

登录后清除该站点 Local Storage，再刷新。

理想结果：登录会话可能因此被清除，需要重新 OTP 登录；重新登录后云端规划完整恢复。旧键 `northstar-planner-v1` 是否存在不影响规划内容。

## 6. 第六步发布门

- [ ] 生命周期 Migration 成功。
- [ ] `004_workspace_lifecycle_contract.sql` 返回 PASS。
- [ ] 首次登录只创建一套 1/3/7 数据。
- [ ] 任务和里程碑 CRUD 刷新后保持。
- [ ] 拖拽状态保存到数据库。
- [ ] 重置完整且项目 ID 不变。
- [ ] 同账号跨浏览器数据一致。
- [ ] A/B 用户数据完全隔离。
- [ ] 清除旧 `localStorage` 不会丢失云端规划。
- [ ] Git 搜索不到正式 `localStorage` 读写路径和秘密密钥。

全部通过后进入第七步：统一加载、保存中、错误恢复、空数据和会话失效状态。
