# Decisions

Append-only. A changed decision is a new entry that supersedes the old one; only an
old entry's Status line ever changes.

## D1 · 2026-10-12 · Web page on a phone, no native app

Why: 22-44 hours in total; the helper only needs to open a link and tap OK, which a phone browser does.
Rejected: native phone app (an app store build or Expo setup eats a large share of the hours).
Source: docs/specs/shop-together/shape.md
Status: active

## D2 · 2026-10-12 · Next.js + TypeScript for the whole app

Why: pages and server routes live in one app; PayPal (@paypal/paypal-server-sdk) and Channel3 (@channel3/sdk) both ship TypeScript packages; Node 24 is already installed.
Rejected: Python FastAPI + HTML templates (local python3 is 3.9, and the phone pages would be hand-written).
Source: docs/specs/skeleton.md
Status: active

## D3 · 2026-10-12 · Host on Vercel Hobby

Why: the demo must stay up for free through judging, Dec 1-15; Vercel deploys Next.js from GitHub and does not sleep.
Rejected: Render free (sleeps after 15 minutes idle, so a judge's first visit waits 30-60 s), not hosted (fewer judges will clone and run it).
Source: docs/specs/skeleton.md
Status: active

## D4 · 2026-10-12 · Neon Postgres, free tier

Why: Vercel functions keep no state between requests; Neon free has no expiry, 0.5 GB and 100 compute-hours a month.
Rejected: Render Postgres free (deleted 30 days after creation, before judging), Supabase free (limits unchecked; its auth and storage aren't needed).
Source: docs/specs/skeleton.md
Status: active

## D5 · 2026-10-12 · GitHub Actions gates every deploy

Why: the repo must be public on GitHub anyway, and a red run must keep a broken build off the live demo.
Rejected: no CI (a broken merge goes straight to the live demo).
Source: docs/specs/skeleton.md
Status: active

## D6 · 2026-10-12 · Vitest for units, Playwright for e2e

Why: Playwright drives a phone-sized browser and two pages at once (relative and helper); Vitest gives precise failures for logic like money sums.
Rejected: Playwright only (slower, and vaguer failures for pure logic).
Source: docs/specs/skeleton.md
Status: active

## D7 · 2026-10-12 · pnpm as the package manager

Why: chosen by the user at spec pause 1; already installed here (9.0.0), with faster installs.
Rejected: npm (the suggested default; slower installs).
Source: docs/specs/skeleton.md
Status: active

## D8 · 2026-10-12 · MIT license

Why: the rules require an open-source license GitHub detects; MIT is short and permissive.
Rejected: Apache-2.0 (a longer file, and its patent grant isn't needed here).
Source: docs/specs/skeleton.md
Status: active

## D9 · 2026-10-12 · A status page is the skeleton's one screen

Why: one visit proves the deploy, Neon and the PayPal sandbox keys from the live host.
Rejected: a request box (slice 1 swaps it for a fixed list, and it never touches PayPal).
Source: docs/specs/skeleton.md
Status: active

## D10 · 2026-10-12 · Vercel Deployment Checks gate production

Why: scenario 5 needs a red build kept off the live URL; Deployment Checks hold promotion until chosen GitHub Actions pass, and the Git integration keeps VERCEL_GIT_COMMIT_SHA for the Build line.
Rejected: deploying from GitHub Actions with the Vercel CLI (a Vercel token in GitHub secrets, and the commit has to be passed in by hand).
Source: docs/specs/skeleton.md
Status: active

## D11 · 2026-10-12 · Migrations run from GitHub Actions after tests pass

Why: the production schema should change only after the test job is green on main.
Rejected: running migrations in Vercel's build step (runs before the checks pass, and on every preview build).
Source: docs/specs/skeleton.md
Status: active

## D12 · 2026-10-12 · pg over TCP and plain SQL migrations, no ORM

Why: one table; pg talks to Neon from Vercel and to CI's plain Postgres container alike.
Rejected: Neon's serverless HTTP driver (needs Neon's proxy, so CI's Postgres container can't serve it), Drizzle ORM (a dependency one table doesn't justify).
Source: docs/specs/skeleton.md
Status: active

## D13 · 2026-10-12 · CI tests run against a Postgres container

Why: no database secret is needed for tests, and every run starts from an empty database.
Rejected: a Neon branch per CI run (another secret, and an extra setup step per run).
Source: docs/specs/skeleton.md
Status: active

## D14 · 2026-10-12 · PayPal token check uses plain fetch; SDK waits for approve-and-pay

Why: the skeleton makes one call, POST /v1/oauth2/token.
Rejected: @paypal/paypal-server-sdk now (no orders or vault in this slice).
Source: docs/specs/skeleton.md
Status: superseded by D17

## D15 · 2026-10-13 · Atkinson Hyperlegible Next on cool greys, one violet accent

Why: the relative is older and the app shows names and amounts, so I, l and 1 must stay distinct; violet was picked from eight palettes at the direction test, and at hue 259° the OK button can't be mistaken for PayPal's blues (198–225°); every text pair reaches 7:1 in light and dark.
Rejected: green (first draft, changed at the direction test; it also clashed with green "Paid"), deep blue #1F4BAA (hue 221°, next to PayPal navy at 219°), ultramarine on cool greys or warm paper, slate, plum, deep teal and ink (shown at the direction test, not picked), system font (I, l and 1 look alike in SF and Roboto), Inter (the default a generated UI reaches for).
Source: docs/design/system-brief.md
Status: active

## D16 · 2026-10-13 · Save Rose's PayPal in PayPal's vault (v3)

Why: the spike saved a personal sandbox account once and charged it $18.99 later with no buyer present (capture 7BM91101S1572292D); a repeat with the same PayPal-Request-Id returned the same capture.
Rejected: Billing Agreements v1 (also worked in the spike, but PayPal lists it as deprecated), Sam paying from their own PayPal (the O2 fallback; the money would come from Sam, not Rose).
Source: docs/specs/approve-and-pay.md
Status: active

## D17 · 2026-10-13 · PayPal calls use plain fetch, not the server SDK

Why: approve-and-pay makes four REST calls (token, setup token, payment token, order), each proven with curl in the vault spike; the /status token check already uses fetch the same way.
Rejected: @paypal/paypal-server-sdk (a dependency for four calls, and its vault support is unchecked).
Supersedes: D14
Source: docs/specs/approve-and-pay.md
Status: active

## D18 · 2026-10-13 · One secret link each for Rose and Sam, no sign-in

Why: two fixed demo people moving sandbox money only; a link opens on a phone with no account to make (O3).
Rejected: a link plus a 4-digit PIN (one more step on Sam's screen and in the video), real sign-in (the most hours, and judges would need accounts).
Source: docs/specs/approve-and-pay.md
Status: active

## D19 · 2026-10-13 · Pages re-render every 3 s while on screen

Why: a request or an answer must show on the other phone within 5 s without a reload (scenarios 2 to 4); router.refresh() re-renders from Neon with no new dependency.
Rejected: reload by hand (a pull-to-refresh at every step of the video), server-sent events (a Vercel function held open for every open page).
Source: docs/specs/approve-and-pay.md
Status: active

## D20 · 2026-10-13 · The e2e starts from an already-saved PayPal

Why: PayPal's approval page may stop a robot and would need the sandbox account's password in GitHub; a saved vault ID in a GitHub secret still lets the e2e make a real sandbox charge end to end.
Rejected: driving PayPal's login page in CI (robot checks, and a password in GitHub secrets).
Source: docs/specs/approve-and-pay.md
Status: active

## D21 · 2026-10-13 · Search products with Channel3, over plain fetch

Why: one call returns real US listings with price, shop, link, photo and sizes in 1.8 s (spike, find-and-explain O4); Channel3 is a hackathon sponsor.
Rejected: an AI agent browsing shop websites (minutes per search, shops block it, and prices read off pages can be wrong), `@channel3/sdk` (a dependency for one endpoint).
Source: docs/specs/find-and-explain.md
Status: active

## D22 · 2026-10-13 · Claude Haiku 5.5 reads and explains, in two fixed steps

Why: 9.9 s for a whole Find and about $0.0005 a search in the spike (find-and-explain O11); picking 3 of 10 listings and writing short sentences is light work. Called with plain fetch, like D17.
Rejected: Sonnet 5.5 and Opus 5.5 (slower, and 17 to 33 times the cost), an agent loop that may search again (no scenario needs it, and it adds 3 to 5 s), `@anthropic-ai/sdk` (a dependency for one endpoint).
Source: docs/specs/find-and-explain.md
Status: active

## D23 · 2026-10-13 · Rose's current search lives in Neon, and Ask Sam reads the pick from it

Why: the page redraws every 3 s (D19), and the price charged must come from the server, never the form.
Rejected: carrying the listings in the form (Rose's browser could change a price), signing them in hidden fields (more code than one row).
Source: docs/specs/find-and-explain.md
Status: active

## D24 · 2026-10-13 · CI's e2e calls Channel3 and Claude for real

Why: no test-only layer, matching D20; results vary, so the e2e checks the shape of what comes back (find-and-explain O12).
Rejected: recorded replies behind a test-only switch (more code, and the real path only checked by hand).
Source: docs/specs/find-and-explain.md
Status: active

## D25 · 2026-10-14 · KinCart's mark is a tick on two wheels: the helper's OK carries the shopping

Why: one shape says both halves of the product, the helper's OK and the shopping; it scored 23 of 25 on the logo longlist and holds at 16px with its small cut, white on the violet tile (docs/design/logo/kit/).
Rejected: the K of KinCart on two wheels (20 of 25), a kiss-lock coin purse (20 of 25, 2 of 5 at 16px), the i's dot in the K's arms (read as "K."), a C in the K's arms (too wide to sit near-square), a pull-along trolley (read as luggage), and the earlier Shop-together icon rounds (an ampersand with a tick leg, an armchair h, browline glasses and before).
Source: docs/design/logo/brief.md
Status: active

## D26 · 2026-10-14 · The push e2e runs in Playwright's Firefox

Why: headless Firefox with a persistent profile received a real push through Mozilla's push service in 337 ms (ping-helper O5). No headless Chromium build can subscribe.
Rejected: Playwright's Chromium and Google Chrome (no push service in the headless shell, and subscribing hangs in full Chromium and Chrome; a normal Playwright context is incognito, where Chrome refuses push), faking the push with DevTools' `deliverPushMessage` (never proves our server sent anything).
Source: docs/specs/ping-helper.md
Status: active

## D27 · 2026-10-14 · Send pushes with the web-push package

Why: every push must be encrypted (RFC 8291) and signed (VAPID); `web-push` does both in one call and delivered in both spikes (ping-helper O1, O5).
Rejected: hand-rolled ECDH, HKDF, AES-GCM and ES256 signing with `node:crypto` (about 100 lines of crypto that only a real push proves right), a hosted push service such as OneSignal or Firebase Cloud Messaging (another account and SDK for two people).
Source: docs/specs/ping-helper.md
Status: active

## D28 · 2026-10-14 · One manifest and one service-worker scope per secret link

Why: the Home Screen icon must open the person's own link (O1), and Rose's and Sam's links on one phone each need their own subscription (O7).
Rejected: one site-wide manifest (its `start_url` can't hold a secret link, so the icon would open `/` and land on `/status`), one service worker for the whole site (both links on one phone would share a single subscription).
Source: docs/specs/ping-helper.md
Status: active

## D29 · 2026-10-14 · Pushes go out after the response, with Next's after()

Why: an ask or a payment never waits on a push service (ping-helper scenario 5).
Rejected: awaiting the sends inside the action (a slow push service would hold Rose's or Sam's tap), a queue (no push takes more than a second).
Source: docs/specs/ping-helper.md
Status: active

## D30 · 2026-10-14 · CI's e2e sends a real push through Mozilla's push service

Why: it proves our server's encrypted, signed send end to end on every push, matching D20 and D24.
Rejected: running the push e2e by hand only (CI would never catch a broken notification).
Source: docs/specs/ping-helper.md
Status: active
