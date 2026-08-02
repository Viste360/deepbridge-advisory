# Codex setup for DeepBridge Advisory

Verified on 2 August 2026 from the repository scripts and lockfile.

## Project and package manager

The main application is a Vite 8, React 19 and TypeScript 5 project. It includes Vercel Functions under `api/`, Supabase integration and Vitest tests. The package manager is npm, as confirmed by `package-lock.json` (lockfile version 3).

The Vercel application is hosted with Node 24. Use Node 24 for root application work so local and CI checks match that environment. The `scanner/` directory is a separate service whose package and Docker image declare Node 22; use Node 22 for scanner-specific work.

## Verified commands

Run these from the repository root:

| Purpose | Command |
| --- | --- |
| Install exact locked dependencies | `npm ci` |
| Start the development server | `npm run dev` |
| Lint | `npm run lint` |
| Type-check the frontend and API | `npm run typecheck` |
| Run tests once | `npm run test` |
| Create the production build and static pages | `npm run build` |
| Run all quality checks | `npm run check` |
| Preview a completed production build | `npm run preview` |

The scanner exposes a separate repository-defined start command: `npm --prefix scanner start`. It requires its server-side environment configuration and should not be started against production services during routine Codex work.

## Starting the project

1. Use an isolated branch or worktree rather than `main`.
2. Run `npm ci` from the repository root.
3. If the task needs runtime integrations, create a local ignored `.env` using `.env.example` as the variable-name template and obtain the appropriate non-production values through an approved secure channel. Never commit `.env`.
4. Run `npm run dev` and open the local URL printed by Vite.

The public website can be reviewed without enabling portal integrations. `VITE_PORTAL_DEMO_MODE` is intended only for local review and has no effect in a production build.

## Quality and functional checks

Use `npm run check` before hand-off. It executes linting, TypeScript checks, tests and the production build in that order. For frontend changes, also inspect representative mobile and desktop widths and exercise affected forms, links, downloads and important workflows.

GitHub Actions runs the same command for every pull request and every push to `main` using Node 24. The workflow has read-only repository permissions and cancels superseded runs on the same branch.

Do not claim that credential-dependent integrations work unless they were tested safely against an approved non-production environment. Record skipped checks and the reason.

## Recommended Codex local environment

- Working directory: repository root.
- Runtime: Node 24 with npm for the root application; Node 22 for `scanner/`.
- Setup command: `npm ci`.
- Development command: `npm run dev`.
- Lint command: `npm run lint`.
- Test command: `npm run test`.
- Production-build command: `npm run build`.
- Full check command: `npm run check`.
- Environment: use non-production values only; keep `.env` local and ignored.
- Git: create a task-specific branch or worktree and leave merging to `main` for explicit user approval.
- Deployment: there is no deployment script in `package.json`. Vercel deployments must not be started or promoted to production without explicit approval.

## Remaining manual configuration

- Supply approved non-production environment values when portal, Formspree, Supabase, Google Workspace signing or malware-scanning workflows need to be exercised.
- Vercel currently uses Node 24 and repository-derived install/build commands without overrides. Preview deployments require Vercel team authentication. Keep those settings aligned with this document and approval-gate production changes.
- Review Supabase row-level security and service-role handling before testing workflows that touch real records. Do not edit production data.
- Verify end-to-end Google Drive signing and scanner callbacks only in an approved non-production environment.
- Review the React Router security advisory reported by `npm audit --omit=dev` on 2 August 2026. It produces two high-severity findings for the same unstable-RSC CSRF advisory. No unstable RSC APIs were found in this Vite SPA, so the documented exploit condition does not appear to be present, but the package remains flagged. The available automated fix is a forced dependency change and must not be applied without explicit approval and regression testing.

## Useful optional plugins and integrations

These are recommendations only; do not install or authorise them without explicit approval.

- **GitHub** — inspect pull requests, branch protection and CI status without leaving Codex.
- **Vercel** — inspect project settings, preview deployments and build logs; keep production deployment approval-gated.
- **Supabase** — inspect schema, migrations and row-level security with a non-production project connection.
- **Google Drive** — support the existing restricted Drive signing workflow without copying client documents into the repository.
- **Codex Security** — supplement local secret scanning and review authentication, upload and callback surfaces.
