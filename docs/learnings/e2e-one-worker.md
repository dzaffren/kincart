# Run Playwright with one worker when specs reset the same tables

**Learned:** 2026-10-13 · **From:** /build find-and-explain

Playwright runs spec files in parallel workers. `approve-and-pay.spec.ts` and `find-and-explain.spec.ts` both truncate `purchase_requests` and `rose_search`, so side by side they would wipe each other's rows mid-test.

Wrong: a second spec file that resets shared tables, with the default workers.

Right: `workers: 1` in `playwright.config.ts`, and shared table helpers in `e2e/db.ts`. A spec file can't import another without running its tests twice.
