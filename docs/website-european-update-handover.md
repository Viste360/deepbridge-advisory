# DeepBridge European website update — review handover

Prepared 16 October 2026. Changes are local and ready for review; nothing has been published to the live domain.

## Preview

The local preview is available in English at http://127.0.0.1:5173/, German at http://127.0.0.1:5173/de and Spanish at http://127.0.0.1:5173/es while the development server is running. Restart it from this project with `npm run dev -- --host 127.0.0.1`.

## What changed

- Retained React, Vite, the DeepBridge logo and navy/teal identity. Replaced the large serif treatment with a restrained sans-serif system, compact page introductions, structured grids and accessible controls.
- Rebuilt the homepage in the requested order: introduction, three expertise groups, one five-step engagement process, accountability, European focus and project enquiry.
- Introduced shared English/German/Spanish routing and content. English URLs remain unchanged; German equivalents use `/de` and Spanish equivalents use `/es`. The language switch preserves the page, enquiry type and anchor.
- Updated Expertise, How We Work, About, For Professionals, Opportunities, both enquiry paths and the four legal information pages. Preserved all three existing insight articles and provided complete German and Spanish translations.
- Kept the current Formspree endpoint and existing submission field names. Added telephone, duration and professional language information; translated labels, field errors, error summaries and confirmation states. No CV upload or new tracking.
- Generated full HTML content for all 48 English/German/Spanish routes, including the three not-found pages, with canonical URLs, reciprocal hreflang, social metadata and verified-fact Organization schema. Updated the sitemap and AI-readable overview to the `.com` website.
- Preserved consultant portal routing and all pre-existing uncommitted portal/backend work. No live records, portal integrations, DNS, domains or hosting settings were changed.
- Added a reusable project experience component which renders nothing until approved records are provided. No fictional project examples or team members appear.

## Confirmed company details

The user confirmed the current company address as **71–75 Shelton Street, Covent Garden, London WC2H 9JQ, United Kingdom**. Company number **16775578** and the public email **hello@deepbridgeadvisory.co.uk** remain unchanged. The user confirmed **DEEPBRIDGE ADVISORY LTD** as the UK legal entity and explicitly requested that these UK details be used in all three language versions for now. The public AI-readable company summaries use the confirmed name and address in English, German and Spanish. The user also confirmed that a Spanish company exists; its details can be added later once its legal name, NIF and address are supplied. This later update does not block the current UK-entity implementation.

## What still needs business confirmation

1. **Contact mailbox.** `hello@deepbridgeadvisory.co.uk` remains the public email. Verify the `.com` mailbox or alias before switching it.
2. **Geographic presence.** London, Munich and Madrid are described as strategic focus, with Germany prominent. Confirm physical-office and local-team details before adding such claims for Munich or Madrid. The Spanish company exists according to the user; its separate identity will be added later if supplied, as requested.
3. **Delivery commitments and service availability.** Confirm the proposed named contact, agreed progress reviews, issue/change coordination, handover and replacement coordination can be provided at the agreed level for each engagement. The pages explain that scope and arrangements are agreed individually.
4. **Legal/privacy review.** German and Spanish pages translate the existing policy substance and use the confirmed UK company details. Review the applicable disclosure requirements, company representative/contact information, the actual entities receiving website data, provider arrangements, retention/transfer practices, and policy version/review dates before publication. The existing policy date/version was preserved rather than asserting a new approved policy.
5. **Submission delivery.** Confirm Formspree recipient configuration and approve a real end-to-end delivery test if needed. No real enquiries were submitted during this work.

## Approved material needed

- A verified leadership name, public role, approved biography and professional portrait, plus permission to publish them.
- Two or three authorised case studies identifying sector, challenge, actual DeepBridge role, expertise, work and verified outcome/current status. Identify intermediary arrangements (including SNECI) accurately and secure permission for any names/logos. No approved case evidence was found in the project.
- Approved industrial/project photographs with usage rights. The homepage currently reuses an existing industrial image and explicitly labels it illustrative; it is not presented as a DeepBridge team, client site or completed project. Its source/rights should be confirmed or it should be replaced with approved photography.

## Verification

- Frontend and API TypeScript checks pass.
- The isolated website commit passes 53 tests across 8 files, covering content, contact validation, mocked submission outcomes, locale/application routing, section navigation, portal data and the existing countersignature PDF tests. It excludes unrelated local timesheet, service-record and intercompany changes.
- Production build passes and emits 48 complete public HTML pages across English, German and Spanish; 45 indexable routes are in the sitemap.
- All 48 generated routes checked for one H1, language, title, description, canonical, hreflang, schema, content, unique IDs and internal routes/anchors. Spanish articles preserve the same three URLs and 15 content sections, with complete translations and Spanish date formatting. No old company name or old address remains in generated public pages.
- `npm run check:links` runs on every production build. The latest run verifies 2,576 link references across 48 public routes, 117 distinct internal destinations, 268 anchors and 448 asset references. The build also renders all nine English/German/Spanish project, professional and general enquiry selections and checks their fields and language links. Each page and sitemap entry has reciprocal English, German, Spanish and x-default alternatives. Deliberately broken route, anchor, asset, form, language-switch and accessibility-reference fixtures were rejected during verification.
- All 45 content pages have been reviewed in the browser across the English/German review and the subsequent Spanish review. All 15 Spanish content pages were checked at a 355 px viewport with the expected H1, Spanish language metadata, confirmed company identity, no old company name, no horizontal overflow and no console errors. English/German not-found pages and recovery navigation were checked in the browser; all three not-found pages also passed the static checks.
- Desktop, tablet and narrow mobile layouts checked in the browser. The Spanish navigation was additionally verified at 1,309 px, 355 px and the 1,164 px breakpoint boundary. The German long-heading overflow was fixed. Key navigation, equivalent-page switching, preserved query/hash, mobile Escape/focus behaviour and accessible invalid-form summaries checked.
- No browser errors were observed on the public pages. Reduced-motion support and keyboard focus styling are included.
- Repeated section links, direct form anchors, mobile menu navigation, equivalent-language links and validation-summary links were exercised in the browser. Spanish invalid-form summaries and field focus passed, as did Spanish–German–Spanish switching for the professional enquiry while preserving the query and hash. Enquiry selection preserves its form anchor and keeps keyboard focus on the selected control. History navigation restores recorded scroll positions. Initial anchor navigation also works with React development checks enabled.
- Portal privacy links now retain the portal context on shared preview hosts. Privacy and terms pages render before session-dependent redirects, so signed-in users can read them too. The portal privacy destination was checked in the production preview; live authentication and private account workflows were not exercised.
- External portal login and LinkedIn links returned HTTP 200 in read-only checks. Formspree returned the expected HTTP 405 for a read-only GET to its POST endpoint. Email delivery and recipient configuration remain unverified.
- Submission success, provider rejection, network failure and a 20-second timeout were tested with mocked requests. A stalled submission now releases the disabled controls, retains the enquiry and explains that delivery is unconfirmed, without automatically resending. No real enquiries were submitted. No production performance score or blanket accessibility/legal compliance claim is made.

## Publication

Review all three language versions and the confirmations above before publishing to the live domain, as requested in the brief. Existing useful English URLs are retained, so they need no redirects. Deployment remains on the existing project/hosting configuration.
