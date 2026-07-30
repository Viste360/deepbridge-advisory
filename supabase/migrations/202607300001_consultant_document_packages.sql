-- Hide documents removed from a consultant's active package while preserving
-- their immutable audit records for DeepBridge administrators.

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
join public.documents d on d.id = dv.document_id
where ad.status <> 'superseded'
  and ad.superseded_at is null;

drop policy if exists "consultants read assigned documents"
  on public.assigned_documents;
create policy "consultants read assigned documents"
  on public.assigned_documents for select
  to authenticated
  using (
    public.is_portal_admin()
    or (
      consultant_id = auth.uid()
      and status <> 'superseded'
      and superseded_at is null
    )
  );

drop policy if exists "active users read assigned document versions"
  on public.document_versions;
create policy "active users read assigned document versions"
  on public.document_versions for select
  to authenticated
  using (
    public.is_portal_admin()
    or exists (
      select 1
      from public.assigned_documents ad
      where ad.document_version_id = document_versions.id
        and ad.consultant_id = auth.uid()
        and ad.status <> 'superseded'
        and ad.superseded_at is null
    )
  );

drop policy if exists "consultants read own signature envelopes"
  on public.signature_envelopes;
create policy "consultants read own signature envelopes"
  on public.signature_envelopes for select
  to authenticated
  using (
    public.is_portal_admin()
    or exists (
      select 1
      from public.assigned_documents ad
      where ad.id = signature_envelopes.assigned_document_id
        and ad.consultant_id = auth.uid()
        and ad.status <> 'superseded'
        and ad.superseded_at is null
    )
  );

drop policy if exists "consultants read assigned final documents"
  on storage.objects;
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
          and ad.status <> 'superseded'
          and ad.superseded_at is null
          and (
            ad.final_storage_path = storage.objects.name
            or ad.certificate_storage_path = storage.objects.name
          )
      )
    )
  );

drop policy if exists "consultants read assigned source documents"
  on storage.objects;
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
        join public.document_versions dv
          on dv.id = ad.document_version_id
        where ad.consultant_id = auth.uid()
          and ad.status <> 'superseded'
          and ad.superseded_at is null
          and dv.source_storage_path = storage.objects.name
      )
    )
  );
