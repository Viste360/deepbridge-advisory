# DeepBridge Advisory Website V2 — Full Audit

Date: 26 July 2026

## Scope

The review covered:

- brand hierarchy and public presentation;
- client and consultant conversion journeys;
- desktop and responsive page structure;
- keyboard and screen-reader considerations;
- route behavior and true not-found handling;
- search metadata, canonical URLs, sitemap and robots delivery;
- social sharing metadata and structured data;
- form data minimisation, validation and spam resistance;
- production headers and dependency advisories;
- build repeatability, content ownership and deployment risk.

## Production baseline

The audited production homepage recorded:

- Performance: 96
- Accessibility: 100
- Best Practices: 100
- SEO: 92
- First Contentful Paint: 1.8 s
- Largest Contentful Paint: 2.0 s
- Total Blocking Time: 0 ms
- Cumulative Layout Shift: 0

The visual system, responsive structure, heading hierarchy, contrast, keyboard
focus styling and core calls to action were already strong. No unverified client
logos, testimonials, project outcomes or scale claims were introduced.

## Improvements implemented

### Search and sharing

- Aligned canonical URLs with the live `www.deepbridgeadvisory.co.uk` domain.
- Centralised route metadata in `src/config/seo.json`.
- Added route-specific static HTML generation for every public page.
- Added absolute Open Graph image URLs, `og:url`, X title, description and image
  metadata.
- Added explicit index/follow directives and a noindex 404 document.
- Updated the sitemap and robots sitemap reference to the canonical `www`
  domain.
- Added richer organisation topics and the approved LinkedIn company URL to the
  structured data.

### Routing

- Removed the catch-all SPA rewrite.
- Generated clean HTML entry files for every known route.
- Added a dedicated `404.html` so unknown direct URLs can return an actual 404
  response while retaining the branded not-found experience.

### Conversion and privacy

- Kept the registered office and legal-entity detail in the legal layer rather
  than foregrounding it in the main enquiry journey.
- Added a clear, useful Formspree subject line.
- Replaced the ineffective hidden honeypot value with an off-screen text
  honeypot designed to catch automated submissions.
- Added sensible input length limits and prevented enquiry-type changes while a
  form is submitting.
- Preserved the no-CV-upload and no-sensitive-document approach.

### Accessibility

- Added focus management after client-side route changes so keyboard and
  assistive-technology users are moved to the new main content.
- Preserved reduced-motion behavior, visible interactive focus states, semantic
  headings, labels and status announcements.

### Security and maintainability

- Added Cross-Origin-Opener-Policy and cross-domain policy headers.
- Updated the ESLint, TypeScript ESLint and React lint plugins to versions that
  remove the audited development-tool advisories.
- Kept the application on React Router 7.18.1. The remaining npm advisory applies
  only to unstable React Server Components APIs, which this static client
  application does not use. The advisory identifies 8.3.0 as patched, but that
  release is not currently available from the npm registry. Downgrading would
  reintroduce several older, broader advisories.

## External observation

Cloudflare currently prepends a managed `Content-Signal` directive to the live
robots file. Lighthouse does not recognise that non-standard directive and
therefore caps its SEO category at 92 even though the repository-owned robots
rules and sitemap reference are valid. Changing this would alter DeepBridge's
AI-crawler policy and should be treated as a separate business decision in the
Cloudflare dashboard, not silently changed in application code.

## Verification required on the Vercel preview

- Every known route returns 200 directly.
- An unknown route returns 404 and renders the branded not-found page.
- Each route returns its own title, description, canonical URL and Open Graph
  URL in the initial HTML response.
- The contact enquiry selector updates the URL and visible fields.
- Required-field validation and the form status announcement still work.
- Static assets, robots and sitemap files remain unaffected by clean routing.
- Mobile navigation, keyboard focus and reduced-motion behavior remain intact.

## Local production-candidate validation

- Lint: pass
- Strict TypeScript check: pass
- Content integrity tests: pass
- Production build and static route generation: pass
- Lighthouse Performance: 100
- Lighthouse Accessibility: 100
- Lighthouse Best Practices: 100
- Lighthouse SEO: 100
- First Contentful Paint: 1.4 s
- Largest Contentful Paint: 1.5 s
- Total Blocking Time: 0 ms
- Cumulative Layout Shift: 0
- Route-change focus moves to the new main content.
- Consultant enquiry selection updates the URL, visible fields and submission
  subject correctly.
- Required-field validation focuses the first invalid field.

## Deliberately not changed

- No analytics or marketing pixels were added.
- No cookie banner was added because no optional cookies are currently used.
- No real form submission was triggered.
- No unverified commercial proof, client names or project statistics were
  invented.
- No duplicate Vercel project was deleted.
