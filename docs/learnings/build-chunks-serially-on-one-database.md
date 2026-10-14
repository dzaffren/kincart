# Build chunks one after another when their tests share the local database

**Learned:** 2026-10-14 · **From:** /build basket

Every unit test that touches storage (`requests.test.ts`, `actions.test.ts`, `migrate.test.ts`) truncates the same tables in the one local Postgres, the way the e2e specs do. Worktrees don't give each chunk its own database.

Wrong: parallel chunk-builder agents in worktrees, each running `pnpm test` against the same `DATABASE_URL`. They wipe each other's rows mid-test, and a later chunk that imports the first chunk's new types can't compile alone anyway.

Right: build the chunks serially on the slice branch, schema chunk first, and commit each before the next.
