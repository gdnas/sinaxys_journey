-- Finance audit corrections

alter table public.finance_accounts
  add column if not exists account_type text,
  add column if not exists parent_account_id uuid,
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_active boolean not null default true;

update public.finance_accounts
set account_type = 'opex'
where account_type is null;

alter table public.finance_accounts
  alter column account_type set not null;

alter table public.finance_accounts
  add constraint finance_accounts_account_type_check
  check (account_type in ('revenue', 'cogs', 'opex', 'capex', 'other'));

alter table public.finance_accounts
  add constraint finance_accounts_parent_account_id_fkey
  foreign key (parent_account_id) references public.finance_accounts(id) on delete set null;

create index if not exists finance_accounts_company_parent_sort_idx
  on public.finance_accounts (company_id, parent_account_id, sort_order);

create index if not exists finance_accounts_company_account_type_idx
  on public.finance_accounts (company_id, account_type);

create index if not exists finance_accounts_company_is_active_idx
  on public.finance_accounts (company_id, is_active);

create or replace function public.finance_version_lines_select_allowed(p_company_id uuid, p_department_id uuid)
returns boolean
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare
  v_role text;
  v_department_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;
  perform set_config('row_security', 'off', true);
  select role, department_id into v_role, v_department_id from public.profiles where id = auth.uid();
  if v_role = 'MASTERADMIN' then
    return true;
  end if;
  if v_role = 'ADMIN' then
    return public.finance_can_access_company(p_company_id);
  end if;
  if v_role = 'HEAD' then
    return public.finance_can_access_company(p_company_id) and p_department_id = v_department_id;
  end if;
  return false;
end;
$$;

drop policy if exists finance_version_lines_select on public.finance_version_lines;
drop policy if exists finance_version_lines_insert on public.finance_version_lines;

create policy finance_version_lines_select on public.finance_version_lines
for select to authenticated
using (public.finance_version_lines_select_allowed(company_id, department_id));

create policy finance_version_lines_insert on public.finance_version_lines
for insert to authenticated
with check (public.finance_version_lines_select_allowed(company_id, department_id));
