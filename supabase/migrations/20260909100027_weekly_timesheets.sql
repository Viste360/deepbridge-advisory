-- One private, atomic weekly record per consultant and project. The browser has
-- SELECT access only; authenticated API handlers own all mutations and CAS checks.
create function public.valid_timesheet_entries(week_start date, entries jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  day_record jsonb;
  day_index integer := 0;
  day_hours numeric;
begin
  if entries is null or jsonb_typeof(entries) <> 'array' then return false; end if;
  if jsonb_array_length(entries) <> 7 then return false; end if;
  for day_record in select value from jsonb_array_elements(entries) loop
    if jsonb_typeof(day_record) <> 'object'
      or jsonb_typeof(day_record->'date') is distinct from 'string'
      or jsonb_typeof(day_record->'hours') is distinct from 'number'
      or jsonb_typeof(day_record->'notes') is distinct from 'string'
      then return false;
    end if;
    if day_record->>'date' <> to_char(week_start + day_index, 'YYYY-MM-DD') then return false; end if;
    day_hours := (day_record->>'hours')::numeric;
    if day_hours < 0 or day_hours > 24 or day_hours <> round(day_hours, 2)
      or length(day_record->>'notes') > 2000
      then return false;
    end if;
    day_index := day_index + 1;
  end loop;
  return true;
end;
$$;
revoke all on function public.valid_timesheet_entries(date, jsonb) from public, anon, authenticated;
grant execute on function public.valid_timesheet_entries(date, jsonb) to service_role;

create table public.timesheets (
  id uuid primary key default gen_random_uuid(),
  consultant_id uuid not null references public.portal_profiles(id) on delete restrict,
  assignment_id uuid not null references public.assignments(id) on delete restrict,
  week_start date not null check (extract(isodow from week_start) = 1),
  entries jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'returned')),
  review_note text not null default '' check (length(review_note) <= 2000),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.portal_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timesheets_consultant_assignment_week_key unique (consultant_id, assignment_id, week_start),
  constraint timesheets_valid_entries check (public.valid_timesheet_entries(week_start, entries)),
  constraint timesheets_valid_review check (
    (status = 'draft' and submitted_at is null and reviewed_at is null and reviewed_by is null and review_note = '')
    or (status = 'submitted' and submitted_at is not null and reviewed_at is null and reviewed_by is null and review_note = '')
    or (status in ('approved', 'returned') and submitted_at is not null and reviewed_at is not null and reviewed_by is not null
      and (status <> 'returned' or length(btrim(review_note)) > 0))
  )
);

create index timesheets_assignment_idx on public.timesheets (assignment_id);
create index timesheets_reviewed_by_idx on public.timesheets (reviewed_by) where reviewed_by is not null;
create index timesheets_review_queue_idx on public.timesheets (status, week_start desc);
alter table public.timesheets enable row level security;

revoke all on public.timesheets from public, anon, authenticated;
grant select on public.timesheets to authenticated;
grant select, insert, update on public.timesheets to service_role;

create policy "active consultants read own timesheets and admins review all"
  on public.timesheets for select
  to authenticated
  using (
    (select public.has_active_portal_access())
    and (consultant_id = (select auth.uid()) or (select public.is_portal_admin()))
  );

