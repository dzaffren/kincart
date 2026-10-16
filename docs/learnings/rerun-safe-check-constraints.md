# Add an older migration's check NOT VALID when a later one widens it

**Learned:** 2026-10-16 · **From:** /build photo-ask

`db:up` reruns every up file. `0005_basket.up.sql` drops and re-adds `rose_search_outcome_check` with its own list, and a re-added check validates every row. Once 0009 allowed `'nothing in photo'` and a row had it, the next `db:up` failed at 0005: "check constraint "rose_search_outcome_check" of relation "rose_search" is violated by some row".

Wrong: a plan that widens a check in a new file and leaves the older file's `ADD CONSTRAINT` as it is.

Right: add the older file's check `NOT VALID`, so only the newest file's check validates rows. In `scripts/migrate.test.ts`, insert a row that only the new check allows, then run `migrate("up")` again.
