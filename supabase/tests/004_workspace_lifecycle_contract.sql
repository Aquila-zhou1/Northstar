-- Structural verification for default-workspace lifecycle functions.

begin;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'is_default'
      and data_type = 'boolean'
      and is_nullable = 'NO'
  ) then
    raise exception 'projects.is_default boolean NOT NULL is missing';
  end if;

  if to_regclass('public.projects_one_default_per_owner_idx') is null then
    raise exception 'Default-workspace unique index is missing';
  end if;

  if to_regprocedure('public.initialize_user_workspace()') is null then
    raise exception 'initialize_user_workspace() is missing';
  end if;

  if to_regprocedure('public.reset_user_workspace(uuid)') is null then
    raise exception 'reset_user_workspace(uuid) is missing';
  end if;

  if has_function_privilege('anon', 'public.initialize_user_workspace()', 'EXECUTE')
    or has_function_privilege('anon', 'public.reset_user_workspace(uuid)', 'EXECUTE') then
    raise exception 'anon unexpectedly has workspace lifecycle function access';
  end if;

  if not has_function_privilege('authenticated', 'public.initialize_user_workspace()', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.reset_user_workspace(uuid)', 'EXECUTE') then
    raise exception 'authenticated is missing workspace lifecycle function access';
  end if;

  raise notice 'PASS: lifecycle column, unique index, functions, and grants are correct';
end;
$$;

select 'PASS: Northstar workspace lifecycle contract is intact' as result;

rollback;
