# Run real Finds two at a time when measuring them

**Learned:** 2026-10-22 · **From:** /build find-another

Ten real `find()` calls at once, each pick call with 10 listing photos, timed Haiku out: 4 of 10 came back "nothing found" with `reason=TimeoutError`, and looked like empty asks. Two at a time, the same asks found options.

Wrong: `Promise.all` over every candidate ask, then reading each "nothing found" as an ask Channel3 can't fill.

Right: run them in pairs, and count an ask as empty only when its result carries a `query` and its log line has no `reason=`.
