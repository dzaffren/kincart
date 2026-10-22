# Give an e2e with two real Finds its own test timeout

**Learned:** 2026-10-22 · **From:** /build find-another

Playwright's default test timeout is 30 s for the whole test, whatever each `expect` allows. A Find and a Find another with real Haiku and Channel3 (D24) took 27.5 s on one run and past 30 s on another.

Wrong: only a long `timeout` on the `expect` that waits for the second search.

Right: `test.setTimeout(90_000)` at the top of a test that waits on two real searches.
