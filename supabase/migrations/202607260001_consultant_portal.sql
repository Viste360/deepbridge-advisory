-- DeepBridge Consultant Portal
-- Production schema, access controls, private storage policies and initial catalogue.

create extension if not exists pgcrypto;

create type public.portal_role as enum ('consultant', 'admin');
create type public.portal_access_status as enum (
  'invited',
  'active',
  'revoked'
);
create type public.portal_document_category as enum (
  'signature',
  'acknowledgement',
  'information'
);
create type public.portal_document_status as enum (
  'not_reviewed',
  'ready_to_sign',
  'awaiting_deepbridge',
  'completed',
  'superseded',
  'read'
);
create type public.portal_compliance_status as enum (
  'missing',
  'uploaded',
  'under_review',
  'accepted',
  'rejected',
  'expired'
);
create type public.portal_scan_status as enum (
  'pending',
  'clean',
  'infected',
  'failed'
);

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trading_name text,
  company_number text,
  country_code text not null,
  organisation_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.portal_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  business_name text,
  role public.portal_role not null default 'consultant',
  invited_by uuid references auth.users(id),
  invited_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz
);

create unique index portal_invitations_open_email_idx
  on public.portal_invitations (lower(email))
  where accepted_at is null and revoked_at is null;

create table public.portal_profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  email text not null,
  full_name text not null,
  business_name text,
  country text,
  phone text,
  role public.portal_role not null default 'consultant',
  access_status public.portal_access_status not null default 'invited',
  email_verified_at timestamptz,
  invited_at timestamptz,
  access_revoked_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consultants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.portal_profiles(id) on delete restrict,
  organisation_id uuid references public.organisations(id) on delete restrict,
  legal_name text not null,
  business_name text,
  country_code text not null,
  tax_residency_country_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  contracting_organisation_id uuid not null references public.organisations(id),
  customer_organisation_id uuid references public.organisations(id),
  end_customer_organisation_id uuid references public.organisations(id),
  title text not null,
  programme text not null,
  primary_location text not null,
  start_date date not null,
  expected_end_display text not null,
  onsite_expectation text not null,
  currency char(3) not null,
  daily_rate numeric(12, 2) not null check (daily_rate >= 0),
  trial_period text not null,
  notice_terms text not null,
  accommodation_terms text not null,
  travel_terms text not null,
  contact_name text not null,
  contact_role text not null,
  contact_email text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assignment_consultants (
  assignment_id uuid not null references public.assignments(id) on delete restrict,
  consultant_id uuid not null references public.consultants(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (assignment_id, consultant_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  category public.portal_document_category not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete restrict,
  assignment_id uuid references public.assignments(id) on delete restrict,
  version_label text not null,
  source_storage_path text,
  provider_template_id text,
  content_sha256 text,
  original_filename text,
  mime_type text check (mime_type is null or mime_type = 'application/pdf'),
  size_bytes bigint check (
    size_bytes is null or (size_bytes > 0 and size_bytes <= 26214400)
  ),
  malware_scan_status public.portal_scan_status not null default 'pending',
  malware_scanned_at timestamptz,
  effective_at timestamptz not null default now(),
  superseded_at timestamptz,
  locked_at timestamptz,
  created_by uuid references public.portal_profiles(id),
  created_at timestamptz not null default now(),
  unique (document_id, version_label)
);

create table public.assigned_documents (
  id uuid primary key default gen_random_uuid(),
  consultant_id uuid not null references public.portal_profiles(id) on delete restrict,
  assignment_id uuid references public.assignments(id) on delete restrict,
  document_version_id uuid not null references public.document_versions(id) on delete restrict,
  status public.portal_document_status not null default 'not_reviewed',
  assigned_at timestamptz not null default now(),
  viewed_at timestamptz,
  completed_at timestamptz,
  final_storage_path text,
  certificate_storage_path text,
  superseded_at timestamptz,
  unique (consultant_id, assignment_id, document_version_id)
);

create table public.signature_envelopes (
  id uuid primary key default gen_random_uuid(),
  assigned_document_id uuid not null references public.assigned_documents(id) on delete restrict,
  provider text not null check (
    provider in ('google_workspace', 'docusign', 'dropbox_sign', 'adobe_sign')
  ),
  external_envelope_id text unique,
  provider_status text not null default 'created',
  consultant_recipient_id text,
  deepbridge_recipient_id text,
  created_by uuid not null references public.portal_profiles(id),
  sent_at timestamptz,
  consultant_signed_at timestamptz,
  completed_at timestamptz,
  last_webhook_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.acknowledgements (
  id uuid primary key default gen_random_uuid(),
  assigned_document_id uuid not null references public.assigned_documents(id) on delete restrict,
  consultant_id uuid not null references public.portal_profiles(id) on delete restrict,
  document_version_id uuid not null references public.document_versions(id) on delete restrict,
  acknowledged_at timestamptz not null default now(),
  unique (assigned_document_id, consultant_id, document_version_id)
);

create table public.compliance_requirements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  required_by_default boolean not null default true,
  has_expiry boolean not null default false,
  sort_order integer not null default 0,
  retention_months integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consultant_compliance_requirements (
  id uuid primary key default gen_random_uuid(),
  consultant_id uuid not null references public.portal_profiles(id) on delete restrict,
  assignment_id uuid references public.assignments(id) on delete restrict,
  requirement_id uuid not null references public.compliance_requirements(id) on delete restrict,
  required boolean not null,
  waived_at timestamptz,
  waived_by uuid references public.portal_profiles(id),
  created_at timestamptz not null default now(),
  unique (consultant_id, assignment_id, requirement_id)
);

create table public.compliance_submissions (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.consultant_compliance_requirements(id) on delete restrict,
  consultant_id uuid not null references public.portal_profiles(id) on delete restrict,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null check (
    mime_type in ('application/pdf', 'image/jpeg', 'image/png')
  ),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  status public.portal_compliance_status not null default 'uploaded',
  malware_scan_status public.portal_scan_status not null default 'pending',
  malware_scanned_at timestamptz,
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references public.portal_profiles(id),
  expiry_date date,
  administrator_note text,
  rejection_reason text,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  consultant_id uuid not null references public.portal_profiles(id) on delete restrict,
  assignment_id uuid references public.assignments(id) on delete restrict,
  task_key text not null,
  title text not null,
  description text not null,
  complete boolean not null default false,
  internal boolean not null default false,
  completed_at timestamptz,
  completed_by uuid references public.portal_profiles(id),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (consultant_id, assignment_id, task_key)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.portal_profiles(id),
  actor_label text,
  action text not null,
  object_type text not null,
  object_id text,
  assignment_id uuid references public.assignments(id),
  consultant_id uuid references public.portal_profiles(id),
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_consultant_created_idx
  on public.audit_events (consultant_id, created_at desc);
create index audit_events_assignment_created_idx
  on public.audit_events (assignment_id, created_at desc);
create index compliance_submissions_consultant_idx
  on public.compliance_submissions (consultant_id, uploaded_at desc);
create index assigned_documents_consultant_idx
  on public.assigned_documents (consultant_id, assigned_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.portal_profiles(id) on delete restrict,
  notification_type text not null,
  subject text not null,
  delivery_provider text,
  provider_message_id text,
  delivery_status text not null default 'queued',
  sent_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.api_rate_limits (
  rate_key text not null,
  action text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1,
  primary key (rate_key, action)
);

create or replace function public.is_portal_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.portal_profiles
    where id = auth.uid()
      and role = 'admin'
      and access_status = 'active'
  );
$$;

create or replace function public.has_active_portal_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.portal_profiles
    where id = auth.uid()
      and access_status = 'active'
  );
$$;

revoke all on function public.is_portal_admin() from public;
revoke all on function public.has_active_portal_access() from public;
grant execute on function public.is_portal_admin() to authenticated;
grant execute on function public.has_active_portal_access() to authenticated;

alter table public.organisations enable row level security;
alter table public.portal_invitations enable row level security;
alter table public.portal_profiles enable row level security;
alter table public.consultants enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_consultants enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.assigned_documents enable row level security;
alter table public.signature_envelopes enable row level security;
alter table public.acknowledgements enable row level security;
alter table public.compliance_requirements enable row level security;
alter table public.consultant_compliance_requirements enable row level security;
alter table public.compliance_submissions enable row level security;
alter table public.onboarding_tasks enable row level security;
alter table public.audit_events enable row level security;
alter table public.notifications enable row level security;
alter table public.api_rate_limits enable row level security;

create policy "active users read organisations"
  on public.organisations for select
  to authenticated
  using (public.has_active_portal_access());

create policy "admins manage organisations"
  on public.organisations for all
  to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "admins manage invitations"
  on public.portal_invitations for all
  to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "users read own profile"
  on public.portal_profiles for select
  to authenticated
  using (id = auth.uid() and access_status = 'active');

create policy "admins manage profiles"
  on public.portal_profiles for all
  to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "consultants read own consultant record"
  on public.consultants for select
  to authenticated
  using (user_id = auth.uid() or public.is_portal_admin());

create policy "admins manage consultants"
  on public.consultants for all
  to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "consultants read assigned assignments"
  on public.assignments for select
  to authenticated
  using (
    public.is_portal_admin()
    or exists (
      select 1
      from public.assignment_consultants ac
      join public.consultants c on c.id = ac.consultant_id
      where ac.assignment_id = assignments.id
        and ac.removed_at is null
        and c.user_id = auth.uid()
    )
  );

create policy "admins manage assignments"
  on public.assignments for all
  to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "consultants read own memberships"
  on public.assignment_consultants for select
  to authenticated
  using (
    public.is_portal_admin()
    or exists (
      select 1 from public.consultants c
      where c.id = assignment_consultants.consultant_id
        and c.user_id = auth.uid()
    )
  );

create policy "admins manage memberships"
  on public.assignment_consultants for all
  to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "active users read document catalogue"
  on public.documents for select
  to authenticated
  using (public.has_active_portal_access());

create policy "active users read assigned document versions"
  on public.document_versions for select
  to authenticated
  using (
    public.is_portal_admin()
    or exists (
      select 1 from public.assigned_documents ad
      where ad.document_version_id = document_versions.id
        and ad.consultant_id = auth.uid()
    )
  );

create policy "admins manage documents"
  on public.documents for all
  to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "admins manage document versions"
  on public.document_versions for all
  to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "consultants read assigned documents"
  on public.assigned_documents for select
  to authenticated
  using (consultant_id = auth.uid() or public.is_portal_admin());

create policy "admins manage assigned documents"
  on public.assigned_documents for all
  to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "consultants read own signature envelopes"
  on public.signature_envelopes for select
  to authenticated
  using (
    public.is_portal_admin()
    or exists (
      select 1 from public.assigned_documents ad
      where ad.id = signature_envelopes.assigned_document_id
        and ad.consultant_id = auth.uid()
    )
  );

create policy "consultants read own acknowledgements"
  on public.acknowledgements for select
  to authenticated
  using (consultant_id = auth.uid() or public.is_portal_admin());

create policy "active users read compliance catalogue"
  on public.compliance_requirements for select
  to authenticated
  using (public.has_active_portal_access());

create policy "consultants read own compliance requirements"
  on public.consultant_compliance_requirements for select
  to authenticated
  using (consultant_id = auth.uid() or public.is_portal_admin());

create policy "admins manage compliance requirements"
  on public.compliance_requirements for all
  to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "admins assign compliance requirements"
  on public.consultant_compliance_requirements for all
  to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "consultants read own compliance submissions"
  on public.compliance_submissions for select
  to authenticated
  using (consultant_id = auth.uid() or public.is_portal_admin());

create policy "consultants create own compliance submissions"
  on public.compliance_submissions for insert
  to authenticated
  with check (
    consultant_id = auth.uid()
    and status = 'uploaded'
    and malware_scan_status = 'pending'
    and exists (
      select 1
      from public.consultant_compliance_requirements ccr
      where ccr.id = compliance_submissions.requirement_id
        and ccr.consultant_id = auth.uid()
    )
  );

create policy "admins manage compliance submissions"
  on public.compliance_submissions for all
  to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "consultants read visible onboarding tasks"
  on public.onboarding_tasks for select
  to authenticated
  using (
    public.is_portal_admin()
    or (consultant_id = auth.uid() and internal = false)
  );

create policy "admins manage onboarding tasks"
  on public.onboarding_tasks for all
  to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "consultants read own audit events"
  on public.audit_events for select
  to authenticated
  using (consultant_id = auth.uid() or public.is_portal_admin());

create policy "consultants read own notifications"
  on public.notifications for select
  to authenticated
  using (recipient_id = auth.uid() or public.is_portal_admin());

create or replace function public.acknowledge_document(
  requested_document_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_record public.assigned_documents;
  version_record public.document_versions;
  document_record public.documents;
begin
  select * into assigned_record
  from public.assigned_documents
  where id = requested_document_id
    and consultant_id = auth.uid()
  for update;

  if assigned_record.id is null then
    raise exception 'Assigned document not found';
  end if;

  select * into version_record
  from public.document_versions
  where id = assigned_record.document_version_id;

  select * into document_record
  from public.documents
  where id = version_record.document_id;

  if document_record.category <> 'acknowledgement' then
    raise exception 'This document does not use acknowledgement';
  end if;

  insert into public.acknowledgements (
    assigned_document_id,
    consultant_id,
    document_version_id
  )
  values (
    assigned_record.id,
    auth.uid(),
    version_record.id
  )
  on conflict do nothing;

  update public.assigned_documents
  set status = 'read',
      completed_at = coalesce(completed_at, now())
  where id = assigned_record.id;

  insert into public.audit_events (
    actor_id,
    actor_label,
    action,
    object_type,
    object_id,
    assignment_id,
    consultant_id
  )
  select
    auth.uid(),
    p.full_name,
    'acknowledgement_completed',
    'assigned_document',
    assigned_record.id::text,
    assigned_record.assignment_id,
    auth.uid()
  from public.portal_profiles p
  where p.id = auth.uid();
end;
$$;

revoke all on function public.acknowledge_document(uuid) from public;
grant execute on function public.acknowledge_document(uuid) to authenticated;

create or replace function public.review_compliance_submission(
  requested_submission_id uuid,
  requested_status text,
  requested_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  submission_record public.compliance_submissions;
begin
  if not public.is_portal_admin() then
    raise exception 'Administrator access required';
  end if;

  if requested_status not in ('accepted', 'rejected') then
    raise exception 'Invalid review status';
  end if;

  select * into submission_record
  from public.compliance_submissions
  where id = requested_submission_id
  for update;

  if submission_record.id is null then
    raise exception 'Submission not found';
  end if;

  if submission_record.malware_scan_status <> 'clean' then
    raise exception 'Security scan must pass before review';
  end if;

  update public.compliance_submissions
  set status = requested_status::public.portal_compliance_status,
      reviewed_at = now(),
      reviewer_id = auth.uid(),
      administrator_note = requested_note,
      rejection_reason = case
        when requested_status = 'rejected' then requested_note
        else null
      end,
      updated_at = now()
  where id = requested_submission_id;

  insert into public.audit_events (
    actor_id,
    actor_label,
    action,
    object_type,
    object_id,
    consultant_id
  )
  select
    auth.uid(),
    reviewer.full_name,
    'file_' || requested_status,
    'compliance_submission',
    submission_record.id::text,
    submission_record.consultant_id
  from public.portal_profiles reviewer
  where reviewer.id = auth.uid();
end;
$$;

revoke all on function public.review_compliance_submission(uuid, text, text) from public;
grant execute on function public.review_compliance_submission(uuid, text, text) to authenticated;

create or replace function public.consume_portal_rate_limit(
  requested_rate_key text,
  requested_action text,
  requested_limit integer,
  requested_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_record public.api_rate_limits;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required';
  end if;

  insert into public.api_rate_limits (
    rate_key,
    action,
    window_started_at,
    request_count
  )
  values (
    requested_rate_key,
    requested_action,
    now(),
    1
  )
  on conflict (rate_key, action) do update
  set window_started_at = case
        when api_rate_limits.window_started_at <
          now() - make_interval(secs => requested_window_seconds)
        then now()
        else api_rate_limits.window_started_at
      end,
      request_count = case
        when api_rate_limits.window_started_at <
          now() - make_interval(secs => requested_window_seconds)
        then 1
        else api_rate_limits.request_count + 1
      end
  returning * into current_record;

  return current_record.request_count <= requested_limit;
end;
$$;

revoke all on function public.consume_portal_rate_limit(text, text, integer, integer) from public;
grant execute on function public.consume_portal_rate_limit(text, text, integer, integer) to service_role;

create or replace function public.hook_restrict_portal_signup(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  candidate_email text;
begin
  candidate_email := lower(event->'user'->>'email');

  if exists (
    select 1
    from public.portal_invitations
    where lower(email) = candidate_email
      and revoked_at is null
      and expires_at > now()
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error',
    jsonb_build_object(
      'http_code', 403,
      'message', 'A valid DeepBridge invitation is required.'
    )
  );
end;
$$;

revoke all on function public.hook_restrict_portal_signup(jsonb) from public;
grant execute on function public.hook_restrict_portal_signup(jsonb) to supabase_auth_admin;

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

create trigger on_auth_user_created_for_portal
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.handle_portal_user_created();

create or replace view public.portal_assignment_summary
with (security_invoker = true)
as
select
  a.id,
  a.title,
  a.programme,
  customer.legal_name as customer_name,
  end_customer.legal_name as end_customer_name,
  a.primary_location,
  a.start_date,
  a.expected_end_display,
  a.onsite_expectation,
  concat(
    case a.currency when 'EUR' then '€' else a.currency || ' ' end,
    trim(trailing '.00' from a.daily_rate::text),
    ' per day'
  ) as daily_rate_display,
  a.trial_period,
  a.notice_terms,
  a.accommodation_terms,
  a.travel_terms,
  a.contact_name,
  a.contact_role,
  a.contact_email
from public.assignments a
left join public.organisations customer on customer.id = a.customer_organisation_id
left join public.organisations end_customer on end_customer.id = a.end_customer_organisation_id;

create or replace view public.portal_document_summary
with (security_invoker = true)
as
select
  ad.id,
  d.title,
  d.description,
  d.category,
  ad.status,
  dv.version_label,
  greatest(dv.created_at, ad.assigned_at) as updated_at,
  ad.completed_at,
  ad.final_storage_path,
  ad.certificate_storage_path,
  d.sort_order
from public.assigned_documents ad
join public.document_versions dv on dv.id = ad.document_version_id
join public.documents d on d.id = dv.document_id;

create or replace view public.portal_compliance_summary
with (security_invoker = true)
as
select
  ccr.id,
  cr.title,
  cr.description,
  ccr.required,
  coalesce(latest.status, 'missing'::public.portal_compliance_status) as status,
  latest.uploaded_at,
  latest.expiry_date,
  latest.administrator_note,
  latest.rejection_reason,
  latest.id as submission_id,
  latest.malware_scan_status,
  cr.sort_order
from public.consultant_compliance_requirements ccr
join public.compliance_requirements cr on cr.id = ccr.requirement_id
left join lateral (
  select cs.*
  from public.compliance_submissions cs
  where cs.requirement_id = ccr.id
    and cs.superseded_at is null
  order by cs.uploaded_at desc
  limit 1
) latest on true;

create or replace view public.portal_onboarding_summary
with (security_invoker = true)
as
select
  id,
  title,
  description,
  complete,
  internal,
  sort_order
from public.onboarding_tasks;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'consultant-compliance',
  'consultant-compliance',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portal-documents',
  'portal-documents',
  false,
  52428800,
  array['application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'signed-documents',
  'signed-documents',
  false,
  52428800,
  array['application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "consultants upload to own quarantine folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'consultant-compliance'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.has_active_portal_access()
  );

create policy "consultants read own compliance objects"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'consultant-compliance'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_portal_admin()
    )
  );

create policy "admins manage compliance objects"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'consultant-compliance'
    and public.is_portal_admin()
  )
  with check (
    bucket_id = 'consultant-compliance'
    and public.is_portal_admin()
  );

create policy "consultants read assigned final documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'signed-documents'
    and (
      public.is_portal_admin()
      or exists (
        select 1
        from public.assigned_documents ad
        where ad.consultant_id = auth.uid()
          and (
            ad.final_storage_path = storage.objects.name
            or ad.certificate_storage_path = storage.objects.name
          )
      )
    )
  );

create policy "consultants read assigned source documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'portal-documents'
    and (
      public.is_portal_admin()
      or exists (
        select 1
        from public.assigned_documents ad
        join public.document_versions dv on dv.id = ad.document_version_id
        where ad.consultant_id = auth.uid()
          and dv.source_storage_path = storage.objects.name
      )
    )
  );

create policy "admins manage source documents"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'portal-documents'
    and public.is_portal_admin()
  )
  with check (
    bucket_id = 'portal-documents'
    and public.is_portal_admin()
  );

insert into public.organisations (
  id,
  legal_name,
  trading_name,
  company_number,
  country_code,
  organisation_type
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'DustDeep Ltd',
    'DeepBridge Advisory',
    '16775578',
    'GB',
    'contracting_company'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'SNECI SAS',
    null,
    null,
    'FR',
    'customer'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'Heinz-Glas GmbH & Co. KGaA',
    null,
    null,
    'DE',
    'end_customer'
  )
on conflict (id) do nothing;

insert into public.assignments (
  id,
  contracting_organisation_id,
  customer_organisation_id,
  end_customer_organisation_id,
  title,
  programme,
  primary_location,
  start_date,
  expected_end_display,
  onsite_expectation,
  currency,
  daily_rate,
  trial_period,
  notice_terms,
  accommodation_terms,
  travel_terms,
  contact_name,
  contact_role,
  contact_email
)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  'Planning Cluster Lead',
  'SAP S/4HANA Business Transformation Programme',
  'Kleintettau, Bavaria, Germany',
  '2026-08-03',
  'Approximately March 2027, subject to customer requirements',
  'Approximately four to five days per week',
  'EUR',
  500,
  'One month',
  'Thirty calendar days, subject to customer-led termination rights',
  'Arranged and paid directly by the Customer',
  'Reasonable agreed fuel and vehicle travel costs reimbursed by DeepBridge against receipts and journey records',
  'Yon Wallace',
  'DeepBridge commercial contact',
  'yon@deepbridgeadvisory.co.uk'
)
on conflict (id) do nothing;

insert into public.documents (slug, title, description, category, sort_order)
values
  ('framework', 'Professional Consulting Services Framework Agreement', 'The overarching terms for the independent consulting engagement with DeepBridge.', 'signature', 10),
  ('sow-planning-cluster-lead', 'Statement of Work — Planning Cluster Lead', 'Assignment-specific scope, commercial terms, location and expected duration.', 'signature', 20),
  ('charter', 'Professional Consultant Charter Acknowledgement', 'Professional standards and working principles for DeepBridge consultants.', 'signature', 30),
  ('customer-nda', 'Customer NDA', 'Customer confidentiality terms, when required.', 'signature', 40),
  ('commercial-policy', 'Commercial Administration Policy', 'Timesheets, purchase orders, invoicing and administration.', 'acknowledgement', 50),
  ('travel-policy', 'Travel, Expenses and Invoicing Policy', 'Evidence, approval and submission requirements for reimbursable costs.', 'acknowledgement', 60),
  ('security-ai-policy', 'Information Security and AI Policy', 'Rules for customer information, systems, devices and AI-assisted tools.', 'acknowledgement', 70),
  ('customer-requirements', 'Customer-Specific Requirements', 'Practical controls and working requirements for the assignment.', 'acknowledgement', 80),
  ('deliverables', 'Deliverables and Acceptance Criteria', 'Expected outputs, review points and acceptance approach.', 'acknowledgement', 90),
  ('welcome-letter', 'Welcome Letter', 'A short introduction to DeepBridge and onboarding contacts.', 'information', 100),
  ('mobilisation-pack', 'Project Mobilisation Pack', 'First-day information and practical mobilisation guidance.', 'information', 110),
  ('invoice-instructions', 'Invoice instructions', 'Instructions for preparing and submitting invoices.', 'information', 120),
  ('expense-instructions', 'Expense instructions', 'Instructions for agreed reimbursable expenses.', 'information', 130)
on conflict (slug) do nothing;

insert into public.compliance_requirements (
  slug,
  title,
  description,
  required_by_default,
  has_expiry,
  sort_order,
  retention_months
)
values
  ('business-registration', 'German business registration', 'Current registration evidence for the consulting business.', true, false, 10, 84),
  ('vat-confirmation', 'VAT confirmation', 'Current German VAT registration confirmation.', true, false, 20, 84),
  ('tax-information', 'Tax information', 'Tax information required for contracting and invoicing.', true, false, 30, 84),
  ('professional-indemnity', 'Professional indemnity certificate', 'Current policy schedule or certificate of insurance.', true, true, 40, 84),
  ('public-liability', 'Public liability certificate', 'Current public liability insurance evidence.', true, true, 50, 84),
  ('identity', 'Passport or national identity document', 'Identity evidence for proportionate verification.', true, true, 60, 12),
  ('bank-confirmation', 'Bank confirmation', 'Account ownership evidence for payment control.', true, false, 70, 84),
  ('a1-certificate', 'A1 certificate', 'Cross-border social security certificate where applicable.', false, true, 80, 84),
  ('cv', 'Curriculum vitae', 'Current professional profile.', true, false, 90, 36),
  ('certifications', 'Professional certifications', 'Relevant professional or technical certifications.', false, true, 100, 36)
on conflict (slug) do nothing;

create or replace function public.bootstrap_invited_consultant(
  requested_user_id uuid,
  requested_full_name text,
  requested_business_name text,
  requested_country_code text default 'DE'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  consultant_record_id uuid;
  assignment_record_id uuid := '20000000-0000-4000-8000-000000000001';
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required';
  end if;

  insert into public.consultants (
    user_id,
    legal_name,
    business_name,
    country_code,
    tax_residency_country_code
  )
  values (
    requested_user_id,
    requested_full_name,
    requested_business_name,
    requested_country_code,
    requested_country_code
  )
  on conflict (user_id) do update
  set legal_name = excluded.legal_name,
      business_name = excluded.business_name,
      updated_at = now()
  returning id into consultant_record_id;

  insert into public.assignment_consultants (
    assignment_id,
    consultant_id
  )
  values (
    assignment_record_id,
    consultant_record_id
  )
  on conflict (assignment_id, consultant_id) do update
  set removed_at = null;

  insert into public.assigned_documents (
    consultant_id,
    assignment_id,
    document_version_id,
    status
  )
  select
    requested_user_id,
    assignment_record_id,
    dv.id,
    'not_reviewed'::public.portal_document_status
  from public.document_versions dv
  join public.documents d on d.id = dv.document_id
  where dv.superseded_at is null
    and dv.malware_scan_status = 'clean'
    and dv.locked_at is not null
    and d.slug <> 'customer-nda'
  on conflict (consultant_id, assignment_id, document_version_id) do nothing;

  insert into public.consultant_compliance_requirements (
    consultant_id,
    assignment_id,
    requirement_id,
    required
  )
  select
    requested_user_id,
    assignment_record_id,
    id,
    required_by_default
  from public.compliance_requirements
  on conflict (consultant_id, assignment_id, requirement_id) do nothing;

  insert into public.onboarding_tasks (
    consultant_id,
    assignment_id,
    task_key,
    title,
    description,
    internal,
    sort_order
  )
  values
    (requested_user_id, assignment_record_id, 'profile', 'Profile completed', 'Contact and business details supplied.', false, 10),
    (requested_user_id, assignment_record_id, 'agreement', 'Framework Agreement signed', 'Complete the Google Workspace signature request sent by DeepBridge.', false, 20),
    (requested_user_id, assignment_record_id, 'sow', 'Statement of Work signed', 'Complete the Google Workspace signature request and await countersignature.', false, 30),
    (requested_user_id, assignment_record_id, 'charter', 'Charter acknowledged', 'Complete the Professional Consultant Charter acknowledgement.', false, 40),
    (requested_user_id, assignment_record_id, 'insurance', 'Insurance uploaded', 'Upload current insurance evidence.', false, 50),
    (requested_user_id, assignment_record_id, 'registration', 'Business registration uploaded', 'Upload current business registration evidence.', false, 60),
    (requested_user_id, assignment_record_id, 'tax', 'Tax and VAT details supplied', 'Provide tax and VAT information.', false, 70),
    (requested_user_id, assignment_record_id, 'bank', 'Banking details supplied', 'Upload secure bank confirmation.', false, 80),
    (requested_user_id, assignment_record_id, 'identity', 'Identity document supplied', 'Upload identity evidence.', false, 90),
    (requested_user_id, assignment_record_id, 'systems', 'Customer systems ready', 'DeepBridge will confirm when customer access is ready.', false, 100),
    (requested_user_id, assignment_record_id, 'first-day', 'First day confirmed', 'DeepBridge will confirm final arrival details.', false, 110),
    (requested_user_id, assignment_record_id, 'references-internal', 'References verified', 'Internal DeepBridge check.', true, 120),
    (requested_user_id, assignment_record_id, 'customer-approval-internal', 'Customer approval recorded', 'Internal DeepBridge check.', true, 130),
    (requested_user_id, assignment_record_id, 'documents-internal', 'Identity and registration verified', 'Internal DeepBridge check.', true, 140)
  on conflict (consultant_id, assignment_id, task_key) do nothing;

  update public.onboarding_tasks
  set complete = true,
      completed_at = now()
  where consultant_id = requested_user_id
    and assignment_id = assignment_record_id
    and task_key = 'profile';

  insert into public.audit_events (
    action,
    actor_label,
    object_type,
    object_id,
    assignment_id,
    consultant_id
  )
  values (
    'invitation_created',
    'DeepBridge Administrator',
    'portal_profile',
    requested_user_id::text,
    assignment_record_id,
    requested_user_id
  );
end;
$$;

revoke all on function public.bootstrap_invited_consultant(uuid, text, text, text) from public;
grant execute on function public.bootstrap_invited_consultant(uuid, text, text, text) to service_role;
