-- Give administrators enough consultant and file context to prepare and review
-- compliance evidence without exposing another consultant's records to a
-- consultant session. The view remains protected by the underlying RLS
-- policies because it is a security-invoker view.

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
  cr.sort_order,
  ccr.consultant_id,
  consultant.full_name as consultant_name,
  consultant.email as consultant_email,
  latest.original_filename,
  latest.mime_type,
  latest.size_bytes
from public.consultant_compliance_requirements ccr
join public.compliance_requirements cr on cr.id = ccr.requirement_id
join public.portal_profiles consultant on consultant.id = ccr.consultant_id
left join lateral (
  select cs.*
  from public.compliance_submissions cs
  where cs.requirement_id = ccr.id
    and cs.superseded_at is null
  order by cs.uploaded_at desc
  limit 1
) latest on true;
