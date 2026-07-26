# DeepBridge Advisory Website V2 - Handover

Handover date: 26 July 2026

## Summary

The original single-page recruitment-style landing page has been rebuilt as a concise, multi-route European B2B consultancy website.

The new experience:

- positions DeepBridge as a specialist advisory and delivery partner;
- separates client and independent-consultant journeys;
- focuses on SAP and ERP, supply chain and manufacturing, data and BI, and programme leadership;
- replaces unsupported speed, scale and employment claims with clear operational detail;
- introduces a restrained editorial design system with a coded technical visual language;
- adds central company and content configuration;
- adds privacy-aware, audience-specific enquiry forms without public CV upload;
- adds Privacy, Cookies, Legal and Accessibility routes;
- adds meaningful metadata, structured data, a sitemap, robots configuration and a branded social card;
- adds secure production headers for Vercel;
- migrates the source to strict TypeScript;
- removes Framer Motion and Tailwind from the runtime;
- adds linting, type checking and content integrity tests; and
- updates Vite and PostCSS beyond the advisory ranges found during the initial audit.

## Final route map

| Route | Purpose |
| --- | --- |
| `/` | Primary proposition, expertise, process, engagement models and split calls to action |
| `/expertise` | Detailed overview of the four connected expertise areas |
| `/for-clients` | Client services, briefing inputs, process and compliance context |
| `/for-consultants` | Consultant expectations, information requirements and engagement disclaimer |
| `/about` | Positioning, operating principles and cross-border approach |
| `/opportunities` | Honest reusable opportunity route with a current empty state |
| `/contact` | Adaptive client, consultant and general enquiry experience |
| `/privacy` | Website and enquiry privacy notice |
| `/cookies` | Current cookie and tracking inventory |
| `/legal` | Corporate identity and website legal notice |
| `/accessibility` | Accessibility approach and contact route |
| `*` | Custom not-found experience |

## Component and content structure

- `src/config/site.ts`
  - company identity;
  - public contact details;
  - URLs and form endpoint;
  - primary and legal navigation;
  - route metadata.
- `src/content/siteContent.ts`
  - expertise;
  - process;
  - engagement models;
  - industries;
  - client and consultant content;
  - operating principles.
- `src/components/SiteShell.tsx`
  - shared header;
  - keyboard-accessible mobile menu;
  - metadata and canonical handling;
  - shared footer;
  - skip link and route scroll behaviour.
- `src/components/Ui.tsx`
  - headings;
  - calls to action;
  - page heroes;
  - expertise and process displays;
  - notices and legal layout.
- `src/pages/`
  - route-level page content and contact form behaviour.
- `src/index.css`
  - brand tokens;
  - responsive editorial layout;
  - interaction states;
  - reduced-motion handling.

## External services

| Service | Current use | Information involved |
| --- | --- | --- |
| GitHub | Source repository | Website source and documentation only |
| Vercel | Existing production hosting/deployment workflow | Standard request and delivery data |
| Formspree | Enquiry-form processing | Submitted form fields and related technical anti-abuse signals |
| LinkedIn | Optional outbound company link | No information is sent until a user follows the link |

No analytics, advertising pixels, chat widgets, embedded maps, embedded video or marketing-email service are included.

## Form data flows

### Client enquiry

1. User chooses "I need project support".
2. Browser validates name, work email, company, expertise required, project location and message.
3. Optional target start date may be included.
4. The form is sent over HTTPS to the configured Formspree endpoint.
5. Formspree applies its managed processing and abuse controls, then delivers the enquiry to the destination configured in the Formspree account.
6. The site displays a generic success response and does not expose routing or inbox details.

### Consultant enquiry

1. User chooses "I am an independent consultant".
2. Browser validates name, email, current location, primary expertise, availability and message.
3. A LinkedIn URL may be included.
4. The same Formspree flow applies.
5. No CV upload or sensitive onboarding-document upload is available.

### General enquiry

1. User chooses "General enquiry".
2. Browser validates name, email and message; company is optional.
3. The same Formspree flow applies.

The website does not log form contents, store them in browser storage or add users to a marketing list.

## Cookie and tracking inventory

- Essential page delivery: Vercel or the selected production host may use necessary technical processing to serve and protect the site.
- Form protection: Formspree may use necessary technical signals to identify automated or abusive traffic.
- Functional cookies: none intentionally set by the application.
- Analytics cookies: none.
- Advertising or marketing cookies: none.
- Local storage: none.

