# Timesheet hosting and release notes

Released on 9 September 2026. The production deployment is ready and has been
promoted successfully. Both database migrations are applied. The `.com`
timesheet shortcut has been attached to Vercel and its Cloudflare DNS record
saved; HTTPS and the public redirect are still being verified.

## Entry address

The released application uses the existing portal address:

`https://portal.deepbridgeadvisory.com/timesheets`

The configured short address redirects to that portal route:

`https://timesheet.deepbridgeadvisory.com`

Public HTTPS verification for this shortcut is pending. The originally
requested UK address can be added later when its DNS account is available:

`https://timesheet.deepbridgeadvisory.co.uk`

Redirecting to the existing portal keeps its secure authentication cookies,
Supabase callback URL and invitation-only access on the existing portal origin.
The sign-in flow preserves `/timesheets` as the destination after sign-in.

## Verified hosting state

| Item | State on 9 September 2026 |
| --- | --- |
| Linked Vercel team | `viste-s-team`, ID `team_2KTybN7xr57UfIcKUM09KLbX` |
| Linked Vercel project | `deepbridge-advisory`, ID `prj_o8HzTebZTaqav1A1D9NP82AYXxh6` |
| Existing project domains | `deepbridgeadvisory.com`, `www.deepbridgeadvisory.com`, `portal.deepbridgeadvisory.com`, `timesheet.deepbridgeadvisory.com` and Vercel deployment aliases |
| Current production deployment | `dpl_EQ5CSEUujGFces8GLsWYHwHQiAwT`, status `READY`, promoted successfully |
| Production deployment URL | `https://deepbridge-advisory-cv03mg3mw-viste-s-team.vercel.app` |
| Prior production / rollback deployment | `dpl_AefkKuz3WutMx7E2fA8ehAsvSSYd` |
| Isolated release directory | `/private/tmp/deepbridge-timesheets-release-20260909T095417Z` |
| Release base | Prior production commit `313eba621413bf5ed0374728e97e0b58c7ed96ca` and local commit `bfdfa1221132c44ab3cb46fef9fcae47f9388760` share Git tree `46db4d42c36427509392540e272968b57336940f` |
| Applied weekly form migration | `20260909100027_weekly_timesheets` |
| Applied supplier record migration | `20260909100040_supplier_service_records` |
| Existing portal DNS | `portal.deepbridgeadvisory.com` CNAME to `7c7eec9270a5961a.vercel-dns-016.com` |
| UK public website | `.co.uk` and `www.co.uk` are attached to separate Vercel project `deepbridge-advisory-ozhu` under the same team |
| UK domain DNS provider | Cloudflare, nameservers `amos.ns.cloudflare.com` and `tegan.ns.cloudflare.com` |
| `.com` DNS provider | Cloudflare, nameservers `jeremy.ns.cloudflare.com` and `lila.ns.cloudflare.com` |
| Requested UK timesheet hostname | Not configured; the UK zone is absent from the signed-in Cloudflare account |
| Configured `.com` shortcut | Vercel domain attached; Cloudflare CNAME `timesheet` → `7c7eec9270a5961a.vercel-dns-016.com`, DNS only, automatic TTL; HTTPS verification pending |

The existing portal returned HTTP 200 with `noindex, nofollow, noarchive`,
`Cache-Control: private, no-store` and `Referrer-Policy: no-referrer`.
The UK public website returned HTTP 200 through Cloudflare and Vercel.

Vercel CLI authentication was verified as `dustdeep`. Domain commands must
include `--scope viste-s-team`; the CLI's default personal scope does not have
access to these domains. The following cached CLI is available locally:

```sh
VERCEL_TELEMETRY_DISABLED=1 NO_UPDATE_NOTIFIER=1 node "/Users/yonwallace/.npm/_npx/69f9afb961c37556/node_modules/vercel/dist/vc.js" whoami
```

