-- Northstar Phase 1: relational planner schema.
-- This migration deliberately enables RLS without adding client policies.
-- Until the next security migration, public API roles are locked out.

create extension if not exists pgcrypto with schema extensions;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint projects_name_length
    check (char_length(btrim(name)) between 1 and 160),
  constraint projects_description_length
    check (char_length(description) <= 5000),
  constraint projects_updated_after_created
    check (updated_at >= created_at)
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  target_date date not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint milestones_project_id_id_unique unique (project_id, id),
  constraint milestones_name_length
    check (char_length(btrim(name)) between 1 and 160),
  constraint milestones_sort_order_nonnegative
    check (sort_order >= 0),
  constraint milestones_updated_after_created
    check (updated_at >= created_at)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  milestone_id uuid not null,
  title text not null,
  status text not null default 'planned',
  priority text not null default 'Medium',
  due_date date,
  notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tasks_milestone_belongs_to_project
    foreign key (project_id, milestone_id)
    references public.milestones(project_id, id)
    on update cascade
    on delete no action
    deferrable initially deferred,
  constraint tasks_title_length
    check (char_length(btrim(title)) between 1 and 500),
  constraint tasks_status_allowed
    check (status in ('planned', 'progress', 'review', 'done')),
  constraint tasks_priority_allowed
    check (priority in ('High', 'Medium', 'Low')),
  constraint tasks_notes_length
    check (char_length(notes) <= 20000),
  constraint tasks_sort_order_nonnegative
    check (sort_order >= 0),
  constraint tasks_updated_after_created
    check (updated_at >= created_at)
);

create index projects_owner_id_idx
  on public.projects(owner_id);

create index milestones_project_sort_idx
  on public.milestones(project_id, sort_order, created_at);

create index tasks_project_status_sort_idx
  on public.tasks(project_id, status, sort_order, created_at);

create index tasks_milestone_id_idx
  on public.tasks(milestone_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.set_updated_at() from anon;
revoke all on function public.set_updated_at() from authenticated;

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger milestones_set_updated_at
before update on public.milestones
for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.milestones enable row level security;
alter table public.tasks enable row level security;

revoke all on table public.projects from anon, authenticated;
revoke all on table public.milestones from anon, authenticated;
revoke all on table public.tasks from anon, authenticated;

comment on table public.projects is
  'User-owned planning workspaces. The first UI exposes one default project per user.';
comment on column public.projects.owner_id is
  'Immutable ownership boundary referencing the authenticated Supabase user.';
comment on table public.milestones is
  'Ordered project checkpoints.';
comment on table public.tasks is
  'Ordered planner work items. Composite FK prevents cross-project milestone assignment.';
comment on column public.tasks.status is
  'Kanban state: planned, progress, review, or done.';
comment on column public.tasks.priority is
  'UI-compatible priority: High, Medium, or Low.';
