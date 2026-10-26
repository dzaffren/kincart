# Time a call again when what it sends grows

**Learned:** 2026-10-26 · **From:** /debug sam-finds-another

picks-that-match added up to 10 photos to the Haiku pick call. Its time went from a text call's few seconds to 7.3 to 9.1 s, and `haiku()` still stopped every call at 10 s. A slow pick then threw `TimeoutError`, and Find showed nothing found. CI's real-Find e2e failed now and then, on a slice that didn't touch the pick call.

Wrong: re-running CI, or reading `reason=TimeoutError` as a slow network on one run.

Right: when a slice adds photos, more listings or a longer prompt to an external call, measure the call again with real inputs, and check its timeout against the times. Wrap `fetch` in a throwaway test to time each call by kind.
