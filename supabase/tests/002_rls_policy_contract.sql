-- Structural RLS verification. Safe to run in Supabase SQL Editor.
-- It writes no rows and leaves no database changes.

begin;

do $$
declare
  table_name text;
  operation text;
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

    foreach operation in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
      if has_table_privilege('anon', 'public.' || table_name, operation) then
        raise exception 'anon unexpectedly has % on public.%', operation, table_name;
      end if;
      if not has_table_privilege('authenticated', 'public.' || table_name, operation) then
        raise exception 'authenticated is missing % on public.%', operation, table_name;
      end if;
    end loop;
  end loop;
  raise notice 'PASS: table RLS and least-privilege grants are correct';
end;
$$;

do $$
declare
  missing_policies text[];
begin
  with expected(policyname, tablename, cmd) as (
    values
      ('projects_select_own', 'projects', 'SELECT'),
      ('projects_insert_own', 'projects', 'INSERT'),
      ('projects_update_own', 'projects', 'UPDATE'),
      ('projects_delete_own', 'projects', 'DELETE'),
      ('milestones_select_own_project', 'milestones', 'SELECT'),
      ('milestones_insert_own_project', 'milestones', 'INSERT'),
      ('milestones_update_own_project', 'milestones', 'UPDATE'),
      ('milestones_delete_own_project', 'milestones', 'DELETE'),
      ('tasks_select_own_project', 'tasks', 'SELECT'),
      ('tasks_insert_own_project', 'tasks', 'INSERT'),
      ('tasks_update_own_project', 'tasks', 'UPDATE'),
      ('tasks_delete_own_project', 'tasks', 'DELETE')
  )
  select array_agg(expected.policyname order by expected.policyname)
    into missing_policies
  from expected
  left join pg_policies actual
    on actual.schemaname = 'public'
   and actual.tablename = expected.tablename
   and actual.policyname = expected.policyname
   and actual.cmd = expected.cmd
   and actual.roles @> array['authenticated']::name[]
  where actual.policyname is null;

  if missing_policies is not null then
    raise exception 'Missing or malformed policies: %', missing_policies;
  end if;
  raise notice 'PASS: all 12 operation-specific authenticated policies exist';
end;
$$;

do $$
declare
  invalid_policy text;
begin
  select policyname
    into invalid_policy
  from pg_policies
  where schemaname = 'public'
    and tablename in ('projects', 'milestones', 'tasks')
    and (
      roles @> array['anon']::name[]
      or roles @> array['public']::name[]
      or (cmd in ('SELECT', 'DELETE') and qual is null)
      or (cmd = 'INSERT' and with_check is null)
      or (cmd = 'UPDATE' and (qual is null or with_check is null))
    )
  limit 1;

  if invalid_policy is not null then
    raise exception 'Unsafe or incomplete policy detected: %', invalid_policy;
  end if;
  raise notice 'PASS: no policy exposes anon/public or omits required predicates';
end;
$$;

select 'PASS: Northstar RLS policy contract is intact' as result;

rollback;