Cloudflare access was established through the signed-in browser. The account
contains the `deepbridgeadvisory.com` zone, where the shortcut record was saved.
It does not contain the `deepbridgeadvisory.co.uk` zone. Access to that zone is
needed only to add the optional UK shortcut.

## Released backend and validation

The main entry now accepts supplier-authored PDF service records, with the
weekly hours form as an optional convenience. A supplier may use its own
document format and upload a PDF covering the relevant service period, with
an optional service summary and invoice reference. PDF size is limited to
10 MB. Spreadsheet originals can be exported to PDF before uploading.

The service-record endpoints are:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/service-records/list` | Submitted records visible to the current supplier or administrator, plus active projects |
| `POST /api/service-records/upload-url` | Validate project membership, save trusted metadata and issue a unique, non-overwriting signed upload token |
| `POST /api/service-records/finalize` | Verify the registered file's size, MIME type and PDF byte markers, hash it and request scanning |
| `POST /api/service-records/access` | Issue a five-minute attachment URL to the owner or administrator only after a clean scan |

Finalization accepts only `recordId`; file paths, owners and other metadata
are taken from the record created by the server. An unavailable scanner leaves
the record submitted but quarantined, returning HTTP 202 with a warning and
`scanStatus: failed`. Calling finalization again retries the scan of that same
immutable file. Clean and infected results cannot be overwritten. New file
contents require a new service record.

`supabase/migrations/20260909100040_supplier_service_records.sql` was applied
before the API release. It creates the private `supplier-service-records` bucket,
owner/admin row visibility and server-only writes. Its trigger preserves the
submitted metadata and PDF hash and records submission and scan events in the
audit history. There are no direct browser storage read or write policies for
this bucket: uploads and cleared downloads use scoped signed URLs.

### Scanner compatibility

All four required scanner variable names are configured in production:
`MALWARE_SCAN_PROVIDER`, `MALWARE_SCAN_SERVICE_URL`,
`MALWARE_SCAN_TRIGGER_SECRET` and `MALWARE_SCAN_CALLBACK_SECRET`.

The currently deployed scanner accepts a fixed set of envelope types. Service
records therefore use its existing `compliance_submission` **transport
envelope**, with a server-generated service-record UUID and the actual
`supplier-service-records` bucket and path. This does not create a compliance
submission or categorize the supplier's file as compliance evidence.

The authenticated callback explicitly resolves the UUID against
`supplier_service_records`. If it matches, the callback updates only that
service record's pending scan state. If it does not match, the existing
compliance callback runs as before. Database lookup errors and the exceptional
case of a UUID appearing in both tables fail closed. This compatibility adapter
allows the existing scanner deployment to scan service records. The source
also supports the explicit `supplier_service_record` envelope for a future
scanner update, but no scanner deployment is required for the adapter.

For future environments, the database migration must precede the API deployment
because legacy compliance callbacks perform the service-record lookup before
dispatch. The release sets Vercel's duration for
`api/service-records/finalize.ts` to 300 seconds to match the existing synchronous
scanner request timeout.

The rollback verification in `supabase/tests/supplier_service_records.sql`
passed on 9 September 2026: immutable metadata/hash, active project membership,
scan retry and terminal state restrictions, atomic audit records, owner/admin
visibility, denial to another supplier, and denial of direct storage downloads.
Test fixtures were rolled back. The production migrations remain applied.
HTTP tests cover upload ownership,
metadata spoofing, quarantine, attachment URL expiry, failed-scan retry,
compatibility dispatch and preserved compliance behavior.

Vercel's production environment has the portal's Supabase browser and server
configuration, service role credential and `PORTAL_PUBLIC_URL`. Only variable
names and existence were inspected; secret values were not printed.

Preview currently has `MALWARE_SCAN_PROVIDER` and `VITE_GOOGLE_AUTH_ENABLED`,
but lacks the Supabase and portal configuration. A normal preview deployment
will therefore not provide a functional authenticated timesheet workflow.
Use the local review mode for the UI and an isolated configured backend for a
hosted functional preview. The local review mode is intentionally unavailable
in production builds.

The isolated release passed 121 automated checks and a real Vercel build with
zero TypeScript errors. The deployment source returned HTTP 200 for the portal
entry and HTTP 401 for unauthenticated protected endpoints during staging
verification. Promotion to production succeeded.

A real authenticated supplier upload, external malware scan and administrator
download have not yet been performed as an end-to-end production test. Public
HTTPS and redirect verification for the new `.com` shortcut is also pending.
These limits are separate from the passing API tests and transactional database
checks; they should be recorded when those live checks are completed.

## Release isolation

The release was built from an isolated copy at
`/private/tmp/deepbridge-timesheets-release-20260909T095417Z`, based on the
production-equivalent committed tree with the reviewed timesheet and supplier
record changes applied. This kept unrelated, uncommitted contract and
organisation changes, including existing edits in `PortalApp.tsx` and
`portalApi.ts`, out of the deployment. The original checkout and its unrelated
work remain intact.

For a future release from this shared checkout:

1. Export a clean copy of the committed tree with `git archive HEAD` into a
   temporary release directory. The tree comparison above confirms this base
   matched the prior deployment for this release; recheck the live production
   source before choosing the base for a later release.
2. Apply a reviewed patch containing only the timesheet feature, its routing
   and sign-in destination changes. For files with pre-existing edits, include
   only the new timesheet hunks; do not copy the entire dirty file.
3. Copy only the linked project's `.vercel/project.json` metadata into the
   temporary release directory, so deployment targets `deepbridge-advisory`.
   Do not package local environment files, credentials, unrelated output,
   Supabase temporary state or other applications.
4. Run the repository checks and the timesheet-specific workflow checks in
   this isolated directory. Verify the resulting source diff against the
   exported base.
5. Deploy the reviewed release using the existing project's production
   configuration, then verify the production deployment and canonical
   `/timesheets` entry. Record the new deployment ID and rollback ID.
6. Keep the original checkout and its unrelated changes intact.

Recheck the live production source before each release so an intervening
deployment is preserved.

## Add the optional UK shortcut

The `.com` shortcut is already configured. Once access to the UK Cloudflare
zone is available:

1. Attach only `timesheet.deepbridgeadvisory.co.uk` to the existing
   `deepbridge-advisory` Vercel project in team `viste-s-team`. Keep the UK apex
   and `www` domains on their current project.
2. Read the exact DNS target provided for that newly attached hostname by
   Vercel. In Cloudflare's `deepbridgeadvisory.co.uk` zone, create a CNAME with
   name `timesheet` and that target. Start with **DNS only** while Vercel
   validates the domain and provisions HTTPS. Use Vercel's returned target;
   the existing portal CNAME above is evidence of the current portal setup,
   not a guaranteed target for a newly added hostname.
3. Deploy the host-specific redirect to
   `https://portal.deepbridgeadvisory.com/timesheets`. The shortcut should
   redirect all user-facing paths to the timesheet entry rather than serve a
   second authenticated portal origin.
4. Confirm DNS propagation, Vercel domain validation and a valid HTTPS
   certificate. Check the shortcut redirects to the expected canonical URL.
5. Verify that an invited consultant follows the shortcut, signs in and
   arrives at their own timesheet. Confirm the same flow works when already
   signed in, and that an uninvited visitor cannot access saved data.

Vercel's pre-attachment domain inspection also offered an A record at
`76.76.21.21`; prefer the current project-specific CNAME target returned after
attachment. No nameserver changes or UK apex record changes are required.

The canonical portal URL remains the entry while UK DNS access is unavailable.
Do not describe the UK shortcut as live until its DNS and redirect have both
been checked.

## Rollback

The recorded prior production deployment is
`dpl_AefkKuz3WutMx7E2fA8ehAsvSSYd`. Revert to the deployment that was current
immediately before this feature's release if runtime verification fails.
Keep persisted timesheet records and audit history. The new DNS shortcut can
be removed independently without changing either public website's domains.
