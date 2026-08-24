# DeepBridge Repository Working Agreement

These instructions apply to the entire repository.

## Working approach

- Inspect the existing implementation before making changes.
- Work on a dedicated branch or worktree; do not work directly on `main`.
- Make the smallest reliable change required and avoid unrelated product changes.
- Preserve the existing DeepBridge branding and responsive behaviour.
- Use professional British English for public-facing DeepBridge content.
- Ask for explicit approval before making substantial dependency changes.

## Data, security and production safety

- Never commit passwords, tokens, API keys, credentials or private client data.
- Keep local secrets in ignored environment files and use `.env.example` only as a redacted variable-name template.
- Do not edit production data.
- Do not deploy to production without the user's explicit approval.
- Do not materially alter contractual, compliance, privacy, commercial or legal wording without the user's explicit approval.
- Preserve company names, registration details, dates, monetary amounts, jurisdictions and contractual terms exactly.

## Verification and hand-off

- Run `npm run lint`, relevant tests with `npm run test`, and the production build with `npm run build` before declaring work complete. Run `npm run typecheck` for TypeScript changes; `npm run check` performs all four checks.
- Check both mobile and desktop layouts after frontend changes.
- Confirm that forms, links, downloads and important workflows still function when the change could affect them.
- Report failed checks, uncertainty and remaining risks honestly.
- Summarise every file changed when finished.

