# Break the code once when pause 2 already built it

**Learned:** 2026-10-15 · **From:** /build demo-home

When `/spec` pause 2 builds the screens into the real code, `/build`'s tests pass on their first run. A test that never failed proves nothing.

Wrong: write the test, see it pass, and commit it.

Right: break the line the test is about, watch the test fail for that reason, then `git checkout -- <file>`. For demo-home: drop `inert` from `PhoneFrame` for the sample test, drop `loading="lazy"` for the lazy-frame tests, and skip the cookie in `start()` when `had` for Start a new one.
