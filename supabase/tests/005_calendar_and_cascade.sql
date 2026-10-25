-- Requires the new migration and two existing Auth users.
-- Run as postgres in SQL Editor. Fixtures are always rolled back on success.
begin;
do $$
declare users uuid[];
begin
  select array_agg(id) into users from (select id from auth.users order by created_at limit 2) u;
  if coalesce(array_length(users, 1), 0) < 2 then
    raise exception 'Create two Auth users before running this test';
  end if;
  perform set_config('northstar.calendar.a', users[1]::text, true);
  perform set_config('northstar.calendar.b', users[2]::text, true);
  perform set_config('northstar.calendar.project', gen_random_uuid()::text, true);
  perform set_config('northstar.calendar.milestone', gen_random_uuid()::text, true);
  perform set_config('northstar.calendar.foreign_event', gen_random_uuid()::text, true);
  if not (select relrowsecurity from pg_class where oid = 'public.calendar_events'::regclass) then
    raise exception 'Calendar RLS disabled';
  end if;
  if has_table_privilege('anon', 'public.calendar_events', 'SELECT') then
    raise exception 'Anonymous access must be denied';
  end if;
  if not exists(select 1 from pg_constraint where conrelid = 'public.tasks'::regclass
    and conname = 'tasks_milestone_belongs_to_project' and confdeltype = 'c') then
    raise exception 'Task foreign key must cascade milestone deletion';
  end if;
end $$;

insert into public.projects(id, owner_id, name) values
  (current_setting('northstar.calendar.project')::uuid, current_setting('northstar.calendar.a')::uuid, 'Cascade test');
insert into public.milestones(id, project_id, name, target_date) values
  (current_setting('northstar.calendar.milestone')::uuid, current_setting('northstar.calendar.project')::uuid, 'Cascade milestone', current_date);
insert into public.tasks(project_id, milestone_id, title) values
  (current_setting('northstar.calendar.project')::uuid, current_setting('northstar.calendar.milestone')::uuid, 'Cascade task');
insert into public.calendar_events(id, owner_id, title, starts_at, ends_at) values
  (current_setting('northstar.calendar.foreign_event')::uuid, current_setting('northstar.calendar.b')::uuid, 'B private', now(), now() + interval '1 hour');

select set_config('request.jwt.claim.sub', current_setting('northstar.calendar.a'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('northstar.calendar.a'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare own_event uuid; affected integer;
begin
  if exists(select 1 from public.calendar_events where id = current_setting('northstar.calendar.foreign_event')::uuid) then
    raise exception 'A can read B calendar';
  end if;
  update public.calendar_events set title = 'Forbidden' where id = current_setting('northstar.calendar.foreign_event')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'A updated B calendar'; end if;
  delete from public.calendar_events where id = current_setting('northstar.calendar.foreign_event')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'A deleted B calendar'; end if;
  begin
    insert into public.calendar_events(owner_id, title, starts_at, ends_at) values
      (current_setting('northstar.calendar.b')::uuid, 'Forbidden', now(), now() + interval '1 hour');
    raise exception 'A created B calendar event';
  exception when insufficient_privilege then null;
  end;
  insert into public.calendar_events(title, starts_at, ends_at) values
    ('Own event', now(), now() + interval '30 minutes') returning id into own_event;
  begin
    update public.calendar_events set owner_id = current_setting('northstar.calendar.b')::uuid where id = own_event;
    raise exception 'A transferred calendar ownership to B';
  exception when insufficient_privilege then null;
  end;
  update public.calendar_events set title = 'Edited' where id = own_event;
  if not exists(select 1 from public.calendar_events where id = own_event and title = 'Edited') then
    raise exception 'Own event CRUD failed';
  end if;
  begin
    update public.calendar_events set ends_at = starts_at where id = own_event;
    raise exception 'Zero duration was accepted';
  exception when check_violation then null;
  end;
  delete from public.calendar_events where id = own_event;
  if exists(select 1 from public.calendar_events where id = own_event) then raise exception 'Own deletion failed'; end if;

  delete from public.milestones where id = current_setting('northstar.calendar.milestone')::uuid;
  if exists(select 1 from public.milestones where id = current_setting('northstar.calendar.milestone')::uuid)
    or exists(select 1 from public.tasks where milestone_id = current_setting('northstar.calendar.milestone')::uuid) then
    raise exception 'Milestone cascade failed';
  end if;
  if not exists(select 1 from public.projects where id = current_setting('northstar.calendar.project')::uuid) then
    raise exception 'Deleting last milestone deleted project';
  end if;
end $$;
reset role;
do $$ begin
  if not exists(select 1 from public.calendar_events where id = current_setting('northstar.calendar.foreign_event')::uuid and title = 'B private') then
    raise exception 'B calendar changed';
  end if;
end $$;
select 'PASS: calendar isolation, duration and milestone cascade' as result;
rollback;