A consent banner is intentionally omitted because no optional tracking technology is included. If analytics, embedded media, chat or advertising is introduced, the cookie page and consent implementation must be reviewed before those technologies load.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_FORMSPREE_ENDPOINT` | Recommended | Managed form endpoint; defaults to the existing DeepBridge Formspree endpoint |

The canonical domain is maintained in `src/config/seo.json`. The form endpoint
is not treated as a secret. No secret keys are exposed to the browser.

## Deployment

1. Confirm the information listed in the final checklist below.
2. Run `npm ci`.
3. Run `npm run check`.
4. Configure the public form endpoint in Vercel if it differs from the documented default.
5. Deploy the reviewed feature branch to a Vercel preview.
6. Test the preview form with a non-sensitive test enquiry and confirm its destination.
7. Review the Privacy, Cookies and Legal pages with the appropriate UK/EU adviser.
8. Merge the approved branch to the production branch.
9. Verify the custom domain, security headers, sitemap, robots file and social sharing card on production.

The implementation brief explicitly requires preview review and approval before production. The build should not be promoted until that approval is recorded.

## Rollback

- In Vercel, promote the previous successful deployment or redeploy the prior production commit.
- In Git, revert the merge commit for Website V2 if a code-level rollback is required.
- Do not delete the previous successful Vercel deployment until the new version has been validated.
- If form delivery fails, temporarily direct users to the published contact email while the Formspree configuration is corrected.

## Tests performed

- Formatting and lint rules: pass.
- Strict TypeScript check: pass.
- Content and configuration unit tests: 2 pass.
- Production build: pass.
- Mobile layout at 390 x 844: pass; no horizontal overflow.
- Tablet layout at 768 x 1024: pass; no horizontal overflow.
- Desktop layout at 1440 x 900: pass.
- Mobile navigation: open, close and Escape-key control pass.
- Route and metadata checks: all core routes pass.
- Custom not-found route: pass.
- Contact audience preselection: pass.
- Contact audience switching: pass.
- Required-field validation and focus movement: pass.
- Browser console review: no persistent production errors.
- Reduced-motion handling: implemented in CSS.
- Robots and sitemap files: present and valid XML/text.
- Structured data: organisation and website data included without reviews, ratings, scale or other unsupported claims.
- Production Lighthouse:
  - Performance: 100
  - Accessibility: 100
  - Best Practices: 100
  - SEO: 100
  - First Contentful Paint: 1.4 s
  - Largest Contentful Paint: 1.5 s
  - Total Blocking Time: 0 ms
  - Cumulative Layout Shift: 0

## Before-and-after performance

The original and rebuilt production bundles were measured locally with the same Lighthouse version and Chrome installation.

| Measure | Original | Website V2 |
| --- | ---: | ---: |
| Performance | 75 | 100 |
| Accessibility | 100 | 100 |
| Best Practices | 100 | 100 |
| SEO | 92 | 100 |
| First Contentful Paint | 1.4 s | 1.4 s |
| Largest Contentful Paint | 10.5 s | 1.5 s |
| Total Blocking Time | 0 ms | 0 ms |
| Cumulative Layout Shift | 0 | 0 |
| JavaScript bundle, gzip | 105.20 kB | 88.25 kB |

Local Lighthouse scores are diagnostic rather than a guarantee of field performance. Production monitoring should be added only if DeepBridge approves an appropriate privacy-conscious analytics approach.

## Known limitations

- The form provider, destination inbox and retention practice are controlled outside this repository and must be verified before production.
- Successful live form delivery was not triggered during browser QA because that would create a real external submission.
- The React experience remains client-side after initial load, while the production build now emits route-specific HTML shells with unique titles, descriptions, canonical URLs and social metadata for every public route.
- Known routes are emitted as clean static HTML files and the deployment includes a dedicated `404.html`, allowing Vercel to return a genuine not-found response without a catch-all SPA rewrite.
- No public CV upload is included. A managed upload workflow requires malware scanning, access control, retention rules and an approved privacy process.
- No live opportunity records are published. Future listings need an owner, closing process and prompt removal of stale `JobPosting` data.
- No founder biography, portrait, client logo, testimonial, certification, insurance claim or performance metric has been added without approved evidence.

## Suggested future improvements

1. Add an approved founder profile and current LinkedIn links.
2. Introduce a managed opportunities source only when there is an operational owner for updates.
3. Add privacy-conscious, consent-aware analytics only if there is a defined business question.
4. Replace Formspree with an owned server-side enquiry workflow if DeepBridge needs tighter rate limiting, auditability and retention control.
5. Add secure CV upload through a managed private storage and malware-scanning service.
6. Extend the current route-level metadata generator if a sustained editorial or insight-content programme is introduced.
7. Add verified client references or anonymised capability examples only after written approval.

## Information DeepBridge Must Confirm Before Production

- [ ] Exact website operating entity is DUSTDEEP LTD.
- [ ] Registered legal name is DUSTDEEP LTD.
- [ ] Company registration number is 16775578.
- [ ] Registered jurisdiction is England and Wales.
- [ ] Registered office remains Kemp House, 152-160 City Road, London, United Kingdom, EC1V 2NX.
- [ ] `hello@deepbridgeadvisory.co.uk` is the approved public business email.
- [ ] The approved privacy contact email.
- [ ] VAT information, if it should be displayed.
- [ ] Whether DUSTDEEP LTD, DEEPBRIDGE ADVISORY S.L. or both receive website data.
- [ ] Which entity contracts with UK clients.
- [ ] Which entity contracts with EU clients.
- [ ] Which entity maintains the consultant database and decides how it is used.
- [ ] The configured Formspree destination and authorised users.
- [ ] The actual consultant-profile and CV retention criteria.
- [ ] Whether analytics should remain disabled.
- [ ] The future marketing-email process, if any.
- [ ] An approved founder biography, portrait and personal LinkedIn link, if desired.
- [ ] The approved LinkedIn company URL.
- [ ] Whether any current client or project references may be used.
- [ ] Any professional indemnity or other insurance claims before they are mentioned.
- [ ] Final lawyer or privacy-professional review of the public legal pages.
- [ ] Explicit approval of the preview before production deployment.
