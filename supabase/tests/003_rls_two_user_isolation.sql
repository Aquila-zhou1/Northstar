-- Functional RLS test using the two oldest existing Supabase Auth users.
-- Prerequisite: at least two users in Authentication > Users.
-- Safe for a test project: all fixtures and mutations are rolled back.

begin;

do $$
declare
  users uuid[];
begin
  select array_agg(id order by created_at)
    into users
  from (
    select id, created_at
    from auth.users
    order by created_at
    limit 2
  ) selected_users;

  if coalesce(array_length(users, 1), 0) < 2 then
    raise exception 'TEST SETUP: create at least two users in Authentication > Users';
  end if;

  perform set_config('northstar.test.user_a', users[1]::text, true);
  perform set_config('northstar.test.user_b', users[2]::text, true);
  perform set_config('northstar.test.project_a', gen_random_uuid()::text, true);
  perform set_config('northstar.test.project_b', gen_random_uuid()::text, true);
  perform set_config('northstar.test.milestone_a', gen_random_uuid()::text, true);
  perform set_config('northstar.test.milestone_b', gen_random_uuid()::text, true);

  raise notice 'Fixtures use user A % and user B %', users[1], users[2];
end;
$$;

insert into public.projects (id, owner_id, name)
values
  (current_setting('northstar.test.project_a')::uuid, current_setting('northstar.test.user_a')::uuid, 'RLS fixture A'),
  (current_setting('northstar.test.project_b')::uuid, current_setting('northstar.test.user_b')::uuid, 'RLS fixture B');

insert into public.milestones (id, project_id, name, target_date, sort_order)
values
  (current_setting('northstar.test.milestone_a')::uuid, current_setting('northstar.test.project_a')::uuid, 'Milestone A', current_date, 0),
  (current_setting('northstar.test.milestone_b')::uuid, current_setting('northstar.test.project_b')::uuid, 'Milestone B', current_date, 0);

insert into public.tasks (project_id, milestone_id, title, status, priority, sort_order)
values
  (current_setting('northstar.test.project_a')::uuid, current_setting('northstar.test.milestone_a')::uuid, 'Task A', 'planned', 'Medium', 0),
  (current_setting('northstar.test.project_b')::uuid, current_setting('northstar.test.milestone_b')::uuid, 'Task B', 'planned', 'Medium', 0);

select set_config('request.jwt.claim.sub', current_setting('northstar.test.user_a'), true);
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('northstar.test.user_a'), 'role', 'authenticated')::text,
  true
);
set local role authenticated;

do $$
declare
  affected integer;
  test_project uuid := gen_random_uuid();
  test_milestone uuid := gen_random_uuid();
  test_task uuid := gen_random_uuid();
begin
  if (select count(*) from public.projects) <> 1
    or (select count(*) from public.milestones) <> 1
    or (select count(*) from public.tasks) <> 1 then
    raise exception 'User A can see missing or foreign fixture rows';
  end if;
  raise notice 'PASS: user A SELECT sees only user A rows';

  insert into public.projects (id, owner_id, name)
  values (test_project, current_setting('northstar.test.user_a')::uuid, 'A temporary project');

  begin
    insert into public.projects (owner_id, name)
    values (current_setting('northstar.test.user_b')::uuid, 'Forbidden owner');
    raise exception 'User A inserted a project for user B';
  exception when insufficient_privilege then
    null;
  end;

  update public.projects
  set name = 'A updated own project'
  where id = current_setting('northstar.test.project_a')::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'User A could not update own project'; end if;

  update public.projects
  set name = 'A modified B project'
  where id = current_setting('northstar.test.project_b')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'User A updated user B project'; end if;

  delete from public.projects
  where id = current_setting('northstar.test.project_b')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'User A deleted user B project'; end if;

  delete from public.projects where id = test_project;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'User A could not delete own project'; end if;
  raise notice 'PASS: project INSERT/UPDATE/DELETE enforce ownership';

  insert into public.milestones (id, project_id, name, target_date, sort_order)
  values (test_milestone, current_setting('northstar.test.project_a')::uuid, 'A temporary milestone', current_date, 1);

  begin
    insert into public.milestones (project_id, name, target_date, sort_order)
    values (current_setting('northstar.test.project_b')::uuid, 'Forbidden milestone', current_date, 1);
    raise exception 'User A inserted a milestone into user B project';
  exception when insufficient_privilege then
    null;
  end;

  update public.milestones set name = 'A updated own milestone'
  where id = current_setting('northstar.test.milestone_a')::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'User A could not update own milestone'; end if;

  update public.milestones set name = 'A modified B milestone'
  where id = current_setting('northstar.test.milestone_b')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'User A updated user B milestone'; end if;

  delete from public.milestones
  where id = current_setting('northstar.test.milestone_b')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'User A deleted user B milestone'; end if;

  delete from public.milestones where id = test_milestone;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'User A could not delete own milestone'; end if;
  raise notice 'PASS: milestone INSERT/UPDATE/DELETE enforce project ownership';

  insert into public.tasks (id, project_id, milestone_id, title, status, priority, sort_order)
  values (
    test_task,
    current_setting('northstar.test.project_a')::uuid,
    current_setting('northstar.test.milestone_a')::uuid,
    'A temporary task', 'planned', 'Medium', 1
  );

  begin
    insert into public.tasks (project_id, milestone_id, title, status, priority, sort_order)
    values (
      current_setting('northstar.test.project_b')::uuid,
      current_setting('northstar.test.milestone_b')::uuid,
      'Forbidden task', 'planned', 'Medium', 1
    );
    raise exception 'User A inserted a task into user B project';
  exception when insufficient_privilege then
    null;
  end;

  update public.tasks set title = 'A updated own task'
  where project_id = current_setting('northstar.test.project_a')::uuid
    and id <> test_task;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'User A could not update own task'; end if;

  update public.tasks set title = 'A modified B task'
  where project_id = current_setting('northstar.test.project_b')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'User A updated user B task'; end if;

  delete from public.tasks
  where project_id = current_setting('northstar.test.project_b')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'User A deleted user B task'; end if;

  delete from public.tasks where id = test_task;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'User A could not delete own task'; end if;
  raise notice 'PASS: task INSERT/UPDATE/DELETE enforce project ownership';
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', current_setting('northstar.test.user_b'), true);
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('northstar.test.user_b'), 'role', 'authenticated')::text,
  true
);
set local role authenticated;

do $$
begin
  if (select count(*) from public.projects) <> 1
    or (select count(*) from public.milestones) <> 1
    or (select count(*) from public.tasks) <> 1 then
    raise exception 'User B can see missing or foreign fixture rows';
  end if;

  if exists (
    select 1 from public.projects
    where owner_id <> current_setting('northstar.test.user_b')::uuid
  ) then
    raise exception 'User B can see a project owned by another user';
  end if;
  raise notice 'PASS: user B sees only user B rows and user A mutations did not cross the boundary';
end;
$$;

reset role;
select 'PASS: two-user SELECT/INSERT/UPDATE/DELETE isolation is intact' as result;

rollback;
