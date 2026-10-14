# Change a file's content when pnpm dev serves an old copy after a branch switch

**Learned:** 2026-10-15 · **From:** /spec households, /build households

After `git switch`, the running `pnpm dev` kept old modules: a page failed with "Element type is invalid … got undefined", and later with "linksIn is not a function", while `tsc` and Vitest passed. `touch` did not help, and removing and restoring the file did not either.

Wrong: debugging the component, or trusting `touch` to reload it.

Right: append a line to the file the error names, request the page once, then put the file back. Or restart `pnpm dev`.
