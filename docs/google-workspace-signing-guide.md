# DeepBridge portal — Google Workspace signing guide

## The operating model

Google Drive is DeepBridge's master document archive. The portal stores a
private delivery copy so that each consultant can access only the files assigned
to them.

Google Workspace eSignature remains the source of truth for the signing event.
The portal does not draw, capture or manufacture signatures. A document becomes
`Completed` in the portal only after the completed PDF and Google audit trail
have both passed the malware-scanning gate.

Do not make the Drive folder public and do not give consultants access to the
DeepBridge archive. Google sends each signer a personal eSignature email.

## One-time Google Workspace setup

1. Sign in to `admin.google.com` using the DeepBridge Workspace administrator.
2. Open **Apps → Google Workspace → Drive and Docs → eSignature**.
3. Set eSignature to **On** for the DeepBridge administrators who will send
   agreements.
4. In Google Drive, create a restricted shared-drive structure:

   - shared drive: `DeepBridge Consultant Agreements`
   - `01 Approved Source PDFs`
   - `02 In Signature`
   - `03 Completed Signed Agreements`
   - `04 Google eSignature Audit Trails`

5. Give access only to named DeepBridge administrators. Do not use
   `Anyone with the link`.
6. Keep compliance, identity, banking and tax records in separate restricted
   folders. They must never be shared through an agreement folder.

## Upload an approved agreement

1. Save the counsel-approved PDF in Drive under **Approved source**.
2. Sign in to `portal.deepbridgeadvisory.com` as an administrator.
3. Open **Documents**.
4. Select **Add approved PDF**.
5. Choose the document type, enter the version such as `1.0`, and upload the
   same approved PDF.
6. The portal calculates its SHA-256 checksum and quarantines it.
7. After the scanner reports `clean`, the version is published for review.
   Earlier incomplete versions are marked superseded and retained.

## Send the Google signature request

1. In Drive, open the approved PDF.
2. Choose the eSignature action and add the required signers.
3. Assign the consultant's fields to the consultant's confirmed email.
4. Assign DeepBridge fields to the named DeepBridge countersigner. Do not use a
   shared mailbox as the countersigner.
5. Add signature and date fields. Check every field and signer before sending.
6. Enable automatic reminders where appropriate and send the request.
7. Google creates and locks the signing PDF beside the source document while
   the request is active. Leave that locked file in place. Use
   **02 In Signature** only for unlocked working files or shortcuts; do not
   defeat Google's lock by copying an active request.
8. Return to the portal and open **Signing**.
9. Find the consultant and agreement, then select **Record request sent**.

The consultant's portal status now becomes `Ready to sign`.

## What the consultant does

1. The consultant receives a personal Google eSignature email at the address
   used for the portal invitation.
2. They open Google's secure link, review the agreement, complete only the
   fields assigned to them and select **Mark complete**.
3. The portal explains that signing happens through the Google email and does
   not ask the consultant to upload a signature.
4. When Google shows that the consultant has signed, the administrator selects
   **Record consultant signed** in the portal.
5. The consultant then sees `Awaiting DeepBridge` and has no further action.

## Complete and publish the signing pack

1. DeepBridge countersigns in Google Workspace.
2. In Drive, open the completed request and confirm all signers and dates.
3. Retain the completed signed PDF under
   **03 Completed Signed Agreements** and its audit trail under
   **04 Google eSignature Audit Trails**.
4. In the portal, open **Signing** and select **Upload completed pack**.
5. Upload:

   - the completed signed PDF; and
   - the Google audit trail PDF.

6. The portal checks the file type and size, calculates both SHA-256 hashes and
   places both files in quarantine.
7. The malware scanner must submit two callbacks for the signature-envelope
   record:

   - `objectType = signature_artifact`, `artifactKind = final`
   - `objectType = signature_artifact`, `artifactKind = certificate`

8. Only when both callbacks report `clean` does the portal:

   - mark the agreement `Completed`;
   - complete the matching onboarding task;
   - expose the completed PDF and audit trail through five-minute links; and
   - write the completion events into the audit log.

## What the consultant sees

The consultant dashboard contains no administrator controls or Drive links.
They see:

- their assignment, commercial terms and onboarding progress;
- the exact approved document version;
- `Preparing request`, `Ready to sign`, `Awaiting DeepBridge`, `Completed` or
  `Superseded`;
- a three-step explanation of the Google signing journey;
- the completed locked PDF after approval;
- the Google audit trail after approval; and
- only their own compliance and onboarding records.

The consultant cannot see another consultant's records, the DeepBridge Drive
archive, internal verification notes, private source-folder links or service
credentials.

## Manual signed-PDF fallback

Use this only when the Google Workspace request cannot be completed.

1. The consultant opens the assigned signature document in the portal and
   downloads the approved, locked PDF.
2. The consultant signs the complete PDF using an established PDF signing tool
   or prints, signs and scans the full document.
3. The consultant uploads the signed PDF through **Signing fallback**. The file
   is stored privately and remains unavailable to DeepBridge until its malware
   scan reports `clean`.
4. In **Administration → Signing**, DeepBridge downloads the cleared
   consultant-signed PDF, reviews it and countersigns outside the portal.
5. DeepBridge can now choose **Review & sign** to countersign inside the portal.
   The authenticated administrator confirms their own name, signing authority
   and intent. The portal appends a branded countersignature record and creates
   the audit certificate automatically.
6. Alternatively, DeepBridge may sign outside the portal and upload the final
   countersigned PDF together with a PDF audit note or signing evidence.
7. The portal marks the agreement complete only after both final files pass
   their security scans. The administrator and consultant can then download the
   locked final PDF and audit evidence.

The consultant upload never completes the agreement by itself and cannot
replace the approved source version.

## Test before using real documents

Use `yonwallace@gmail.com` as the consultant test identity.

1. Invite the address from **Consultants**.
2. Confirm the magic-link email arrives from
   `hello@deepbridgeadvisory.co.uk`.
3. Upload a non-sensitive test PDF.
4. Send a Google eSignature request to the test address.
5. Exercise the consultant-signature and DeepBridge-countersignature steps.
6. Upload the completed test PDF and audit trail.
7. Test clean, infected and failed scanner callbacks.
8. Confirm the consultant can download only the completed files assigned to the
   test account.
9. Revoke the test account and confirm access stops without deleting the audit
   record.
