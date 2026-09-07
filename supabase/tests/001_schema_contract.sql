-- Run after the schema migration in Supabase SQL Editor or with a local
-- Supabase/PostgreSQL test database. Success returns one result row and NOTICEs.

begin;

do $$
declare
  missing_tables text[];
begin
  select array_agg(expected.name order by expected.name)
    into missing_tables
  from (values ('projects'), ('milestones'), ('tasks')) as expected(name)
  where to_regclass('public.' || expected.name) is null;

  if missing_tables is not null then
    raise exception 'Missing required tables: %', missing_tables;
  end if;
  raise notice 'PASS: required tables exist';
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['projects', 'milestones', 'tasks'] loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = table_name
        and c.relrowsecurity
    ) then
      raise exception 'RLS is not enabled on public.%', table_name;
    end if;
  end loop;
  raise notice 'PASS: RLS is enabled on all business tables';
end;
$$;

do $$
declare
  required_constraint text;
begin
  foreach required_constraint in array array[
    'projects_owner_id_fkey',
    'milestones_project_id_fkey',
    'tasks_project_id_fkey',
    'tasks_milestone_belongs_to_project',
    'tasks_status_allowed',
    'tasks_priority_allowed'
  ] loop
    if not exists (
      select 1 from pg_constraint where conname = required_constraint
    ) then
      raise exception 'Missing required constraint: %', required_constraint;
    end if;
  end loop;
  raise notice 'PASS: ownership, relation, status, and priority constraints exist';
end;
$$;

do $$
declare
  required_index text;
begin
  foreach required_index in array array[
    'projects_owner_id_idx',
    'milestones_project_sort_idx',
    'tasks_project_status_sort_idx',
    'tasks_milestone_id_idx'
  ] loop
    if to_regclass('public.' || required_index) is null then
      raise exception 'Missing required index: %', required_index;
    end if;
  end loop;
  raise notice 'PASS: query-path indexes exist';
end;
$$;

do $$
declare
  required_trigger text;
begin
  foreach required_trigger in array array[
    'projects_set_updated_at',
    'milestones_set_updated_at',
    'tasks_set_updated_at'
  ] loop
    if not exists (
      select 1 from pg_trigger
      where tgname = required_trigger and not tgisinternal
    ) then
      raise exception 'Missing required trigger: %', required_trigger;
    end if;
  end loop;
  raise notice 'PASS: updated_at triggers exist';
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['projects', 'milestones', 'tasks'] loop
    if has_table_privilege('anon', 'public.' || table_name, 'SELECT')
      or has_table_privilege('anon', 'public.' || table_name, 'INSERT')
      or has_table_privilege('authenticated', 'public.' || table_name, 'SELECT')
      or has_table_privilege('authenticated', 'public.' || table_name, 'INSERT') then
      raise exception 'Client role is unexpectedly granted access to public.%', table_name;
    end if;
  end loop;
  raise notice 'PASS: client roles remain locked until the RLS policy migration';
end;
$$;

select 'PASS: Northstar schema contract is intact' as result;

rollback;
