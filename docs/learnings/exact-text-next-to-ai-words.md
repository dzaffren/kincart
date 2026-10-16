# Match a listing name exactly in an e2e when the AI writes about it

**Learned:** 2026-10-16 · **From:** /ship photo-ask

On main's CI run after the merge, `samPage.getByText(name)` found two elements: the listing's name, and Haiku's "Why it fits: It is a CR2032 3V Lithium Coin Battery…". Playwright's `getByText` with a string matches any element that contains it, and real Haiku text changes from run to run (D24), so the test passed locally and failed on main.

Wrong: `getByText(name)` for a listing name on a page that also shows the AI's sentences.

Right: `getByText(name, { exact: true })`, or a locator scoped to the name's own class.
