-- Execute once in Supabase SQL Editor. All schema changes are atomic.
begin;

alter table public.tasks drop constraint tasks_milestone_belongs_to_project;
alter table public.tasks add constraint tasks_milestone_belongs_to_project
  foreign key (project_id, milestone_id)
  references public.milestones(project_id, id)
  on update cascade on delete cascade deferrable initially deferred;

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 500),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_event_positive_duration check (ends_at > starts_at)
);
create index calendar_events_owner_start_idx on public.calendar_events(owner_id, starts_at);
alter table public.calendar_events enable row level security;
revoke all on public.calendar_events from public, anon;
grant select, insert, update, delete on public.calendar_events to authenticated;
create policy calendar_select_own on public.calendar_events for select to authenticated using (owner_id = (select auth.uid()));
create policy calendar_insert_own on public.calendar_events for insert to authenticated with check (owner_id = (select auth.uid()));
create policy calendar_update_own on public.calendar_events for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy calendar_delete_own on public.calendar_events for delete to authenticated using (owner_id = (select auth.uid()));
create trigger calendar_events_set_updated_at before update on public.calendar_events
  for each row execute function public.set_updated_at();
commit;
