# Don't run Prettier on this repo's files

**Learned:** 2026-10-22 · **From:** /build home-page-proof

The repo has no Prettier: no config, no package, no script. `npx prettier --check` downloads it and judges with its 80-column default, so it flags `app/(shop)/HomeView.tsx` on `main` too. The code is wrapped at 120 columns by hand.

Wrong: `npx prettier --check` or `--write` on a changed file. A write reflows every line in the file.

Right: `pnpm exec eslint $(git ls-files -co --exclude-standard '*.ts' '*.tsx' '*.mjs' '*.js')`, and keep new lines under 120 columns like the lines around them.
