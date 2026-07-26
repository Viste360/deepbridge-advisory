# DeepBridge Advisory Website V2 - Initial Audit

Audit date: 26 July 2026

## Current technical structure

- Framework: React 19 single-page application built with Vite 8.
- Routing: no router; all content is rendered by `src/App.jsx` at `/`.
- Styling: Tailwind CSS 4 through `@tailwindcss/vite`, with a minimal global stylesheet.
- Motion: Framer Motion is used for entry and hover animation.
- Reusable components: small local components for containers, buttons, section headings, cards, fields and icons. All are defined in the page file.
- Form provider: Formspree endpoint `mlgzpyqv`.
- Analytics and tracking: none found.
- Hosting configuration: no Vercel project metadata or Sites hosting configuration is committed. The GitHub repository is `Viste360/deepbridge-advisory`.
- Environment variables: none.
- Metadata: one generic title and description in `index.html`; no canonical, Open Graph, X card, robots or sitemap.
- Legal pages: none.
- Cookie or consent implementation: none. No non-essential tracking was found, so a consent banner is not currently necessary.

## Current route and purpose

| Route | Purpose | Finding |
| --- | --- | --- |
| `/` | Marketing landing page and shared client/consultant contact form | Combines every journey into one long page and does not provide distinct, linkable service or legal information. |

## Content and conversion findings

- The hero presents DeepBridge primarily as a contract-consultant matching business and repeatedly uses recruitment language.
- Client and consultant audiences are acknowledged, but their journeys are compressed into small sections with no detailed process, expectations or legal context.
- Calls to action use inconsistent wording: "Discuss a project", "Hire Consultants", "Join the Network" and "Let's discuss your project".
- Several claims need refinement or evidence, including "contribute from day one", "built for speed", "fast shortlist", "senior-only screening", "London-based network" and the stated response time.
- The page repeats reporting/analytics/ERP terminology without establishing the broader transformation proposition.
- There is no meaningful About, Opportunities, Privacy, Cookies, Legal or Accessibility content.

## Design and responsive findings

- The dark blue/cyan palette and existing mark provide a useful starting point, but presentation is close to a generic technology/recruitment template.
- Excessive rounded cards, gradients and entry animations dilute the premium advisory positioning.
- The desktop navigation disappears below the medium breakpoint with no replacement mobile menu.
- The first mobile viewport gives substantial space to the hero visual while key copy and actions sit lower than necessary.
- The largest image assets are roughly 0.9-1.3 MB each; the favicon is an oversized 1166x1174 PNG.
- Hover translations and motion are applied widely, including where they do not add meaning.

## Accessibility findings

- No skip link or dedicated page landmark structure beyond one `main`.
- Mobile navigation is absent.
- Focus states exist for several controls, but not consistently for all links.
- Form required status is conveyed by HTML validation but not visibly explained.
- No accessible, in-page success or error handling exists because submission navigates directly to Formspree.
- No reduced-motion behaviour is defined.
- Decorative inline SVGs are correctly hidden, but the workflow visual uses an `aria-label` on a non-semantic element.
- Colour contrast and keyboard flow require a full manual review after redesign.

## SEO and performance findings

- Generic site-wide metadata only.
- No canonical URLs, social preview, JSON-LD, sitemap, robots file or per-page descriptions.
- No route-level semantic distinction for expertise, client, consultant and legal topics.
- Production build passes, but the initial JavaScript bundle is approximately 337 kB (105 kB gzip), largely because Framer Motion is used for simple effects.
- Three source images total approximately 3.3 MB.
- No Lighthouse baseline was recorded in the repository.

## Privacy, form and security risks

- The Formspree destination is hard-coded in client code and the data recipient is not explained to users.
- The shared form collects name, email, company, role and a free-text message without linking to a privacy notice.
- No client-side success handling, server-side contract visible to the project, rate-limit documentation or retention information.
- A honeypot is present, but no other abuse or validation controls are documented.
- No CV upload is present; this should remain omitted until a secure managed workflow is approved.
- No security headers or Content Security Policy are configured in the repository.
- Dependency audit reports two high-severity advisories affecting Vite 8.0.11 and its PostCSS dependency. An update is available.

## Corporate information

The supplied Companies House incorporation record confirms:

- Legal name: DUSTDEEP LTD
- Company number: 16775578
- Registered in: England and Wales
- Registered office: Kemp House, 152-160 City Road, London, United Kingdom, EC1V 2NX
- Incorporated: 9 October 2025

The public site must still confirm:

- Whether DUSTDEEP LTD, DEEPBRIDGE ADVISORY S.L., or both operate the website and receive enquiries.
- Public business and privacy email addresses.
- VAT information, if displayed.
- The form submission destination and retention criteria.
- Whether the registered office remains current before production launch.

## Proposed routes

- `/`
- `/expertise`
- `/for-clients`
- `/for-consultants`
- `/about`
- `/opportunities`
- `/contact`
- `/privacy`
- `/cookies`
- `/legal`
- `/accessibility`
- custom not-found experience

## Proposed component structure

- Shared shell: header, mobile navigation, footer, skip link and page transition behaviour.
- Shared content: central navigation, company configuration, expertise and process data.
- Marketing components: hero, section heading, expertise cards, process steps, engagement models and calls to action.
- Form components: enquiry-type selector, client fields, consultant fields, privacy notice, validation and accessible status.
- Legal components: consistent legal-page header, contents navigation and dated notice blocks.

## Baseline validation

- `npm run build`: passes.
- Lint: no script or configuration.
- Type checking: not configured; source is JavaScript.
- Tests: no test framework or scripts.
- Dependency audit: two high-severity findings (Vite and PostCSS).
- Browser review: desktop page renders; mobile header has no navigation and the opening viewport is visually under-informative.

