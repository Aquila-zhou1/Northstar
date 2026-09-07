# Northstar 数据库 Schema：部署与验证手册

> 对应 migration：`supabase/migrations/20260907163000_create_planner_schema.sql`  
> 对应契约测试：`supabase/tests/001_schema_contract.sql`  
> 当前安全状态：RLS 已启用，`anon` 与 `authenticated` 尚无表权限和策略。Supabase Dashboard 管理员可检查结构，但应用客户端在第四步完成前不能读写，这是预期效果。

## 1. 数据关系

```text
auth.users
   1
   │ owner_id / ON DELETE CASCADE
   N
projects
   1 ─────────────── N milestones
   │                    │
   │                    │ (project_id, id)
   │                    ▼
   └─────────────── N tasks
                         composite FK:
                         task(project_id, milestone_id)
                         → milestone(project_id, id)
```

`tasks.project_id` 看似可由里程碑推导，但有意保留：它让项目看板查询和未来 RLS 策略简单高效；复合外键保证这份冗余不会产生“任务属于项目 A，却引用项目 B 里程碑”的脏数据。

## 2. Schema 契约摘要

| 对象 | 关键约束 | 删除语义 | 主要查询索引 |
|---|---|---|---|
| `projects` | owner 必须存在；名称去空白后 1–160 字；描述 ≤ 5000 字 | 删除 Auth 用户级联删除项目 | `owner_id` |
| `milestones` | 项目必须存在；名称 1–160 字；日期必填；顺序非负 | 删除项目级联删除；有关联任务时不能单独删除 | `(project_id, sort_order, created_at)` |
| `tasks` | 项目和里程碑必须一致；标题 1–500 字；状态/优先级枚举；备注 ≤ 20000 字；顺序非负 | 删除项目级联删除；删除里程碑受关联任务保护 | `(project_id, status, sort_order, created_at)`、`milestone_id` |

所有表使用 UUID 主键、`timestamptz` 审计时间，并在 UPDATE 前由数据库更新 `updated_at`。触发函数未向浏览器角色开放执行权。

## 3. 为什么第三步不创建访问策略

数据库结构与用户隔离策略拆成两次 migration，便于分别审查、回滚和测试。仅启用 RLS 并不等于完整授权；因此本 migration 同时撤销 `anon`、`authenticated` 的所有表权限，使中间状态 fail closed：

- Dashboard/数据库管理员仍可检查和维护 Schema。
- 浏览器 publishable key 无法访问业务表。
- 第四步必须显式授予 `authenticated` 所需 CRUD，并为每种操作添加所有权 policy。
- 第四步验收通过前禁止把前端切换到 Supabase repository。

## 4. 首次部署到 Supabase

### 推荐：Supabase CLI

在安装 CLI、登录并链接正确项目后执行 migration 推送。仓库中的 migration 是唯一 Schema 来源；不要先在 Dashboard 手工创建同名表，否则 migration 会因对象已存在而失败。

部署前确认目标项目名称和项目 ID，生产与测试项目不得混用。部署后保留 CLI 输出或 Supabase migration history 截图作为证据。

### 临时方案：Dashboard SQL Editor

尚未配置 CLI 时：

1. 打开目标 Supabase 项目 → SQL Editor → New query。
2. 完整复制 migration 文件内容，一次执行，不要拆段选择执行。
3. 页面应显示成功，不能有红色错误；Table Editor 应出现 `projects`、`milestones`、`tasks`。
4. 再新建查询，完整复制契约测试文件并执行。

migration 不是给同一数据库反复点击的幂等脚本。若首次执行中断，不要盲目重跑；先确认已创建对象，再在测试项目重建或编写修复 migration。

## 5. 自动契约测试及理想结果

执行 `supabase/tests/001_schema_contract.sql`。它只读取系统目录，在事务末尾 `ROLLBACK`，不会保留测试数据。

理想结果：

- Results 出现一行：`PASS: Northstar schema contract is intact`。
- Messages/日志依次出现五类 PASS：表、RLS、约束、索引、触发器、客户端锁闭。
- 没有 `Missing required ...`、`RLS is not enabled` 或 `unexpectedly granted access` 异常。

任何异常都表示第三步未完成；不要进入第四步。

## 6. 人工验证查询

### 6.1 表与 RLS

```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('projects', 'milestones', 'tasks')
order by c.relname;
```

理想结果为 3 行，三个 `rls_enabled` 全是 `true`。

### 6.2 外键与检查约束

```sql
select conrelid::regclass as table_name,
       conname,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in (
  'public.projects'::regclass,
  'public.milestones'::regclass,
  'public.tasks'::regclass
)
order by table_name::text, conname;
```

理想结果必须包含：

- `projects_owner_id_fkey`
- `milestones_project_id_fkey`
- `tasks_project_id_fkey`
- `tasks_milestone_belongs_to_project`
- `tasks_status_allowed`
- `tasks_priority_allowed`
- 三张表各自的主键、长度/顺序/时间检查约束

### 6.3 索引

```sql
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('projects', 'milestones', 'tasks')
order by tablename, indexname;
```

理想结果除主键/唯一索引外，必须包含：

- `projects_owner_id_idx`
- `milestones_project_sort_idx`
- `tasks_project_status_sort_idx`
- `tasks_milestone_id_idx`

### 6.4 当前客户端必须被锁闭

```sql
select role_name, table_name,
       has_table_privilege(role_name, 'public.' || table_name, 'SELECT') as can_select,
       has_table_privilege(role_name, 'public.' || table_name, 'INSERT') as can_insert
from (values ('anon'), ('authenticated')) roles(role_name)
cross join (values ('projects'), ('milestones'), ('tasks')) tables(table_name)
order by role_name, table_name;
```

理想结果为 6 行，所有 `can_select` 和 `can_insert` 都是 `false`。第四步加入最小授权后，此预期会相应更新；届时隔离由 grants + policies 联合验证。

## 7. 可选的数据行为测试

在测试项目已有 Auth 用户时，从 Dashboard 的 Authentication → Users 复制一个测试用户 UUID，替换下方 `<USER_UUID>`。不要在生产项目为测试随意插入真实业务数据。

```sql
begin;

insert into public.projects (id, owner_id, name)
values ('10000000-0000-0000-0000-000000000001', '<USER_UUID>', 'Schema test');

insert into public.milestones (id, project_id, name, target_date, sort_order)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Test milestone', current_date, 0
);

insert into public.tasks (
  project_id, milestone_id, title, status, priority, sort_order
) values (
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'Test task', 'planned', 'Medium', 0
);

select p.name, m.name, t.title, t.status, t.priority
from public.projects p
join public.milestones m on m.project_id = p.id
join public.tasks t on t.project_id = p.id and t.milestone_id = m.id
where p.id = '10000000-0000-0000-0000-000000000001';

rollback;
```

理想结果返回一行 `Schema test / Test milestone / Test task / planned / Medium`，并且 `ROLLBACK` 后 Table Editor 中不保留这些行。

负向约束测试应在独立事务中逐项执行；非法状态、非法优先级、负数排序、不存在的 owner、跨项目 milestone 均必须报错。报错是理想结果，若插入成功则 Schema 有安全/完整性缺陷。

## 8. 进入第四步前的交接条件

- migration 已在一个目标 Supabase 项目执行成功。
- 契约测试输出最终 PASS。
- 人工查询确认三表 RLS 全开、四个查询索引齐全、客户端角色全锁闭。
- Supabase 项目 ID、区域、环境用途被记录，但 secret key 未进入仓库。
- 只有在上述条件满足后，才创建 grants 与按用户所有权过滤的 RLS policies。
