create or replace function public.create_notification(
  p_user_id uuid,
  p_title text,
  p_actor_user_id uuid default null,
  p_content text default null,
  p_href text default null,
  p_notif_type text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester_company uuid;
  v_target_company uuid;
  v_notification_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select company_id
    into v_requester_company
  from public.profiles
  where id = auth.uid();

  if v_requester_company is null then
    raise exception 'Requester profile not found';
  end if;

  select company_id
    into v_target_company
  from public.profiles
  where id = p_user_id;

  if v_target_company is null then
    raise exception 'Target profile not found';
  end if;

  if v_target_company <> v_requester_company then
    raise exception 'Cannot notify user from another company';
  end if;

  if p_actor_user_id is not null and p_actor_user_id <> auth.uid() then
    raise exception 'actor_user_id must match current user';
  end if;

  insert into public.notifications (
    user_id,
    actor_user_id,
    title,
    content,
    href,
    notif_type
  )
  values (
    p_user_id,
    coalesce(p_actor_user_id, auth.uid()),
    p_title,
    p_content,
    p_href,
    p_notif_type
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

revoke all on function public.create_notification(uuid, text, uuid, text, text, text) from public;
grant execute on function public.create_notification(uuid, text, uuid, text, text, text) to authenticated;