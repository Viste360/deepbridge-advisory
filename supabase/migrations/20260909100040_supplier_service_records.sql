-- Supplier-authored service records. Uploads are independent commercial records,
-- not employee attendance. Only server endpoints may mutate rows or storage.
create table public.supplier_service_records (
  id uuid primary key default gen_random_uuid(),
  consultant_id uuid not null references public.portal_profiles(id) on delete restrict,
  assignment_id uuid not null references public.assignments(id) on delete restrict,
  period_start date not null check (period_start >= date '0001-01-01'),
  period_end date not null check (period_end >= period_start and period_end <= date '9999-12-31'),
  summary text not null default '' check (length(summary) <= 2000),
  invoice_reference text not null default '' check (length(invoice_reference) <= 120),
  original_filename text not null check (length(original_filename) between 5 and 240 and lower(original_filename) like '%.pdf'),
  mime_type text not null check (mime_type = 'application/pdf'),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  storage_path text not null unique,
  content_sha256 text check (content_sha256 ~ '^[0-9a-f]{64}$'),
  status text not null default 'uploading' check (status in ('uploading', 'submitted')),
  scan_status public.portal_scan_status not null default 'pending',
  submitted_at timestamptz,
  scanned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (storage_path = consultant_id::text || '/' || id::text || '.pdf'),
  check ((status = 'uploading' and submitted_at is null and content_sha256 is null and scan_status = 'pending' and scanned_at is null)
    or (status = 'submitted' and submitted_at is not null and content_sha256 is not null)),
  check ((scan_status = 'pending' and scanned_at is null) or (scan_status <> 'pending' and scanned_at is not null))
);

create index supplier_service_records_consultant_created_idx
  on public.supplier_service_records (consultant_id, created_at desc);
create index supplier_service_records_assignment_idx
  on public.supplier_service_records (assignment_id);

alter table public.supplier_service_records enable row level security;
revoke all on public.supplier_service_records from anon, authenticated;
grant select on public.supplier_service_records to authenticated;
grant select, insert, update, delete on public.supplier_service_records to service_role;

create policy "active consultants and administrators read service records"
  on public.supplier_service_records for select to authenticated
  using (public.has_active_portal_access() and (consultant_id = (select auth.uid()) or public.is_portal_admin()));

create or replace function public.protect_supplier_service_record()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'uploading' then
      raise exception 'Submitted supplier records are immutable' using errcode = '23514';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - array['status', 'content_sha256', 'submitted_at', 'scan_status', 'scanned_at', 'updated_at'])
      is distinct from (to_jsonb(old) - array['status', 'content_sha256', 'submitted_at', 'scan_status', 'scanned_at', 'updated_at']) then
      raise exception 'Supplier record metadata cannot be changed' using errcode = '23514';
    end if;
    if old.status = 'submitted' and (new.status <> 'submitted'
      or new.content_sha256 is distinct from old.content_sha256
      or new.submitted_at is distinct from old.submitted_at) then
      raise exception 'Submitted supplier records are immutable' using errcode = '23514';
    end if;
    if old.scan_status in ('clean', 'infected') and
      (new.scan_status is distinct from old.scan_status or new.scanned_at is distinct from old.scanned_at) then
      raise exception 'Completed security scans cannot be overwritten' using errcode = '23514';
    end if;
    if old.scan_status = 'failed' and new.scan_status not in ('failed', 'pending') then
      raise exception 'A failed security scan must be retried before clearance' using errcode = '23514';
    end if;
    new.updated_at := clock_timestamp();
  end if;

  if tg_op = 'INSERT' or (old.status = 'uploading' and new.status = 'submitted') then
    if tg_op = 'INSERT' and new.status <> 'uploading' then
      raise exception 'Supplier records must begin in upload quarantine' using errcode = '23514';
    end if;
    if not exists (
      select 1 from public.portal_profiles p
      join public.consultants c on c.user_id = p.id
      join public.assignment_consultants ac on ac.consultant_id = c.id
      join public.assignments a on a.id = ac.assignment_id
      where p.id = new.consultant_id and p.access_status = 'active'
        and a.id = new.assignment_id and a.status = 'active' and ac.removed_at is null
    ) then
      raise exception 'Supplier must have active access to the selected project' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.protect_supplier_service_record() from public;

create trigger protect_supplier_service_record
  before insert or update or delete on public.supplier_service_records
  for each row execute function public.protect_supplier_service_record();

create or replace function public.audit_supplier_service_record()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if old.status = 'uploading' and new.status = 'submitted' then
    insert into public.audit_events (actor_id, actor_label, action, object_type, object_id, consultant_id, assignment_id, metadata)
    values (new.consultant_id, 'Supplier upload', 'supplier_service_record_submitted', 'supplier_service_record', new.id::text,
      new.consultant_id, new.assignment_id, jsonb_build_object('sha256', new.content_sha256, 'size_bytes', new.size_bytes));
  elsif old.scan_status is distinct from new.scan_status then
    insert into public.audit_events (actor_label, action, object_type, object_id, consultant_id, assignment_id, metadata)
    values ('Security scanning service', 'supplier_service_record_scan_' || new.scan_status::text, 'supplier_service_record', new.id::text,
      new.consultant_id, new.assignment_id, jsonb_build_object('status', new.scan_status));
  end if;
  return new;
end;
$$;
revoke all on function public.audit_supplier_service_record() from public;
create trigger audit_supplier_service_record
  after update on public.supplier_service_records
  for each row execute function public.audit_supplier_service_record();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('supplier-service-records', 'supplier-service-records', false, 10485760, array['application/pdf'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Deliberately no storage.objects policy for this bucket. Server-created signed
-- upload URLs permit one immutable object; authenticated downloads are provided
-- only by the owner/admin API after scan clearance, with a five-minute expiry.
