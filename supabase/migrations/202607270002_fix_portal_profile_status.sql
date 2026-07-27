create or replace function public.handle_portal_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_record public.portal_invitations;
begin
  select * into invitation_record
  from public.portal_invitations
  where lower(email) = lower(new.email)
    and revoked_at is null
    and expires_at > now()
  order by invited_at desc
  limit 1
  for update;

  if invitation_record.id is null then
    return new;
  end if;

  insert into public.portal_profiles (
    id,
    email,
    full_name,
    business_name,
    role,
    access_status,
    email_verified_at,
    invited_at
  )
  values (
    new.id,
    new.email,
    invitation_record.full_name,
    invitation_record.business_name,
    invitation_record.role,
    case
      when new.email_confirmed_at is null
      then 'invited'::public.portal_access_status
      else 'active'::public.portal_access_status
    end,
    new.email_confirmed_at,
    invitation_record.invited_at
  )
  on conflict (id) do update
  set email = excluded.email,
      email_verified_at = excluded.email_verified_at,
      access_status = case
        when excluded.email_verified_at is null then portal_profiles.access_status
        else 'active'::public.portal_access_status
      end,
      updated_at = now();

  update public.portal_invitations
  set accepted_at = coalesce(accepted_at, now())
  where id = invitation_record.id;

  return new;
end;
$$;
