# Send x-forwarded-for from the page to test a per-address limit

**Learned:** 2026-10-19 · **From:** /build find-limits

`next start` only fills `x-forwarded-for` from the socket when the request has none (`node_modules/next/dist/server/base-server.js:567`), so a Playwright page can say which address it comes from. On Vercel the header can't be faked, because Vercel overwrites it.

Wrong: running two browser contexts and expecting them to count as two addresses. Both come from `::1`.

Right: `browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.24" } })`, with addresses from the documentation ranges (203.0.113.0/24, 198.51.100.0/24).
