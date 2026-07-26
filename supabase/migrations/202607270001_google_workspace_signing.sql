-- Google Workspace eSignature is operated from Drive. The portal records the
-- administrative workflow and releases completed artifacts only after both
-- files pass the malware scanning gate.

alter table public.signature_envelopes
  drop constraint if exists signature_envelopes_provider_check;

alter table public.signature_envelopes
  add constraint signature_envelopes_provider_check
  check (
    provider in (
      'google_workspace',
      'docusign',
      'dropbox_sign',
      'adobe_sign'
    )
  );

alter table public.signature_envelopes
  add column if not exists pending_final_storage_path text,
  add column if not exists pending_certificate_storage_path text,
  add column if not exists final_content_sha256 text,
  add column if not exists certificate_content_sha256 text,
  add column if not exists final_scan_status public.portal_scan_status,
  add column if not exists certificate_scan_status public.portal_scan_status;

alter table public.signature_envelopes
  drop constraint if exists signature_envelopes_final_sha256_check;

alter table public.signature_envelopes
  add constraint signature_envelopes_final_sha256_check
  check (
    final_content_sha256 is null
    or final_content_sha256 ~ '^[0-9a-f]{64}$'
  );

alter table public.signature_envelopes
  drop constraint if exists signature_envelopes_certificate_sha256_check;

alter table public.signature_envelopes
  add constraint signature_envelopes_certificate_sha256_check
  check (
    certificate_content_sha256 is null
    or certificate_content_sha256 ~ '^[0-9a-f]{64}$'
  );

create index if not exists signature_envelopes_assigned_created_idx
  on public.signature_envelopes (assigned_document_id, created_at desc);

-- A clean approved PDF is visible for review, but a Google signature request
-- is recorded separately by an administrator before it becomes actionable.
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
end;
$$;
