# Clear .next/dev before next build when another branch's dev server left its types

**Learned:** 2026-10-27 · **From:** /build ci-without-channel3

`pnpm dev` writes route types to `.next/dev/types/validator.ts`, and `next build` type-checks them. After `pnpm dev` ran on a branch with a route this branch lacks, such as `app/(shop)/preview/confirm-ok`, `next build` fails with `Cannot find module '../../../app/(shop)/preview/confirm-ok/page.js'`, and the e2e's web server never starts.

Wrong: debug the e2e, or the route, when Playwright says `Process from config.webServer was not able to start`.

Right: `rm -rf .next/dev`, then build again. The folder is a git-ignored cache that `pnpm dev` writes again.
