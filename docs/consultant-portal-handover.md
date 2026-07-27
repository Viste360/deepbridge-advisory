# DeepBridge Consultant Portal — implementation handover

Handover date: 26 July 2026

## Outcome

The repository now contains a separate consultant-portal surface designed for
`portal.deepbridgeadvisory.com`. The existing public marketing site remains
unchanged at its existing routes.

The portal includes:

- invitation-only email magic-link access;
- optional Google sign-in for already invited identities;
- HTTP-only, same-site, secure session cookies using PKCE;
- consultant and administrator roles;
- a consultant dashboard with assignment details and progress;
- separate agreements, acknowledgements and informational documents;
- administrator-recorded Google Workspace eSignature requests;
- completed Google PDF and audit-trail import with a dual security-scan gate;
- private final PDFs and signing certificates;
- secure compliance uploads with file constraints and a malware-scan gate;
- consultant-visible and administrator-only onboarding tasks;
- an administrator invitation, document, compliance and audit interface;
- short-lived signed document links;
- row-level security for consultant-owned records;
- database-backed API rate limiting;
- event logging without document contents or unnecessary identity data;
- portal-specific `noindex`, private-cache and no-referrer controls; and
- a local-only review mode that is removed automatically from production
  behaviour.

## Important security decisions

### Authentication

Portal tokens are held in HTTP-only cookies and are exchanged server-side using
Supabase's PKCE flow. The browser does not keep the authenticated session in
local storage. Every protected endpoint verifies the user with Supabase before
reading the portal profile.

Magic-link requests use `shouldCreateUser: false`. Google sign-in is additionally
restricted by the Before User Created database hook, which allows only an email
with a live administrator-created invitation.

### Authorisation

The migration enables row-level security on every portal table. Consultants can
read only their own profile, assignment membership, assigned documents,
compliance records, visible onboarding tasks, notifications and audit events.
Administrator rights are checked server-side and in database policies.

### Documents and signing

The portal cannot set a document to `completed` from a browser click. Google
Workspace sends the personal signing request from Drive. A DeepBridge
administrator imports the completed PDF and Google audit trail, but the final
status is written only after both files pass the malware-scanning callback.

Approved source PDFs, completed PDFs and certificates are delivered through
five-minute signed links after ownership is checked. Completed versions are not
overwritten.

### Compliance uploads

Uploads are restricted to PDF, JPG and PNG, with a 10 MB maximum enforced in
the browser, API, database and storage bucket. The API creates a one-file signed
upload URL scoped to the consultant and requirement. New files remain
`pending` and cannot be viewed or accepted by an administrator until the
malware scanning service reports `clean`.

The scanning callback validates a shared secret. The scanning service itself is
an external operational dependency and must be connected before production.

## Production configuration

### 1. Supabase

1. Create a production Supabase project in the approved region.
2. Apply `supabase/migrations/202607260001_consultant_portal.sql`.
3. Confirm that all three storage buckets are private:
   `portal-documents`, `consultant-compliance` and `signed-documents`.
4. In Auth URL Configuration, set:
   - Site URL: `https://portal.deepbridgeadvisory.com`
   - Redirect URL: `https://portal.deepbridgeadvisory.com/auth/callback`
5. Require email confirmation and disable anonymous sign-ins.
6. Before enabling the invitation hook, create the initial DeepBridge
   administrator in Supabase Auth, then insert a
   matching `portal_profiles` row with `role = 'admin'` and
   `access_status = 'active'`. Use a named individual administrator account,
   not a shared mailbox.
7. Configure the Before User Created hook:
   `pg-functions://postgres/public/hook_restrict_portal_signup`
8. Enable Google only after its OAuth client uses the Supabase callback URL and
   the invitation hook has been tested.
9. Configure the desired session/JWT lifetime and Supabase attack-protection
   limits.
10. Set and test the documented backup, point-in-time recovery and retention
    arrangements.

The checked-in `supabase/config.toml` contains the local form of the invitation
hook configuration. Hosted-project configuration should be confirmed in the
Supabase dashboard after applying the migration.

### 2. Approved portal documents

1. Obtain approved final PDFs from DeepBridge/counsel.
2. In **Administration → Documents**, choose **Add approved PDF**.
3. Select the document, confirm the suggested version label and choose the PDF.
4. Keep the matching master PDF in the restricted DeepBridge Drive folder.
5. Choose **Upload and queue publication**.
6. The portal uploads the PDF privately, calculates its SHA-256 checksum and
   records the exact version, administrator and assignment.
7. The PDF remains quarantined until the external scanner reports `clean`.
   It is then locked and assigned automatically to the consultant. Any
   incomplete prior version is marked superseded; its record and file remain
   available to authorised administrators.

The repository does not invent agreement wording. No contractual PDF was
supplied with the brief, so the product currently provides the secure viewer
and version-control workflow without fabricating legal content.

### 3. Google Workspace eSignature and Drive

Follow `docs/google-workspace-signing-guide.md`.

1. Enable eSignature for named DeepBridge administrators in the Workspace Admin
   console.
2. Use the restricted shared drive `DeepBridge Consultant Agreements` and its
   numbered source, in-signature, completed-agreement and audit-trail folders.
