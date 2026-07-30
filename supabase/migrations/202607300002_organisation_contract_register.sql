-- DeepBridge-wide organisation and contract register.
-- External company access is intentionally not enabled in this migration:
-- only active DeepBridge administrators can manage or read these records.

alter table public.organisations
  add column if not exists relationship_types text[] not null default '{}',
  add column if not exists registered_address text,
  add column if not exists website text,
  add column if not exists tax_number text,
  add column if not exists notes text,
  add column if not exists active boolean not null default true;

update public.organisations
set relationship_types = case organisation_type
  when 'contracting_company' then array['deepbridge_entity']
  when 'customer' then array['client']
  when 'end_customer' then array['end_customer']
  else array[organisation_type]
end
where cardinality(relationship_types) = 0;

create table if not exists public.organisation_contacts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  full_name text not null,
  email text,
  job_title text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  title text not null,
  contract_type text not null check (
    contract_type in (
      'client_services',
      'consultant_supply',
      'partnership',
      'intercompany',
      'nda',
      'other'
    )
  ),
  owner_organisation_id uuid not null references public.organisations(id) on delete restrict,
  counterparty_organisation_id uuid not null references public.organisations(id) on delete restrict,
  assignment_id uuid references public.assignments(id) on delete restrict,
  description text,
  status text not null default 'security_review' check (
    status in (
      'draft',
      'security_review',
      'ready_to_sign',
      'out_for_signature',
      'partially_signed',
      'completed',
      'blocked',
      'superseded',
      'archived'
    )
  ),
  requires_signature boolean not null default true,
  effective_date date,
  expiry_date date,
  currency char(3),
  contract_value numeric(14, 2) check (
    contract_value is null or contract_value >= 0
  ),
  created_by uuid not null references public.portal_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contracts_counterparty_idx
  on public.contracts (counterparty_organisation_id, created_at desc);
create index if not exists contracts_status_idx
  on public.contracts (status, updated_at desc);

create table if not exists public.contract_parties (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete restrict,
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  party_role text not null check (
    party_role in (
      'deepbridge_entity',
      'client',
      'consultant_supplier',
      'partner',
      'affiliate',
      'other'
    )
  ),
  signatory_name text,
  signatory_email text,
  signature_required boolean not null default true,
  signing_order integer not null default 1 check (signing_order > 0),
  created_at timestamptz not null default now(),
  unique (contract_id, organisation_id, party_role)
);

create table if not exists public.contract_versions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete restrict,
  version_label text not null,
  source_storage_path text not null,
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  original_filename text not null,
  mime_type text not null check (mime_type = 'application/pdf'),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  malware_scan_status public.portal_scan_status not null default 'pending',
  malware_scanned_at timestamptz,
  locked_at timestamptz,
  drive_sync_status text not null default 'not_configured' check (
    drive_sync_status in ('not_configured', 'pending', 'synced', 'failed')
  ),
  drive_source_file_id text,
  drive_final_file_id text,
  drive_certificate_file_id text,
  drive_synced_at timestamptz,
  pending_final_storage_path text,
  pending_certificate_storage_path text,
  final_storage_path text,
  certificate_storage_path text,
  final_scan_status public.portal_scan_status not null default 'pending',
  certificate_scan_status public.portal_scan_status not null default 'pending',
  signed_at timestamptz,
  superseded_at timestamptz,
  created_by uuid not null references public.portal_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, version_label)
);

create index if not exists contract_versions_contract_idx
  on public.contract_versions (contract_id, created_at desc);

alter table public.organisation_contacts enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_parties enable row level security;
alter table public.contract_versions enable row level security;

create policy "admins manage organisation contacts"
  on public.organisation_contacts for all
  to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "admins manage contracts"
  on public.contracts for all
  to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "admins manage contract parties"
  on public.contract_parties for all
  to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

create policy "admins manage contract versions"
  on public.contract_versions for all
  to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contract-documents',
  'contract-documents',
  false,
  26214400,
  array['application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "admins manage contract files"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'contract-documents'
    and public.is_portal_admin()
  )
  with check (
    bucket_id = 'contract-documents'
    and public.is_portal_admin()
  );

insert into public.organisations (
  legal_name,
  trading_name,
  country_code,
  organisation_type,
  relationship_types
)
select
  'HS Consulting',
  'HS Consulting',
  'DE',
  'consultant_company',
  array['consultant_supplier']
where not exists (
  select 1
  from public.organisations
  where lower(coalesce(trading_name, legal_name)) = 'hs consulting'
);

update public.consultants consultant
set organisation_id = organisation.id,
    updated_at = now()
from public.organisations organisation
where consultant.organisation_id is null
  and lower(coalesce(consultant.business_name, consultant.legal_name)) =
      lower(coalesce(organisation.trading_name, organisation.legal_name));