create function public.guard_timesheet_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.valid_timesheet_entries(new.week_start, new.entries) then
    raise exception 'Invalid weekly entries' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then
    if (new.id, new.consultant_id, new.assignment_id, new.week_start, new.created_at)
      is distinct from (old.id, old.consultant_id, old.assignment_id, old.week_start, old.created_at) then
      raise exception 'Timesheet identity cannot change' using errcode = '23514';
    end if;
    if old.status = 'approved' then
      raise exception 'Approved timesheets are locked' using errcode = '23514';
    end if;
    if old.status = 'submitted' then
      if new.status not in ('approved', 'returned')
        or new.entries is distinct from old.entries
        or new.submitted_at is distinct from old.submitted_at then
        raise exception 'Submitted timesheets may only be reviewed' using errcode = '23514';
      end if;
      if not exists (
        select 1 from public.portal_profiles p
        where p.id = new.reviewed_by and p.role = 'admin' and p.access_status = 'active'
      ) then
        raise exception 'An active administrator must review this timesheet' using errcode = '42501';
      end if;
      new.reviewed_at := clock_timestamp();
    else
      if new.status not in (old.status, 'submitted') then
        raise exception 'Invalid timesheet transition' using errcode = '23514';
      end if;
      if new.status = old.status and
        (new.submitted_at, new.reviewed_at, new.reviewed_by, new.review_note)
          is distinct from (old.submitted_at, old.reviewed_at, old.reviewed_by, old.review_note) then
        raise exception 'Review details cannot be edited by the consultant' using errcode = '23514';
      end if;
    end if;
    -- A strictly increasing version prevents lost updates, including rapid saves.
    new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  else
    if new.status not in ('draft', 'submitted') then
      raise exception 'New timesheets must be drafts or submissions' using errcode = '23514';
    end if;
    new.created_at := clock_timestamp();
    new.updated_at := new.created_at;
  end if;

  if tg_op = 'INSERT' or old.status in ('draft', 'returned') then
    if not exists (
      select 1
      from public.portal_profiles p
      join public.consultants c on c.user_id = p.id
      join public.assignment_consultants ac on ac.consultant_id = c.id
      join public.assignments a on a.id = ac.assignment_id
      where p.id = new.consultant_id and p.access_status = 'active'
        and ac.assignment_id = new.assignment_id and ac.removed_at is null
        and a.status = 'active'
    ) then
      raise exception 'An active assigned consultant is required' using errcode = '42501';
    end if;
    if new.status = 'submitted' then
      if not exists (select 1 from jsonb_array_elements(new.entries) day where (day->>'hours')::numeric > 0) then
        raise exception 'Submitted timesheets need working hours' using errcode = '23514';
      end if;
      if exists (select 1 from jsonb_array_elements(new.entries) day where (day->>'hours')::numeric > 0 and length(btrim(day->>'notes')) = 0) then
        raise exception 'Submitted working days need work notes' using errcode = '23514';
      end if;
      new.submitted_at := clock_timestamp();
      new.reviewed_at := null;
      new.reviewed_by := null;
      new.review_note := '';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_timesheet_change() from public, anon, authenticated;
grant execute on function public.guard_timesheet_change() to service_role;
create trigger guard_timesheet_change before insert or update on public.timesheets
  for each row execute function public.guard_timesheet_change();

-- Audit records commit in the same transaction as the timesheet, so a failed
-- write cannot leave a false history and a successful write cannot lose it.
create function public.audit_timesheet_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid;
  event_action text;
begin
  actor := case when tg_op = 'UPDATE' and old.status = 'submitted' then new.reviewed_by else new.consultant_id end;
  event_action := case
    when new.status = 'submitted' then 'timesheet_submitted'
    when tg_op = 'UPDATE' and old.status = 'submitted' and new.status = 'approved' then 'timesheet_approved'
    when tg_op = 'UPDATE' and old.status = 'submitted' and new.status = 'returned' then 'timesheet_returned'
    else 'timesheet_saved'
  end;
  insert into public.audit_events (actor_id, actor_label, action, object_type, object_id, assignment_id, consultant_id, metadata)
  select actor, p.full_name, event_action, 'timesheet', new.id::text, new.assignment_id, new.consultant_id,
    jsonb_build_object('week_start', new.week_start, 'status', new.status,
      'total_hours', (select sum((day->>'hours')::numeric) from jsonb_array_elements(new.entries) day),
      'review_note', new.review_note)
  from public.portal_profiles p where p.id = actor;
  return new;
end;
$$;
revoke all on function public.audit_timesheet_change() from public, anon, authenticated;
grant execute on function public.audit_timesheet_change() to service_role;
create trigger audit_timesheet_change after insert or update on public.timesheets
  for each row execute function public.audit_timesheet_change();
