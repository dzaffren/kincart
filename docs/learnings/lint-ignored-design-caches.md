# Lint the tracked files when pnpm lint fails on design caches

**Learned:** 2026-10-14 · **From:** /build ping-helper

Locally, `pnpm lint` also scans git-ignored folders under `docs/design/design-system/` (`ds-bundle/`, `.ds-sync/`, `.design-sync/.cache/`) and reports 15 errors from bundled React code. CI checks out a clean tree, so it never sees them.

Wrong: reading those 15 errors as your own, or adding them to `globalIgnores`.

Right: `pnpm exec eslint $(git ls-files -co --exclude-standard '*.ts' '*.tsx' '*.mjs' '*.js')` to lint what CI will lint.
