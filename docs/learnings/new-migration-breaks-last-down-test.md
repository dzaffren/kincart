# Name scripts/migrate.test.ts in a plan that adds a migration

**Learned:** 2026-10-15 · **From:** /build clearer-pages

`migrate("down")` runs only the highest-numbered `*.down.sql`. A test that proves one migration's down path breaks when the next migration lands, because its `db:down` now undoes the new file instead.

Wrong: a plan that adds `0008_*.sql` and lists only the app's tests. `scripts/migrate.test.ts` then fails on the households test that expected 0007's down.

Right: list `scripts/migrate.test.ts` in the Changes table. Point the first test's down checks at the new file. A test for an older file's down steps past the newer ones first, then runs the older down file with `readFile` (`downToHouseholds` in clearer-pages).
