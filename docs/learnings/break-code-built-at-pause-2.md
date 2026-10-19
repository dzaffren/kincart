# Break the code once when pause 2 already built it

**Learned:** 2026-10-15 · **From:** /build demo-home, /build usage-on-status

When `/spec` pause 2 builds the screens into the real code, `/build`'s tests pass on their first run. A test that never failed proves nothing.

Wrong: write the test, see it pass, and commit it.

Right: commit the file's other changes first, or copy it aside. Then break the line the test is about, watch the test fail for that reason, and put the file back. `git checkout -- <file>` brings back the last commit, so in /build usage-on-status it also wiped the uncommitted edits to `StatusView.tsx`. For demo-home: drop `inert` from `PhoneFrame` for the sample test, drop `loading="lazy"` for the lazy-frame tests, and skip the cookie in `start()` when `had` for Start a new one.
