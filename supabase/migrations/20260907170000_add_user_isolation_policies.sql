-- Northstar Phase 1: least-privilege grants and per-user RLS policies.
-- Prerequisite: 20260907163000_create_planner_schema.sql

revoke all on table public.projects from anon;
revoke all on table public.milestones from anon;
revoke all on table public.tasks from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.milestones to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;

create policy projects_select_own
on public.projects
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy projects_insert_own
on public.projects
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy projects_update_own
on public.projects
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy projects_delete_own
on public.projects
for delete
to authenticated
using ((select auth.uid()) = owner_id);

create policy milestones_select_own_project
on public.milestones
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = milestones.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy milestones_insert_own_project
on public.milestones
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = milestones.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy milestones_update_own_project
on public.milestones
for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = milestones.project_id
      and projects.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = milestones.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy milestones_delete_own_project
on public.milestones
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = milestones.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy tasks_select_own_project
on public.tasks
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = tasks.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy tasks_insert_own_project
on public.tasks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = tasks.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy tasks_update_own_project
on public.tasks
for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = tasks.project_id
      and projects.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = tasks.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy tasks_delete_own_project
on public.tasks
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = tasks.project_id
      and projects.owner_id = (select auth.uid())
  )
);
