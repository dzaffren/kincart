# Pass --silent=false to see a passing test's console output

**Learned:** 2026-10-23 · **From:** /build allow-over-limit

Vitest 5 printed nothing from `console.log` or `console.error` in a test that passed. A throwaway test that ran two real Finds to read their `find outcome=…` log lines showed only "1 passed", so the Finds ran again and spent Channel3 credits twice.

Wrong: `pnpm vitest run <file> | grep "find outcome"` on a passing test.

Right: `pnpm vitest run <file> --silent=false --reporter=verbose > <scratch log>`, then read the log. Write to a file, so a second look costs no second run.
