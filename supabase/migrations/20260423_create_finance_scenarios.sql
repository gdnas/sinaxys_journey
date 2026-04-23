create table if not exists public.finance_scenarios (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text null,
  status text not null default 'draft',
  base_scenario_id uuid null references public.finance_scenarios(id) on delete set null,
  created_by_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_scenarios_status_check check (status in ('draft', 'active', 'archived'))
);

create table if not exists public.finance_scenario_assumptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  scenario_id uuid not null references public.finance_scenarios(id) on delete cascade,
  key text not null,
  label text not null,
  value_number numeric null,
  value_text text null,
  value_json jsonb null,
  unit text null,
  applies_to_account_id uuid null,
  applies_to_department_id uuid null,
  applies_to_project_id uuid null,
  applies_to_squad_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.finance_scenarios enable row level security;
alter table public.finance_scenario_assumptions enable row level security;

create policy "finance_scenarios_select_company"
on public.finance_scenarios
for select
to authenticated
using (is_member_of_company(company_id));

create policy "finance_scenarios_insert_admin"
on public.finance_scenarios
for insert
to authenticated
with check (
  is_admin_of_company(company_id)
  or is_masteradmin()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'HEAD'
      and p.company_id = finance_scenarios.company_id
  )
);

create policy "finance_scenarios_update_admin"
on public.finance_scenarios
for update
to authenticated
using (
  is_admin_of_company(company_id)
  or is_masteradmin()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'HEAD'
      and p.company_id = finance_scenarios.company_id
  )
)
with check (
  is_admin_of_company(company_id)
  or is_masteradmin()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'HEAD'
      and p.company_id = finance_scenarios.company_id
  )
);

create policy "finance_scenarios_delete_admin"
on public.finance_scenarios
for delete
to authenticated
using (
  is_admin_of_company(company_id)
  or is_masteradmin()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'HEAD'
      and p.company_id = finance_scenarios.company_id
  )
);

create policy "finance_scenario_assumptions_select_company"
on public.finance_scenario_assumptions
for select
to authenticated
using (is_member_of_company(company_id));

create policy "finance_scenario_assumptions_insert_admin"
on public.finance_scenario_assumptions
for insert
to authenticated
with check (
  is_admin_of_company(company_id)
  or is_masteradmin()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'HEAD'
      and p.company_id = finance_scenario_assumptions.company_id
  )
);

create policy "finance_scenario_assumptions_update_admin"
on public.finance_scenario_assumptions
for update
to authenticated
using (
  is_admin_of_company(company_id)
  or is_masteradmin()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'HEAD'
      and p.company_id = finance_scenario_assumptions.company_id
  )
)
with check (
  is_admin_of_company(company_id)
  or is_masteradmin()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'HEAD'
      and p.company_id = finance_scenario_assumptions.company_id
  )
);

create policy "finance_scenario_assumptions_delete_admin"
on public.finance_scenario_assumptions
for delete
to authenticated
using (
  is_admin_of_company(company_id)
  or is_masteradmin()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'HEAD'
      and p.company_id = finance_scenario_assumptions.company_id
  )
);

create index if not exists finance_scenarios_company_id_idx
  on public.finance_scenarios (company_id);

create index if not exists finance_scenarios_status_idx
  on public.finance_scenarios (status);

create index if not exists finance_scenario_assumptions_company_id_idx
  on public.finance_scenario_assumptions (company_id);

create index if not exists finance_scenario_assumptions_scenario_id_idx
  on public.finance_scenario_assumptions (scenario_id);

create index if not exists finance_scenario_assumptions_key_idx
  on public.finance_scenario_assumptions (key);

create index if not exists finance_scenario_assumptions_scope_idx
  on public.finance_scenario_assumptions (applies_to_account_id, applies_to_department_id, applies_to_project_id, applies_to_squad_id);

create or replace function public.set_finance_scenarios_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_finance_scenarios_updated_at on public.finance_scenarios;
create trigger trg_finance_scenarios_updated_at
before update on public.finance_scenarios
for each row execute function public.set_finance_scenarios_updated_at();

create or replace function public.set_finance_scenario_assumptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_finance_scenario_assumptions_updated_at on public.finance_scenario_assumptions;
create trigger trg_finance_scenario_assumptions_updated_at
before update on public.finance_scenario_assumptions
for each row execute function public.set_finance_scenario_assumptions_updated_at();

create or replace function public.seed_finance_scenarios(p_company_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_base uuid;
  v_conservative uuid;
  v_aggressive uuid;
begin
  perform set_config('row_security', 'off', true);

  insert into public.finance_scenarios (company_id, name, description, status, base_scenario_id, created_by_user_id)
  values
    (p_company_id, 'Base', 'Cenário principal da empresa.', 'active', null, p_user_id),
    (p_company_id, 'Conservador', 'Premissas mais prudentes para simulação.', 'draft', null, p_user_id),
    (p_company_id, 'Agressivo', 'Premissas mais otimistas para simulação.', 'draft', null, p_user_id)
  on conflict (company_id, name) do update
    set description = excluded.description,
        created_by_user_id = excluded.created_by_user_id
  returning id, name into v_base, v_conservative, v_aggressive;

  select id into v_base from public.finance_scenarios where company_id = p_company_id and name = 'Base' limit 1;
  select id into v_conservative from public.finance_scenarios where company_id = p_company_id and name = 'Conservador' limit 1;
  select id into v_aggressive from public.finance_scenarios where company_id = p_company_id and name = 'Agressivo' limit 1;

  update public.finance_scenarios
    set base_scenario_id = v_base
  where company_id = p_company_id
    and name in ('Conservador', 'Agressivo');

  insert into public.finance_scenario_assumptions (
    company_id, scenario_id, key, label, value_number, value_text, value_json, unit,
    applies_to_account_id, applies_to_department_id, applies_to_project_id, applies_to_squad_id
  )
  values
    (p_company_id, v_base, 'growth_rate', 'Taxa de crescimento', 0, null, null, '%', null, null, null, null),
    (p_company_id, v_conservative, 'growth_rate', 'Taxa de crescimento', -5, null, null, '%', null, null, null, null),
    (p_company_id, v_aggressive, 'growth_rate', 'Taxa de crescimento', 12, null, null, '%', null, null, null, null)
  on conflict do nothing;
end;
$$;

create or replace function public.handle_finance_module_enabled()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.module_key = 'FINANCE' and new.enabled = true and (old.enabled is distinct from new.enabled) then
    perform public.seed_finance_scenarios(new.company_id, coalesce(new.updated_at::text::uuid, null));
  end if;
  return new;
end;
$$;