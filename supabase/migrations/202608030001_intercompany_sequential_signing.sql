-- Sequential portal signing for intercompany contracts.
-- The verified upload remains immutable. The first portal signature is stored
-- as a protected intermediate PDF; the second produces the final executed PDF.

alter table public.contract_versions
  add column if not exists intermediate_storage_path text,
  add column if not exists intermediate_content_sha256 text check (
    intermediate_content_sha256 is null
    or intermediate_content_sha256 ~ '^[0-9a-f]{64}$'
  );

create table if not exists public.contract_signature_events (
  id uuid primary key default gen_random_uuid(),
  contract_version_id uuid not null references public.contract_versions(id) on delete restrict,
  contract_party_id uuid not null references public.contract_parties(id) on delete restrict,
  signing_order integer not null check (signing_order in (1, 2)),
  event_role text not null check (event_role in ('signature', 'countersignature')),
  organisation_name text not null,
  signer_name text not null,
  signer_email text,
  signer_title text not null,
  signed_at timestamptz not null,
  input_sha256 text not null check (input_sha256 ~ '^[0-9a-f]{64}$'),
  output_sha256 text not null check (output_sha256 ~ '^[0-9a-f]{64}$'),
  output_storage_path text not null,
  manual_placement jsonb not null,
  created_by uuid not null references public.portal_profiles(id),
  created_at timestamptz not null default now(),
  unique (contract_version_id, signing_order)
);

create index if not exists contract_signature_events_version_idx
  on public.contract_signature_events (contract_version_id, signing_order);

alter table public.contract_signature_events enable row level security;

create policy "admins manage contract signature events"
  on public.contract_signature_events for all
  to authenticated
  using (public.is_portal_admin())
  with check (public.is_portal_admin());

-- New intercompany uploads are signed by the owning entity first and the
-- affiliate second. Existing rows are interpreted this way by the API too.
update public.contract_parties party
set signing_order = case
  when party.organisation_id = contract.owner_organisation_id then 1
  else 2
end
from public.contracts contract
where party.contract_id = contract.id
  and contract.contract_type = 'intercompany';
