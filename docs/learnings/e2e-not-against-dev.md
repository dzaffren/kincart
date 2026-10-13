# Stop pnpm dev before running the e2e

**Learned:** 2026-10-13 · **From:** /spec find-and-explain

`playwright.config.ts` builds and starts the app, but with `reuseExistingServer` it uses whatever already answers on port 3000. A running `pnpm dev` adds Next.js's "Open Next.js Dev Tools" button to every page, so a check like `expect(page.getByRole("button")).toHaveText(["Paying…"])` sees two buttons and fails.

Wrong: `pnpm dev` left running for a preview, then `pnpm test:e2e`.

Right: stop the dev server first, so the e2e runs against its own production build.
