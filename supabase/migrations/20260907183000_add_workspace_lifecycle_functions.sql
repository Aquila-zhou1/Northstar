-- Northstar Phase 1: atomic default-workspace initialization and reset.
-- Prerequisite: schema and user-isolation migrations.

alter table public.projects
add column is_default boolean not null default false;

with ranked_projects as (
  select id,
         row_number() over (partition by owner_id order by created_at, id) as owner_rank
  from public.projects
)
update public.projects
set is_default = true
from ranked_projects
where projects.id = ranked_projects.id
  and ranked_projects.owner_rank = 1;

create unique index projects_one_default_per_owner_idx
on public.projects(owner_id)
where is_default;

create or replace function public.initialize_user_workspace()
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner uuid := (select auth.uid());
  project uuid;
  milestone_strategy uuid := gen_random_uuid();
  milestone_build uuid := gen_random_uuid();
  milestone_launch uuid := gen_random_uuid();
begin
  if owner is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select id into project
  from public.projects
  where owner_id = owner and is_default
  order by created_at, id
  limit 1;

  if project is not null then
    return project;
  end if;

  insert into public.projects (owner_id, name, description, is_default)
  values (
    owner,
    'Website launch',
    'A focused workspace for the work that matters now—clear ownership, visible momentum, and fewer loose ends.',
    true
  )
  on conflict (owner_id) where is_default do nothing
  returning id into project;

  if project is null then
    select id into project
    from public.projects
    where owner_id = owner and is_default
    order by created_at, id
    limit 1;
    return project;
  end if;

  insert into public.milestones (id, project_id, name, target_date, sort_order)
  values
    (milestone_strategy, project, 'Strategy & scope', date '2026-09-04', 0),
    (milestone_build, project, 'Design & build', date '2026-09-18', 1),
    (milestone_launch, project, 'Launch ready', date '2026-09-28', 2);

  insert into public.tasks (
    project_id, milestone_id, title, status, priority, due_date, notes, sort_order
  )
  values
    (project, milestone_strategy, 'Confirm goals and success metrics', 'done', 'High', date '2026-08-28', '', 0),
    (project, milestone_strategy, 'Map the primary user journey', 'review', 'Medium', date '2026-09-01', '', 1),
    (project, milestone_build, 'Create the visual direction', 'progress', 'High', date '2026-09-07', '', 0),
    (project, milestone_build, 'Build responsive page sections', 'progress', 'High', date '2026-09-13', '', 1),
    (project, milestone_build, 'Draft final page copy', 'planned', 'Medium', date '2026-09-10', '', 2),
    (project, milestone_launch, 'Run accessibility and mobile QA', 'planned', 'Medium', date '2026-09-23', '', 0),
    (project, milestone_launch, 'Prepare launch checklist', 'planned', 'Low', date '2026-09-25', '', 1);

  return project;
end;
$$;

create or replace function public.reset_user_workspace(target_project_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner uuid := (select auth.uid());
  milestone_strategy uuid := gen_random_uuid();
  milestone_build uuid := gen_random_uuid();
  milestone_launch uuid := gen_random_uuid();
begin
  if owner is null or not exists (
    select 1
    from public.projects
    where id = target_project_id and owner_id = owner
  ) then
    raise exception using errcode = '42501', message = 'Workspace not found or access denied';
  end if;

  delete from public.tasks where project_id = target_project_id;
  delete from public.milestones where project_id = target_project_id;

  update public.projects
  set name = 'Website launch',
      description = 'A focused workspace for the work that matters now—clear ownership, visible momentum, and fewer loose ends.'
  where id = target_project_id;

  insert into public.milestones (id, project_id, name, target_date, sort_order)
  values
    (milestone_strategy, target_project_id, 'Strategy & scope', date '2026-09-04', 0),
    (milestone_build, target_project_id, 'Design & build', date '2026-09-18', 1),
    (milestone_launch, target_project_id, 'Launch ready', date '2026-09-28', 2);

  insert into public.tasks (
    project_id, milestone_id, title, status, priority, due_date, notes, sort_order
  )
  values
    (target_project_id, milestone_strategy, 'Confirm goals and success metrics', 'done', 'High', date '2026-08-28', '', 0),
    (target_project_id, milestone_strategy, 'Map the primary user journey', 'review', 'Medium', date '2026-09-01', '', 1),
    (target_project_id, milestone_build, 'Create the visual direction', 'progress', 'High', date '2026-09-07', '', 0),
    (target_project_id, milestone_build, 'Build responsive page sections', 'progress', 'High', date '2026-09-13', '', 1),
    (target_project_id, milestone_build, 'Draft final page copy', 'planned', 'Medium', date '2026-09-10', '', 2),
    (target_project_id, milestone_launch, 'Run accessibility and mobile QA', 'planned', 'Medium', date '2026-09-23', '', 0),
    (target_project_id, milestone_launch, 'Prepare launch checklist', 'planned', 'Low', date '2026-09-25', '', 1);
end;
$$;

revoke all on function public.initialize_user_workspace() from public, anon;
revoke all on function public.reset_user_workspace(uuid) from public, anon;
grant execute on function public.initialize_user_workspace() to authenticated;
grant execute on function public.reset_user_workspace(uuid) to authenticated;

comment on column public.projects.is_default is
  'Marks the workspace loaded by the Phase 1 single-project UI; unique per owner.';
comment on function public.initialize_user_workspace() is
  'Idempotently creates and returns the authenticated user default workspace.';
comment on function public.reset_user_workspace(uuid) is
  'Atomically restores an owned workspace to the Northstar example plan.';
