-- Allow a consultant to return a signed PDF when the primary Google Workspace
-- signing route is unavailable. The file remains quarantined and never marks
-- the agreement complete; DeepBridge must still countersign and upload the
-- completed pack and supporting audit evidence.

alter table public.signature_envelopes
  drop constraint if exists signature_envelopes_provider_check;

alter table public.signature_envelopes
  add constraint signature_envelopes_provider_check
  check (
    provider in (
      'google_workspace',
      'manual_upload',
      'docusign',
      'dropbox_sign',
      'adobe_sign'
    )
  );
