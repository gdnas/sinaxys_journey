create or replace function public.sync_okr_objective_okr_level()
returns trigger
language plpgsql
as $$
begin
  if new.okr_level is null then
    new.okr_level := case when new.level = 'COMPANY' then 'strategic' else 'tactical' end;
  end if;

  if new.level = 'COMPANY' and new.okr_level <> 'strategic' then
    new.okr_level := 'strategic';
  elsif new.level <> 'COMPANY' and new.okr_level <> 'tactical' then
    new.okr_level := 'tactical';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_okr_objective_okr_level on public.okr_objectives;
create trigger trg_sync_okr_objective_okr_level
before insert or update on public.okr_objectives
for each row execute function public.sync_okr_objective_okr_level();