3. Send the request from the approved PDF in Drive.
4. Record `request sent` and `consultant signed` from **Administration →
   Signing**.
5. After DeepBridge countersigns, upload the completed PDF and Google audit
   trail through **Upload completed pack**.
6. The portal publishes neither file until both security scans report `clean`.

Google does not currently provide a public embedded eSignature API. The portal
therefore keeps the Google event and Drive archive operationally separate from
its access-controlled delivery copies.

### 4. Malware scanning

Connect the chosen scanning service or internal scanner to new objects in the
`consultant-compliance`, `portal-documents` and `signed-documents` buckets. The
scanner must:

1. retrieve the quarantined object through service credentials;
2. inspect the real file contents, not only its extension or claimed MIME type;
3. call `/api/compliance/scan-callback` with the submission UUID and one of
   `clean`, `infected` or `failed`;
4. authenticate using `MALWARE_SCAN_CALLBACK_SECRET`; and
5. delete or isolate infected content according to the approved incident and
   retention process.

The portal fails closed: an unscanned or failed file cannot be opened or
accepted in the administrator interface.

The same callback accepts administrator document uploads with
`objectType = document_version` and `objectId = <version UUID>`. A clean result
locks and publishes the new version; an infected or failed result leaves it
unpublished.

Completed Google signing packs require two callbacks with
`objectType = signature_artifact`, the signature-envelope UUID as `objectId`,
and `artifactKind = final` or `certificate`. The assigned document becomes
complete only after both artifacts report `clean`.

### 5. Hosting and DNS

Use a separate Vercel project/domain alias for the portal or attach the portal
subdomain to the existing project. The checked-in routing uses a host condition
so all portal paths resolve to the portal application while `/api/*` remains
server-side.

Set the production environment values from `.env.example`. Values without a
`VITE_` prefix are server-only and must never be exposed in browser bundles.
In particular, protect:

- `SUPABASE_SERVICE_ROLE_KEY`
- `DOCUSIGN_PRIVATE_KEY`
- `DOCUSIGN_CONNECT_HMAC_SECRET`
- `MALWARE_SCAN_CALLBACK_SECRET`

Point `portal.deepbridgeadvisory.com` to the reviewed production deployment
only after preview approval. Verify the portal-specific `X-Robots-Tag`,
`Cache-Control`, `Referrer-Policy`, CSP and robots response after the DNS change.

## Initial Roland onboarding

After the production environment is connected:

1. Sign in as the named DeepBridge administrator.
2. Open **Consultants** and create Roland's invitation using his confirmed
   private business email and legal business name.
3. The server creates his consultant record, links the Planning Cluster Lead
   assignment, assigns the default documents and compliance requirements, and
   creates consultant-visible and internal onboarding tasks.
4. Confirm the invitation email is delivered and branded correctly.
5. Complete a non-sensitive test upload before requesting identity, banking or
   tax records.
6. Send each Google signing request only after its approved source version has
   passed the portal publication checks.

The placeholder email used by the local review data must not be treated as
Roland's real address.

## Environment values

The full inventory is in `.env.example`.

Browser-visible:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_AUTH_ENABLED=false` until the reviewed OAuth client is active

Server-only:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORTAL_PUBLIC_URL`
- `PORTAL_SIGNING_PROVIDER=google_workspace`
- malware scanner callback secret

`VITE_PORTAL_DEMO_MODE` works only in a development build. Production code
cannot enable local review access.

## Verification completed

- ESLint: pass
- strict browser TypeScript: pass
- strict server TypeScript: pass
- unit tests: 5 pass
- production Vite build: pass
- cached production-dependency audit: 0 known vulnerabilities
- portal sample role separation: pass
- production demo bypass check: enforced in code
- private storage and row-level policies: included in migration
- server-only signature completion: enforced by the dual scan callback
- malware-scan gate before review: enforced in UI and database function

A live Supabase migration, email delivery, Google OAuth, Workspace eSignature,
malware scan and DNS test could not be performed without the corresponding
account configuration, approved files and domain control. These are mandatory
preview checks before production release.

## Release gate

Do not promote the portal to production until all of the following are recorded:

- privacy notice and portal terms approved for the actual data flow;
- data processing terms and international-transfer position approved for
  Supabase, Vercel, Google Workspace and the scanning provider;
- lawful-basis and retention schedule approved for each document category;
- approved agreement/policy PDFs uploaded and checksummed;
- invitation hook tested against email and Google attempts;
- row-level access tested with two consultant accounts;
- access revocation tested without record deletion;
- malware clean, infected and failed paths tested;
- signed PDF and audit-trail clean, infected and failed paths tested;
- final PDF and certificate retrieval tested;
- email deliverability and support addresses confirmed;
- mobile, keyboard and screen-reader review completed on the hosted preview;
- backup and restore test completed; and
- DeepBridge preview approval recorded.

## Rollback

Keep the existing public website deployment available. If portal release
validation fails, remove the portal domain alias or promote the previous Vercel
deployment and revoke affected sessions in Supabase. Suspend outstanding Google
signature requests separately. Do not delete portal records during rollback.
