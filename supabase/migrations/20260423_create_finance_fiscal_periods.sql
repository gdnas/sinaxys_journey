-- Finance fiscal periods
create table if not exists public.finance_fiscal_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_type text not null,
  fiscal_year integer not null,
  fiscal_quarter integer null,
  fiscal_month integer null,
  label text not null,
  start_date date not null,
  end_date date not null,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_fiscal_periods_period_type_check
    check (period_type in ('month', 'quarter', 'year')),
  constraint finance_fiscal_periods_quarter_check
    check (fiscal_quarter is null or fiscal_quarter between 1 and 4),
  constraint finance_fiscal_periods_month_check
    check (fiscal_month is null or fiscal_month between 1 and 12),
  constraint finance_fiscal_periods_month_rule_check
    check (
      (period_type = 'month' and fiscal_month is not null and fiscal_quarter is not null)
      or (period_type = 'quarter' and fiscal_quarter is not null and fiscal_month is null)
      or (period_type = 'year' and fiscal_quarter is null and fiscal_month is null)
    )
);

alter table public.finance_fiscal_periods enable row level security;

create policy "finance_fiscal_periods_select_company"
on public.finance_fiscal_periods
for select
to authenticated
using (is_member_of_company(company_id));

create policy "finance_fiscal_periods_insert_admin"
on public.finance_fiscal_periods
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
      and p.company_id = finance_fiscal_periods.company_id
  )
);

create policy "finance_fiscal_periods_update_admin"
on public.finance_fiscal_periods
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
      and p.company_id = finance_fiscal_periods.company_id
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
      and p.company_id = finance_fiscal_periods.company_id
  )
);

create policy "finance_fiscal_periods_delete_admin"
on public.finance_fiscal_periods
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
      and p.company_id = finance_fiscal_periods.company_id
  )
);

create index if not exists finance_fiscal_periods_company_id_idx
  on public.finance_fiscal_periods (company_id);

create index if not exists finance_fiscal_periods_period_type_idx
  on public.finance_fiscal_periods (period_type);

create index if not exists finance_fiscal_periods_fiscal_year_idx
  on public.finance_fiscal_periods (fiscal_year);

create index if not exists finance_fiscal_periods_start_date_idx
  on public.finance_fiscal_periods (start_date);

create unique index if not exists finance_fiscal_periods_unique_month
  on public.finance_fiscal_periods (company_id, period_type, fiscal_year, fiscal_quarter, fiscal_month)
  where period_type = 'month';

create unique index if not exists finance_fiscal_periods_unique_quarter
  on public.finance_fiscal_periods (company_id, period_type, fiscal_year, fiscal_quarter)
  where period_type = 'quarter';

create unique index if not exists finance_fiscal_periods_unique_year
  on public.finance_fiscal_periods (company_id, period_type, fiscal_year)
  where period_type = 'year';

create or replace function public.set_finance_fiscal_periods_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_finance_fiscal_periods_updated_at on public.finance_fiscal_periods;
create trigger trg_finance_fiscal_periods_updated_at
before update on public.finance_fiscal_periods
for each row execute function public.set_finance_fiscal_periods_updated_at();

create or replace function public.seed_finance_fiscal_periods(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_now date := current_date;
  v_year integer := extract(year from current_date);
  v_month_start date;
  v_month_end date;
  v_month integer;
  v_quarter integer;
  v_year_start date;
  v_year_end date;
  v_q integer;
  v_y integer;
begin
  perform set_config('row_security', 'off', true);

  for v_month in 1..12 loop
    null;
  end loop;

  for v_month in 1..24 loop
    v_month_start := date_trunc('month', (v_now + make_interval(months => v_month - 13))::timestamp)::date;
    v_month_end := (date_trunc('month', v_month_start::timestamp) + interval '1 month - 1 day')::date;
    v_quarter := ((extract(month from v_month_start)::int - 1) / 3) + 1;

    insert into public.finance_fiscal_periods (
      company_id, period_type, fiscal_year, fiscal_quarter, fiscal_month, label, start_date, end_date, is_closed
    )
    values (
      p_company_id,
      'month',
      extract(year from v_month_start)::int,
      v_quarter,
      extract(month from v_month_start)::int,
      to_char(v_month_start, 'Mon YYYY'),
      v_month_start,
      v_month_end,
      false
    )
    on conflict do nothing;
  end loop;

  for v_q in 0..7 loop
    v_month_start := date_trunc('quarter', (v_now + make_interval(months => (v_q - 2) * 3))::timestamp)::date;
    v_month_end := (date_trunc('quarter', v_month_start::timestamp) + interval '3 month - 1 day')::date;

    insert into public.finance_fiscal_periods (
      company_id, period_type, fiscal_year, fiscal_quarter, fiscal_month, label, start_date, end_date, is_closed
    )
    values (
      p_company_id,
      'quarter',
      extract(year from v_month_start)::int,
      extract(quarter from v_month_start)::int,
      null,
      'Q' || extract(quarter from v_month_start)::int || ' ' || extract(year from v_month_start)::int,
      v_month_start,
      v_month_end,
      false
    )
    on conflict do nothing;
  end loop;

  for v_y in 0..1 loop
    v_year_start := make_date(v_year + v_y - 1, 1, 1);
    v_year_end := make_date(v_year + v_y - 1, 12, 31);

    insert into public.finance_fiscal_periods (
      company_id, period_type, fiscal_year, fiscal_quarter, fiscal_month, label, start_date, end_date, is_closed
    )
    values (
      p_company_id,
      'year',
      extract(year from v_year_start)::int,
      null,
      null,
      extract(year from v_year_start)::int::text,
      v_year_start,
      v_year_end,
      false
    )
    on conflict do nothing;
  end loop;
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
    perform public.seed_finance_fiscal_periods(new.company_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_handle_finance_module_enabled on public.company_modules;
create trigger trg_handle_finance_module_enabled
after insert or update on public.company_modules
for each row execute function public.handle_finance_module_enabled();

create or replace function public.get_current_period(p_company_id uuid)
returns table (
  id uuid,
  company_id uuid,
  period_type text,
  fiscal_year integer,
  fiscal_quarter integer,
  fiscal_month integer,
  label text,
  start_date date,
  end_date date,
  is_closed boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
as $$
  select *
  from public.finance_fiscal_periods p
  where p.company_id = p_company_id
    and p.start_date <= current_date
    and p.end_date >= current_date
  order by
    case p.period_type
      when 'month' then 1
      when 'quarter' then 2
      else 3
    end
  limit 1;
$$;

create or replace function public.get_period_by_date(p_company_id uuid, p_date date)
returns table (
  id uuid,
  company_id uuid,
  period_type text,
  fiscal_year integer,
  fiscal_quarter integer,
  fiscal_month integer,
  label text,
  start_date date,
  end_date date,
  is_closed boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
as $$
  select *
  from public.finance_fiscal_periods p
  where p.company_id = p_company_id
    and p.start_date <= p_date
    and p.end_date >= p_date
  order by
    case p.period_type
      when 'month' then 1
      when 'quarter' then 2
      else 3
    end
  limit 1;
$$;

create or replace function public.get_period_range(p_company_id uuid, p_start date, p_end date)
returns setof public.finance_fiscal_periods
language sql
stable
as $$
  select *
  from public.finance_fiscal_periods p
  where p.company_id = p_company_id
    and p.start_date <= p_end
    and p.end_date >= p_start
  order by p.start_date asc;
$$;