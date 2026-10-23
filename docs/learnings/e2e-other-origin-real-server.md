# Play another site in an e2e with a real local server

**Learned:** 2026-10-23 · **From:** /build security-headers

Chrome's local network checks treat a page that Playwright fulfils with `route.fulfill` as public. Such a page can't load `localhost` in a frame: the request fails with `net::ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`, and no response ever comes. A page on `127.0.0.1` that Playwright fulfils fails the same way.

Wrong: `page.route("http://attacker.test/", …)` or a routed `127.0.0.1` page that puts the app in an iframe.

Right: start a `node:http` server on port 0 on `localhost` in `beforeAll`, and serve the other site's page from it, as `e2e/security-headers.spec.ts` does. Another port is another origin.
