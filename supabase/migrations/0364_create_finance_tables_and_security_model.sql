create table if not exists public.finance_scenarios (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  base_scenario_id uuid references public.finance_scenarios(id) on delete set null,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_fiscal_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_type text not null check (period_type in ('month', 'quarter', 'year')),
  fiscal_year integer not null,
  fiscal_quarter integer,
  fiscal_month integer,
  label text not null,
  start_date date not null,
  end_date date not null,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  scenario_id uuid not null references public.finance_scenarios(id) on delete restrict,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'locked')),
  period_type text not null check (period_type in ('month', 'quarter', 'year')),
  fiscal_year integer not null,
  fiscal_quarter integer,
  fiscal_month integer,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_version_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  finance_version_id uuid not null references public.finance_versions(id) on delete cascade,
  finance_account_id uuid not null references public.finance_accounts(id) on delete restrict,
  fiscal_period_id uuid not null references public.finance_fiscal_periods(id) on delete restrict,
  amount numeric(14,2) not null default 0,
  department_id uuid not null references public.departments(id) on delete restrict,
  project_id uuid references public.projects(id) on delete restrict,
  squad_id uuid references public.squads(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists finance_version_lines_unique_idx on public.finance_version_lines (
  finance_version_id,
  finance_account_id,
  fiscal_period_id,
  coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(squad_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

create index if not exists finance_versions_company_idx on public.finance_versions (company_id, created_at desc);
create index if not exists finance_version_lines_version_idx on public.finance_version_lines (finance_version_id, created_at asc);

alter table public.finance_scenarios enable row level security;
alter table public.finance_fiscal_periods enable row level security;
alter table public.finance_accounts enable row level security;
alter table public.finance_versions enable row level security;
alter table public.finance_version_lines enable row level security;

create or replace function public.finance_can_access_company(p_company_id uuid)
returns boolean
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare
  v_role text;
  v_company_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;
  perform set_config('row_security', 'off', true);
  select role, company_id into v_role, v_company_id from public.profiles where id = auth.uid();
  if v_role = 'MASTERADMIN' then
    return true;
  end if;
  return v_company_id is not null and v_company_id = p_company_id;
end;
$$;

create or replace function public.finance_can_manage_version(p_version_id uuid)
returns boolean
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare
  v_role text;
  v_company_id uuid;
  v_version_company uuid;
begin
  if auth.uid() is null then
    return false;
  end if;
  perform set_config('row_security', 'off', true);
  select role, company_id into v_role, v_company_id from public.profiles where id = auth.uid();
  if v_role = 'MASTERADMIN' then
    return true;
  end if;
  select company_id into v_version_company from public.finance_versions where id = p_version_id;
  if v_version_company is null or v_version_company <> v_company_id then
    return false;
  end if;
  return v_role in ('ADMIN', 'HEAD');
end;
$$;

create or replace function public.finance_can_manage_line(p_line_id uuid)
returns boolean
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare
  v_role text;
  v_company_id uuid;
  v_department_id uuid;
  v_line_company uuid;
  v_line_department uuid;
begin
  if auth.uid() is null then
    return false;
  end if;
  perform set_config('row_security', 'off', true);
  select role, company_id, department_id into v_role, v_company_id, v_department_id from public.profiles where id = auth.uid();
  if v_role = 'MASTERADMIN' then
    return true;
  end if;
  select company_id, department_id into v_line_company, v_line_department from public.finance_version_lines where id = p_line_id;
  if v_line_company is null or v_line_company <> v_company_id then
    return false;
  end if;
  if v_role = 'ADMIN' then
    return true;
  end if;
  if v_role = 'HEAD' then
    return v_line_department = v_department_id;
  end if;
  return false;
end;
$$;

create or replace function public.finance_version_lines_company_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_version_company uuid;
  v_account_company uuid;
  v_period_company uuid;
begin
  perform set_config('row_security', 'off', true);
  select company_id into v_version_company from public.finance_versions where id = coalesce(new.finance_version_id, old.finance_version_id);
  select company_id into v_account_company from public.finance_accounts where id = coalesce(new.finance_account_id, old.finance_account_id);
  select company_id into v_period_company from public.finance_fiscal_periods where id = coalesce(new.fiscal_period_id, old.fiscal_period_id);
  if v_version_company is null or v_account_company is null or v_period_company is null then
    raise exception 'finance reference not found';
  end if;
  if v_version_company <> new.company_id or v_account_company <> new.company_id or v_period_company <> new.company_id then
    raise exception 'cross-company finance reference';
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.finance_version_lines_lock_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_status text;
begin
  perform set_config('row_security', 'off', true);
  select status into v_status from public.finance_versions where id = coalesce(new.finance_version_id, old.finance_version_id);
  if v_status = 'locked' then
    raise exception 'finance version is locked';
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.finance_version_lines_department_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_role text;
  v_department_id uuid;
  v_line_department_id uuid;
begin
  perform set_config('row_security', 'off', true);
  select role, department_id into v_role, v_department_id from public.profiles where id = auth.uid();
  v_line_department_id := coalesce(new.department_id, old.department_id);
  if v_role = 'COLABORADOR' then
    raise exception 'forbidden';
  end if;
  if v_role = 'HEAD' and v_line_department_id is distinct from v_department_id then
    raise exception 'department scope violation';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger finance_version_lines_company_guard_trigger
before insert or update on public.finance_version_lines
for each row execute function public.finance_version_lines_company_guard();

create trigger finance_version_lines_lock_guard_trigger
before insert or update or delete on public.finance_version_lines
for each row execute function public.finance_version_lines_lock_guard();

create trigger finance_version_lines_department_guard_trigger
before insert or update on public.finance_version_lines
for each row execute function public.finance_version_lines_department_guard();

create policy finance_versions_select on public.finance_versions for select to authenticated using (public.finance_can_access_company(company_id));
create policy finance_versions_insert on public.finance_versions for insert to authenticated with check (public.finance_can_access_company(company_id));
create policy finance_versions_update on public.finance_versions for update to authenticated using (public.finance_can_manage_version(id)) with check (public.finance_can_manage_version(id));
create policy finance_versions_delete on public.finance_versions for delete to authenticated using (public.finance_can_manage_version(id));

create policy finance_version_lines_select on public.finance_version_lines for select to authenticated using (
  public.finance_can_access_company(company_id)
  and (
    (select role from public.profiles where id = auth.uid()) in ('ADMIN', 'MASTERADMIN')
    or department_id = (select department_id from public.profiles where id = auth.uid())
  )
);
create policy finance_version_lines_insert on public.finance_version_lines for insert to authenticated with check (
  public.finance_can_access_company(company_id)
  and (
    (select role from public.profiles where id = auth.uid()) in ('ADMIN', 'MASTERADMIN')
    or department_id = (select department_id from public.profiles where id = auth.uid())
  )
);
create policy finance_version_lines_update on public.finance_version_lines for update to authenticated using (public.finance_can_manage_line(id)) with check (public.finance_can_manage_line(id));
create policy finance_version_lines_delete on public.finance_version_lines for delete to authenticated using (public.finance_can_manage_line(id));