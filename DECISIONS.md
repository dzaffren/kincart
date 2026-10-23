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
Status: superseded by D42

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

## D31 · 2026-10-14 · A basket searches all its things at once, each with find-and-explain's two calls

Why: a 5-thing basket must show within 20 s (O5); searched all at once, it took 7.2 to 7.7 s in the spike with no rate limit (O12), where one after another would add up every thing's time. Each thing keeps its own searches and Haiku pick, so a thing that fails blanks only its own group (scenario 3).
Rejected: one thing after another (about 27 s for five at the spike's 4.3 to 5.9 s a thing, past the 20 s budget), one Haiku call choosing for every thing at once (one long answer, and one bad thing spoils the whole basket).
Source: docs/specs/basket.md
Status: active

## D32 · 2026-10-14 · A basket is one purchase request, with its lines in a jsonb column

Why: one OK and one charge per basket (scenario 2), and the one-open index already keeps Rose to one request at a time; the lines are only ever read with their request, like Rose's saved listings (D23).
Rejected: a `request_lines` table (a join on every 3 s render, for rows nothing reads alone), one request per thing (Sam answers each one, the problem this slice removes).
Source: docs/specs/basket.md
Status: active

## D33 · 2026-10-14 · A basket is charged as one PayPal purchase unit for the ticked total

Why: `charge()` stays as it is, and our receipt already lists every line (scenario 2).
Rejected: PayPal line items with an amount breakdown (Rose's PayPal activity would list each thing, but no scenario needs it, and the item amounts must add up to the total exactly or PayPal refuses the order).
Source: docs/specs/basket.md
Status: superseded by D86

## D34 · 2026-10-14 · Sam's total limit is off until set, and stops Rose at Ask Sam for any ask

Why: Sam already approves and can untick every basket, so the limit's job is to keep an ask over Sam's budget from reaching Sam at all. One check for every ask keeps Sam's two limits independent.
Rejected: a warning on Sam's page (the basket still arrives, and Sam trims it as today), a total limit at least the price limit (both of Sam's forms would have to refuse a clash), $100 from the start (today's three-thing baskets at $40 each would be stopped).
Source: docs/specs/basket-cap.md
Status: active

## D35 · 2026-10-14 · Sam's total limit is its own one-row table, and no row means no limit

Why: no total limit is the default (D34), and an absent row says that with no null column; clearing is one DELETE.
Rejected: a nullable column on `price_limit` (its row needs a price limit, so saving only a total would store a made-up one).
Source: docs/specs/basket-cap.md
Status: superseded by D46

## D36 · 2026-10-14 · Rose's over-limit picks come back in the page address as listing ids

Why: scenario 2 keeps Rose's picks after the redirect; the ids only choose from the saved search, so every price still comes from Neon (D23).
Rejected: a picks column on `rose_search` (a schema change for state that lasts one screen).
Source: docs/specs/basket-cap.md
Status: active

## D40 · 2026-10-15 · Wide screens: px breakpoints at 880 and 1280px, and phone frames edged in `control`

Why: two 390px phones need 852px plus a 17px desktop scrollbar, and at 1280px a 379px text column fits beside them; the page inside a frame is also `bg`, so a `line` edge (1.2:1) almost vanishes, and `control` is 3.6:1.
Rejected: em breakpoints at 54em and 80em (at a 12px browser text setting, 54em is 648px and the 852px of frames scroll sideways), 864px (with a 17px scrollbar the sides drop under 24px), a `line` frame edge (1.2:1 light, 1.5:1 dark), a device bezel or notch (decoration, against "steady, never flashy").
Source: docs/design/system-brief.md
Status: superseded by D50

## D42 · 2026-10-15 · Each visitor starts a household of their own, with one secret link each for its Rose and Sam

Why: in production every family is its own; judges sharing one pair see each other's asks and buzz each other's phones (demo-home O8). A link still opens on a phone with no account to make.
Rejected: one shared pair with a Start over button (two judges at once still mix, and old phones buzz), Log in with PayPal (judges would need sandbox logins), a link plus a 4-digit PIN and real sign-in (as in D18: more steps and hours).
Supersedes: D18
Source: docs/specs/households.md
Status: active

## D43 · 2026-10-15 · Every household's people are Rose and Sam

Why: the video and every page and push say Rose and Sam, and a judge tries KinCart with no form first (O2).
Rejected: the visitor types two names (production-like, but one more step before a judge can try it).
Source: docs/specs/households.md
Status: active

## D44 · 2026-10-15 · A browser remembers the household it started

Why: a judge who closes the tabs gets back to their own Rose and Sam from the one URL (O3).
Rejected: every visit to `/` starts fresh (the two links would be the only way back).
Source: docs/specs/households.md
Status: active

## D45 · 2026-10-15 · The two links from before become the first household

Why: the owner's phones, Home Screen icons, Rose's saved PayPal, the receipts and Sam's saved phone keep working, and so do CI's fixed links (O4).
Rejected: retiring them (the owner re-adds the icons and turns notifications on again).
Source: docs/specs/households.md
Status: active

## D46 · 2026-10-15 · Every table is split by household; the one-row tables' id becomes the household id

Why: the change is expand only. Old code still writes `id` 1, which is household 1 (D45), so existing rows need no backfill, and a rollback deploy keeps working (scratch run, 2026-10-15). Sam's total limit stays its own table, and no row for a household means no total limit for it.
Rejected: a `household_id` column beside `id` on the one-row tables (the primary key moves off `id`, so old code's `ON CONFLICT (id)` fails), a database for each household (Neon's free tier, and every query would pick a connection).
Supersedes: D35
Source: docs/specs/households.md
Status: active

## D47 · 2026-10-15 · Household links are stored as SHA-256 hashes; household 1's stay in Vercel's env

Why: a leaked table must not hand out links that act as Rose or Sam (O6). The browser's cookie brings the links back to `/` (D44), so nothing needs the plain token.
Rejected: tokens in plain text (a database leak gives every link), copying household 1's env links into the table (a second copy of a secret, and a one-off script).
Source: docs/specs/households.md
Status: active

## D48 · 2026-10-15 · A new household starts with a copy of household 1's saved PayPal

Why: a judge meets no PayPal login (scenario 1), and the vault the owner keeps linked is the one every judge pays from.
Rejected: a vault id in a new env setting (one more value to keep in step with the vault), a PayPal login for each household (judges would need sandbox logins).
Source: docs/specs/households.md
Status: superseded by D58

## D49 · 2026-10-15 · A migration file drops an index that a later migration replaces

Why: `db:up` reruns every up file, and 0002's global open-ask index cannot be built again once two households have open asks ("could not create unique index" on the scratch run).
Rejected: leaving 0002 as it is and dropping the index in 0007 (the next `db:up` fails at 0002), a table of applied migrations (a new runner for one index).
Source: docs/specs/households.md
Status: active

## D50 · 2026-10-15 · The home page is a showcase: a violet block, 800-weight display type, and phones with a device edge, on px breakpoints at 880 and 1280px

Why: the home page sells KinCart to judges (demo-home O10), and at 1280 × 800 this keeps the three-line headline, both phones and Try KinCart on one screen. Two 390px phones need 852px plus a 17px scrollbar, so the phones show from 880px and the words move beside them from 1280px. The 10px edge sits inside the 390 × 844 frame. Text on the block is 8.2:1 light and 12.9:1 dark.
Rejected: the Apple direction, a centred name over lifted phones on a grey stage (at 1280 × 800 the phones sit mostly below the fold); D40's flat `control` frame edge (a box, not a phone, on a selling page); a shadow under the phones (the block is flat); em breakpoints (at a 12px text setting, 54em is 648px and the frames scroll sideways); 864px (with a 17px scrollbar the sides drop under 24px).
Supersedes: D40
Source: docs/design/system-brief.md
Status: active

## D51 · 2026-10-15 · Hidden phones stay unloaded with loading="lazy", not a width check in the browser

Why: Chromium, Firefox and WebKit 26.6 skip a lazy iframe that is `display:none`, and load both once shown (demo-home O14 spike, 2026-10-15). So a phone never loads and polls two hidden pages, and the frames come with the HTML, not after hydration.
Rejected: a client component that adds the frames only when the window matches (the frames appear after hydration, and it is one more client component), frames that load at once (every phone with a household would load and poll both pages).
Source: docs/specs/demo-home.md
Status: active

## D52 · 2026-10-15 · Rose's and Sam's pages leave out Notifications inside the home page's phones

Why: on a laptop both phones are on one screen, so a push adds nothing there. A permission prompt or a push subscription from inside a frame is unproven (demo-home O15). Rose's or Sam's page in its own tab still offers it.
Rejected: a spike to prove it first (time spent on a part judges don't need on a laptop), leaving it in (a refused prompt shows "Blocked" or an error inside the phone).
Source: docs/specs/demo-home.md
Status: active

## D53 · 2026-10-15 · A wide home page shows Rose's and Sam's real pages side by side

Why: a judge sees Sam's screen change within seconds of Rose's ask without switching tabs, which is the product's point (O2).
Rejected: a button for each that opens a new tab (the judge switches tabs to see the ask arrive), a button plus a QR code for each (a second device for every judge).
Source: docs/specs/demo-home.md
Status: active

## D54 · 2026-10-15 · Sam sees each thing's photo and "Good to know", not Rose's "what it is" sentence

Why: the listing name and the photo already say what the thing is, and Sam's page stays short with a warning to read before OK.
Rejected: every sentence Rose sees (each item gets about two lines longer on Sam's phone).
Source: docs/specs/clearer-pages.md
Status: active

## D55 · 2026-10-15 · The KinCart header shows on Rose's and Sam's pages inside the home page's phones too

Why: the phones show the real page, so no check for a frame is needed.
Rejected: leave it out inside the phones (needs a frame check like D52's, and the brand already sits beside them).
Source: docs/specs/clearer-pages.md
Status: active

## D56 · 2026-10-15 · Listing photos are 128px, from a new --photo-size token

Why: at 64px an older eye can't tell what the thing is, and 128px under the name keeps the text at full card width. Each card grows about 140px.
Rejected: the photo at full card width, 4:3 (each card grows about 210px, and Rose's three-thing page about 1,900px), a one-off 128px in shop.css (the system has no such size, so it would drift).
Source: docs/specs/clearer-pages.md
Status: active

## D57 · 2026-10-15 · A one-thing ask stores its note and photo in two new columns

Why: a one-thing ask already keeps its shop, link and reason in columns on `purchase_requests`, so two nullable columns follow the same shape, and old code ignores them.
Rejected: store a one-thing ask as a one-line basket in `lines` (Sam's one-thing screen would turn into the tick-list screen), a jsonb column for the extras (a second shape for the same request).
Source: docs/specs/clearer-pages.md
Status: active

## D58 · 2026-10-15 · A new household starts with no saved PayPal, and Skip copies household 1's

Why: while every household started linked, no judge saw PayPal's own approval page (a friend's feedback on v1.1.0, 2026-10-15). Skip keeps today's one-tap path, paying from household 1's PayPal, which the owner keeps linked.
Rejected: start linked and add a second home page button for linking (fewer judges would see PayPal), keep D48 as it is (PayPal stays out of sight).
Supersedes: D48
Source: docs/specs/link-paypal-onboarding.md
Status: active

## D59 · 2026-10-15 · Rose's link screen shows a sandbox login of its own, not household 1's

Why: anyone can sign in with a login on a public page. On its own account, a stranger can only spoil linking. Household 1's account backs the payments of every household that skipped.
Rejected: household 1's sandbox login (one cancel of its saved permissions stops payment for every household that skipped).
Source: docs/specs/link-paypal-onboarding.md
Status: active

## D60 · 2026-10-15 · From the home page's phone, PayPal opens in a new tab

Why: PayPal's sign-in page refuses frames (x-frame-options: SAMEORIGIN). A new tab keeps both phones on screen, and Rose's phone updates by itself within 3 s (D19).
Rejected: the whole window (the judge leaves the home page and has to come back to /).
Source: docs/specs/link-paypal-onboarding.md
Status: active

## D61 · 2026-10-15 · In a home page phone, Link PayPal posts a plain form to POST /r/<token>/link, found by ?in=phone

Why: React runs a server action and its redirect inside the frame, whatever the form's target. The page must know at render that it is in a frame, and the 3 s refresh keeps ?in=phone in the address.
Rejected: a server action form with target="_blank" (React ignores the target), a window.top check in the browser as NotifyControl does (the first paint shows the wrong form), the Sec-Fetch-Dest header (the 3 s refresh sends "empty", not "iframe").
Source: docs/specs/link-paypal-onboarding.md
Status: active

## D62 · 2026-10-15 · The demo login lives in the env as PAYPAL_DEMO_EMAIL and PAYPAL_DEMO_PASSWORD

Why: the password stays out of the repo. With no value set, the card is left out, so local runs need nothing.
Rejected: a constant in the code (a password in a tracked file), a row in the database (a migration to hold one pair of values).
Source: docs/specs/link-paypal-onboarding.md
Status: active

## D63 · 2026-10-16 · Find reads a photo the way it reads typed words: with any words, and a written list is a basket

Why: a photo alone can't say a size or a count, such as "size 8", and an older person's paper shopping list is the same ask as a typed list of up to 5 things.
Rejected: a photo replaces the typed words (Rose can't add a size or a count), one thing for each photo (a photo of a paper list finds one thing or nothing).
Source: docs/specs/photo-ask.md
Status: active

## D64 · 2026-10-16 · Rose's photo goes to Claude once and is not kept

Why: Rose sees the AI's words for the photo and Sam sees the listings, so nothing needs the photo after Find. A photo taken at home can also show more than the thing.
Rejected: keep the photo and show it to Sam beside the listing (needs photo storage and a rule for deleting it, so a slice of its own).
Source: docs/specs/photo-ask.md
Status: active

## D65 · 2026-10-16 · Rose's photo shrinks in the browser to a 1600px JPEG, and Next's 1 MB body limit stays

Why: phone camera photos are 2 to 12 MB, and Next refuses a server action body over 1 MB. In the O6 spike, a 5.2 MB photo failed with "Body exceeded 1 MB limit", and shrunk it was 519 KB in 136 ms.
Rejected: raise `serverActions.bodySizeLimit` to fit camera photos (a 12 MB upload on a phone's connection, and more for anyone with the link to send), upload to a file store first (a store for a photo that D64 says is not kept).
Source: docs/specs/photo-ask.md
Status: superseded by D70

## D66 · 2026-10-16 · A photo Find sends the photo to Haiku in the first step only, with a prompt of its own

Why: the second step picks from Channel3's listing text, which a photo does not change. A separate prompt leaves the typed path's prompt exactly as its tests and CI check it.
Rejected: one prompt for words and photos (it changes the typed path's tested prompt), the photo in both steps (more image tokens, and no scenario needs it).
Source: docs/specs/photo-ask.md
Status: active

## D67 · 2026-10-16 · rose_search keeps a from_photo flag and a "nothing in photo" outcome

Why: "from your photo" and the photo's own nothing-found message must survive the 3 s redraw (D19) and a reopened link, like the rest of Rose's search (D23).
Rejected: a `?photo=1` in the page address (lost after Ask Sam's error redirects and when Rose opens the link again).
Source: docs/specs/photo-ask.md
Status: active

## D68 · 2026-10-16 · Find takes up to 5 photos, and reads them together as one ask

Why: a basket holds up to 5 things, so one photo for each thing fills it. Rose's words add details, two photos of one thing make one thing, and more than 5 things get today's notice.
Rejected: up to 3 photos (a 4- or 5-thing ask needs a written list), one thing for each photo (the front and back of one pack become two groups), words that add things of their own (one photo and several would follow different rules), refusing photos past the fifth (Rose picks them all again).
Source: docs/specs/photo-ask-several.md
Status: active

## D69 · 2026-10-16 · A photo that shows nothing doesn't stop the others, and the results say so

Why: one blurry photo out of 3 would otherwise throw away the 2 things found. The photos are gone after Find (D64), so the note is Rose's only sign that one was missed.
Rejected: the whole Find stops (Rose adds all 3 photos again), the blank photo is dropped with no note (Rose may not see that a thing is missing).
Source: docs/specs/photo-ask-several.md
Status: active

## D70 · 2026-10-16 · Each of Rose's photos shrinks in the browser to a 1200px JPEG of at most 180 KB, and Next's 1 MB body limit stays

Why: Find takes up to 5 photos (D68), and 5 photos at 180 KB stay under 1 MB with Rose's words. Haiku sees a 1200×900 photo as about 1,419 tokens, so the cost also goes down. Phone camera photos are 2 to 12 MB, and Next refuses a server action body over 1 MB.
Rejected: raise `serverActions.bodySizeLimit` to 4 MB (uploads up to 4 MB on a phone's connection, 4 times more for anyone with the link to send, and close to Vercel's 4.5 MB request limit), shrink each photo to 900 KB divided by the number of photos (every photo shrinks again on each add, and a Find during it could pass 1 MB), upload to a file store first (a store for photos that D64 says are not kept).
Supersedes: D65
Source: docs/specs/photo-ask-several.md
Status: active

## D71 · 2026-10-16 · One Haiku call reads all of Rose's photos, each labelled, with one photo prompt for 1 to 5 photos

Why: only one call that sees every photo can list a pack once when two photos show it (D68), and put "size 8" on the slippers and not on the battery. Each thing names its photos, so the code sorts them by photo and never counts a covered photo as blank (D69). In the O11 spike, this got every case right in 3 of 3 runs.
Rejected: one call for each photo, at once (it can't merge two photos of one pack or fit words to the right thing, and it makes up to 5 calls), a second prompt for several photos beside photo-ask's (two photo prompts to keep in step), a blank list alone (a photo merged into another came back blank in 3 of 3 runs), photo numbers alone with blank worked out in code (a garden's stone urn was listed as a thing in 3 of 3 runs).
Source: docs/specs/photo-ask-several.md
Status: active

## D72 · 2026-10-16 · rose_search keeps how many photos Find read and how many showed nothing

Why: ", from your photos" and the note that a photo showed nothing must survive the 3 s redraw (D19) and a reopened link, like the rest of Rose's search (D23, D67).
Rejected: counts in the page address (lost after Ask Sam's error redirects and when Rose opens the link again, as D67 says).
Source: docs/specs/photo-ask-several.md
Status: active

## D73 · 2026-10-19 · Count Finds and new households in a Neon table, not a Vercel Firewall rule

Why: the limit is 20 Finds and 5 new households for each address in 24 hours (find-limits O1). Vercel Hobby allows one rate-limit rule, with a fixed window of 10 minutes at most, so a 24-hour count can't be written. A stopped Find must show Rose KinCart's own notice, and the Firewall answers with a bare 429.
Rejected: a Vercel Firewall rate-limit rule on the `find` Server Action Name (1 rule on Hobby, a 10-minute window at most, a bare 429 page), Vercel's Rate Limiting SDK (the same rule and the same 10-minute window).
Source: docs/specs/find-limits.md
Status: active

## D74 · 2026-10-19 · Limit by network address, kept only as an HMAC under ADDRESS_KEY

Why: a script starts a new household for every Find, so only the address it comes from links its Finds. The table must not hold visitors' addresses, so it keeps an HMAC-SHA256 under ADDRESS_KEY. Without the key, Find is off and Try KinCart fails, so nothing runs unlimited.
Rejected: a limit for each household (a script starts a new one each time), the raw address kept for a day (anyone who reads Neon sees visitors' addresses), plain SHA-256 (every IPv4 address can be hashed in minutes), no addresses with one daily ceiling for everyone (one script blocks every judge for a day).
Source: docs/specs/find-limits.md
Status: active

## D75 · 2026-10-19 · An IPv6 address counts by its first 64 bits

Why: one home or office network gets a /64, so a script can change its IPv6 address on every request inside it. An IPv4-mapped IPv6 address counts as its IPv4 address.
Rejected: the whole IPv6 address (a script gets a new one for every Find).
Source: docs/specs/find-limits.md
Status: active

## D76 · 2026-10-19 · One row for each address and kind keeps the last 24 hours' times, changed by one upsert

Why: one `INSERT ... ON CONFLICT DO UPDATE ... WHERE` locks the row and adds a time only while fewer than the limit remain. In 3 of 3 runs of 30 at once, exactly 20 went through. The window rolls, so each use drops out exactly 24 hours after it ran, and the notice can say when.
Rejected: a row for each use, counted and then inserted (two Finds at once both see 19, and both run), an advisory lock in a transaction (needs one connection for several statements, and `query()` opens one for each), a calendar day (a script spends 20 before midnight and 20 after).
Source: docs/specs/find-limits.md
Status: active

## D77 · 2026-10-19 · A stopped Find keeps Rose's words as a retry search, and the wait rides in the page address as a time

Why: the ask screen already puts a `retry` search's words in the box (`state.ts:90`). `until` lets the 3 s redraw (D19) count the wait down, and drops the notice once it passes.
Rejected: a new `limit` outcome in `rose_search` (a migration to widen its check, and the time still has to live somewhere), minutes in the page address (the redraw would show the same number forever).
Source: docs/specs/find-limits.md
Status: active

## D78 · 2026-10-19 · /status counts Finds, Channel3 searches, and stopped Finds and Try KinCarts, by the UTC day and month

Why: Channel3's ~1,000 searches a month run out first, and one Find sends 0 to 10, so the page shows both. The month's searches show "of 1,000", in bold red from 800. The stops show each limit at work. Every call sent counts, because nobody knows which failures Channel3 bills.
Rejected: Claude calls too (Anthropic's console shows the spend), stopped Finds only (a script that starts households would not show), the last 24 hours and 30 days (a calendar month reads straight against a monthly quota), answered calls only (too few if Channel3 bills failures), the number alone (you would do the sum yourself).
Source: docs/specs/usage-on-status.md
Status: active

## D79 · 2026-10-19 · Anyone can see the counts on /status

Why: `/status` has no sign-in, and the counts hold no addresses and no household data. A script writer learns how many searches are left, and the per-address limit still stops each address at 20 Finds.
Rejected: the counts only with a secret key in the page address (a new env value, and a link to keep, for numbers that hold nothing private).
Source: docs/specs/usage-on-status.md
Status: active

## D80 · 2026-10-19 · Usage lives in one row for each UTC day, added to by one upsert

Why: `/status` needs this month's totals and the stops. `address_uses` keeps only 24 hours for each address, and a stopped Find adds nothing to it. One row a day adds 365 rows a year, and `INSERT ... ON CONFLICT DO UPDATE SET finds = usage_days.finds + EXCLUDED.finds` loses no count when two Finds end at once.
Rejected: a row for each Find and each stop (a script's flood of stopped Finds becomes a flood of rows), sums from `address_uses` (24 hours only, and no stops), Vercel's logs (the page can't read them).
Source: docs/specs/usage-on-status.md
Status: active

## D81 · 2026-10-19 · A Find counts once, after its searches, with a tally passed down like reasons, and a failed count only logs

Why: `searchThing()` adds 2 to the tally before its two Channel3 calls, so every call sent counts (D78). One upsert then adds the Find and its searches. A count that can't be written logs `usage status=failed`, and Rose's Find goes on.
Rejected: a change to `find()`'s result to carry the count (13 test assertions change for one number), a write for each search (up to 10 more Neon connections for one basket Find), the count inside `after()` as pushes do (D29) (the e2e would have to poll `/status`, and one upsert adds little to a Find that waits on Claude and Channel3).
Source: docs/specs/usage-on-status.md
Status: active

## D82 · 2026-10-22 · Sam's OK pays the shop's own PayPal, and KinCart never holds Rose's money

Why: today the charge lands in KinCart's sandbox account and no order reaches the shop, so a judge asks who the merchant is. Paying the shop keeps refunds, returns and fraud with the shop. Two PayPal claims are unproven (after-review O3, O4).
Rejected: KinCart buys for Rose as a reseller (refunds, returns and fraud become KinCart's), no build and a pitch to PayPal only (the review's worst gap stays).
Source: docs/specs/after-review/shape.md
Status: superseded by D108

## D83 · 2026-10-22 · A person approves every buy, and the AI only does more legwork

Why: KinCart's promise is that nothing is bought without Sam's OK. The AI repeats past asks and finds other options, and Sam still taps OK on each one.
Rejected: a standing OK, where the AI buys repeat things under a cap without asking (the clearest agentic story, but it breaks that promise and the first shape's "Not doing: auto-approve").
Source: docs/specs/after-review/shape.md
Status: active

## D84 · 2026-10-22 · Find another tries other words, then the nearest listings over Sam's limit, and runs only when Rose or Sam taps it

Why: one control serves a No, an untick and an empty search. Other words alone leave a search empty when Sam's limit is low, so Sam can then allow one listing over it.
Rejected: a scheduled search that pings Rose later (it needs a background job, and Vercel Hobby runs crons once a day), other words only (a low limit still finds nothing), a separate slice each for a swap after a No and for keep looking (two controls for one job).
Source: docs/specs/after-review/shape.md
Status: active

## D85 · 2026-10-22 · Secret links stay, with no accounts or family invites for now

Why: a secret link gives a judge both Rose and Sam in one tap. Accounts add a sign-up and show nothing new in sandbox.
Rejected: accounts and family invites now (a sign-up for every judge, before they see anything).
Source: docs/specs/after-review/shape.md
Status: active

## D86 · 2026-10-22 · Every charge lists its things as PayPal items, and the total is their sum

Why: Rose's PayPal activity should show what Sam paid for (itemized-receipt scenario 1). The amount and `item_total` come from the same stored cents as the items, so PayPal's `ITEM_TOTAL_MISMATCH` refusal (seen in sandbox) can't happen. A basket is still one purchase unit and one charge for the ticked total, as D33 said.
Rejected: one line named "2 things" (D33: Rose's activity can't show what was bought), a retry without items when PayPal refuses (a second charge path to test, for a mismatch the sum already rules out).
Supersedes: D33
Source: docs/specs/itemized-receipt.md
Status: active

## D87 · 2026-10-22 · Listing names go to PayPal whole, and PayPal cuts any past 127 characters

Why: the sandbox took 128- and 300-character names and kept the first 124 characters and "..." (itemized-receipt O6, 2026-10-22). KinCart's receipt keeps the whole name.
Rejected: cutting in `charge()` to 126 characters and "…" (code for a cut PayPal already makes in sandbox).
Source: docs/specs/itemized-receipt.md
Status: active

## D88 · 2026-10-22 · A pick must be the product Rose asked for, in any brand or pack size

Why: an older shopper may pick a battery case for "AA batteries" and not see the mistake until it arrives. Any brand or pack size of the real thing does the job.
Rejected: drop only listings that are a different product (a battery case or a pack of AAA still reaches Rose as "AA batteries"), only the brand Rose names (fewer results, when any brand of AA works).
Source: docs/specs/picks-that-match.md
Status: active

## D89 · 2026-10-22 · A listing whose photo shows something other than its name never reaches Rose, and a listing with no photo is judged on its words

Why: Channel3 lists a white basket, a trash can and a pin board from containerstore.com as "AA Batteries", with words about Energizer AA (O1). Rose and Sam judge by the photo (D54).
Rejected: show a mismatch with a "Good to know" note (Rose may still pick it, and Sam sees a basket), drop every listing with no photo (fewer results, and they show today).
Source: docs/specs/picks-that-match.md
Status: active

## D90 · 2026-10-22 · A recorded set of real wrong listings proves the pick step, run 3 times against real Haiku

Why: Channel3's results change, so a live e2e may never meet a wrong listing. The containerstore.com listings in O1 are real, and a test can run them again and again. The live e2e still calls Channel3 and Claude, as D24 says.
Rejected: a live e2e check alone (it passes on a day with no wrong listing in the results).
Source: docs/specs/picks-that-match.md
Status: active

## D91 · 2026-10-22 · Checking picks adds no time to Find: one thing within 15 s, five within 20 s

Why: these are find-and-explain's and the basket's limits (D31). A slower Find makes a worse first look for a judge.
Rejected: 5 s more for each (one thing within 20 s, five within 25 s).
Source: docs/specs/picks-that-match.md
Status: active

## D92 · 2026-10-22 · The pick call sees each listing's photo, downloaded by KinCart, and listings above the limit stay names only

Why: Channel3's words can say "AA batteries" over a photo of a basket, so only the photo shows the mismatch (O1). One call keeps D22's two fixed steps, and Haiku can pick another listing in place of a misfit. The API refuses Channel3's photo URLs because the CDN's robots.txt disallows crawlers, so KinCart sends the bytes.
Rejected: a third call that checks the 3 picks' photos (one more call in a row against the 15 s limit, and Rose may see 1 option when others fit), photo URLs in the request (the API refuses them), photos for listings above the limit too (up to 10 more photos a call, for a wrong message, not a wrong pick).
Source: docs/specs/picks-that-match.md
Status: active

## D93 · 2026-10-22 · A photo KinCart can't download drops its listing, and a failed pick call finds nothing, as today

Why: a listing whose photo can't be checked could be O1's basket, and Rose's and Sam's pages would likely show a broken photo too. A wrong pick must never get through (D88, D89).
Rejected: judge such a listing on its words (a basket like O1's gets through when its photo fails), retry a failed pick call without photos (the basket could reach Rose again).
Source: docs/specs/picks-that-match.md
Status: active

## D94 · 2026-10-22 · The recorded set keeps its photos in the repo, and runs in `pnpm test` on every push

Why: Channel3 can drop a listing or photo at any time, and the O1 listings are the proof. A wrong pick then fails CI like any other test, as the live e2e can (D24). A run costs an estimated 3 to 5 cents.
Rejected: photos fetched live from Channel3's CDN (the test breaks when a photo goes), a run by hand before a ship only (a prompt change could ship a wrong pick between runs).
Source: docs/specs/picks-that-match.md
Status: active

## D95 · 2026-10-22 · KinCart downloads listing photos only from cdn.trychannel3.com, with redirects refused, in 3 s and up to 1 MB

Why: the URL comes from shop data, so the server must not fetch any host that a listing names. All 60 photos in the O1 spike were on `cdn.trychannel3.com`, from 3 to 260 KB, and took 0.7 to 3.5 s fetched all at once. The time and size caps stop one slow or huge photo from failing the whole pick call.
Rejected: any https host with redirects refused (the server fetches whatever host a listing names).
Source: docs/specs/picks-that-match.md
Status: active

## D96 · 2026-10-22 · The home page cites one US survey as its proof, and quotes nobody

Why: the judge's review said nothing on the home page proves families need KinCart. Foong et al. (JMIR 2025) surveyed 657 US adults, a nationally representative sample. About 1 in 10 had signed in to someone's money or medical account with that person's login, which is the problem "No more logging in as them" names.
Rejected: a quote from someone who tried KinCart (a hackathon build has no real users, so a quote proves the demo works, not that families need it), Latulipe et al., CHI 2022 (42 people in Canada, and only its abstract could be read), the FBI IC3 2025 report (scam losses, and KinCart has no scam checks, so it reads as a promise).
Source: docs/specs/home-page-proof.md
Status: active

## D97 · 2026-10-22 · Rose gets one Find another for each empty Find, No or untick, and each one counts as a Find

Why: one try with other words gives Rose new options without a loop of empty searches. It sends the same Claude and Channel3 calls as a Find, so it counts toward the address's 20 a day (D73) and on `/status` (D78).
Rejected: taps until the daily limit, each with untried words (a loop of empty results, and KinCart must keep every tried query), a Find another that runs free (a script could tap it past the daily limit).
Source: docs/specs/find-another.md
Status: active

## D98 · 2026-10-22 · Find another leaves out only what Sam just refused, and after a basket No it searches every thing

Why: a No or an untick stores the refused listings with the ask. Rose's other options are cleared at Ask Sam. One tap for the whole basket keeps Rose's page to one new control.
Rejected: leave out every listing Sam ever refused for the thing (a history to store), also leave out the options Rose saw and didn't pick (KinCart must keep them after Ask Sam), Rose ticks which things to search after a basket No (one more control on Rose's page).
Source: docs/specs/find-another.md
Status: active

## D99 · 2026-10-22 · Find another writes other words in a Haiku call of its own for each thing, then runs Find's search and pick step without what Sam refused

Why: the other-words call takes the place of reading Rose's words, so a Find another sends the same calls as a Find (D97) and stays within D91's times. The pick step is the one that D88 to D95 fixed. Each thing gets its own call, so one bad answer blanks only its own group (D31).
Rejected: `readNeed()` again with a hint about the last query (it changes `NEED`, which its tests check, as D66 avoided), one call for every thing in a basket (one bad answer spoils every group, as D31 found), an agent loop that searches until it finds a fit (D22: no scenario needs it, and it adds 3 to 5 s).
Source: docs/specs/find-another.md
Status: active

## D100 · 2026-10-22 · A search keeps its query and whether Find another ran it, and each ask keeps its picks' words and queries in a queries jsonb column

Why: Find another must avoid the last query and leave out what Sam refused. `claim()` keeps only the paid lines, so an untick loses the left-out pick's id. `tried` must survive the 3 s redraw (D19) and a reopened link, as `from_photo` does (D67). D57 still holds for a one-thing ask's note and photo.
Rejected: `thing` and `query` columns and a `left_out_lines` column, as D57 did for the note and photo (`claim()` must change, and a basket keeps its queries in two places), no stored query (Haiku can't tell which words to avoid), keep `rose_search` after Ask Sam (the unticked pick is still lost, and a stale tab could ask for the refused pick again), `?tried=1` in the page address (lost on a reopened link, as D67 found).
Source: docs/specs/find-another.md
Status: active

## D101 · 2026-10-22 · A stopped Find another saves nothing, so its screen and its Find another stay, with the limit notice on top

Why: Rose can tap it again once the wait passes. The wait rides in the page address, as for Find (D77). It still counts as a stopped Find (D97).
Rejected: a retry search, as a stopped Find saves (D77) (the No notice and its Find another would vanish, and an empty search's words are already saved).
Source: docs/specs/find-another.md
Status: active

## D102 · 2026-10-23 · Bought before lists Sam's 3 newest paid asks, the same listings once, and Ask again repeats only what Sam paid for

Why: older shoppers rebuy what Sam approved before. Three cards fit under Find on a phone. A No already offers Find another (D97), and a left-out thing has it on the receipt.
Rejected: refused and failed asks too (Find another covers a No), every paid ask (household 1 has dozens from judges and CI), the whole basket with its left-out things (Sam never bought them).
Source: docs/specs/ask-again.md
Status: active

## D103 · 2026-10-23 · Code, not Haiku, says what changed about last time's listing: its price, its shop, over the limit now, or not found

Why: a price and a shop compare exactly in code. Haiku could word a price wrong, and its sentence is harder to test.
Rejected: Haiku writes what changed (it can be wrong), the price only (a new shop or a missing listing goes unsaid).
Source: docs/specs/ask-again.md
Status: active

## D104 · 2026-10-23 · Last time's listing goes to the pick call labelled as bought last time, and comes first and picked when the pick step keeps it

Why: Sam approved it once, so Rose taps Ask again, then Ask Sam. D89 stands: a listing whose photo shows something else never reaches Rose, also when Sam paid for it before the photo check.
Rejected: only where the pick step ranks it (Rose must find it), show it first with last time's words and no pick step (it supersedes D89 for asks paid before Oct 22), every option unpicked (one more tap for the usual rebuy).
Source: docs/specs/ask-again.md
Status: active

## D105 · 2026-10-23 · Ask again searches last time's query, and adds one unfiltered search by last time's listing name to find that listing

Why: a /poc on 2026-10-23 found that, a day later, the query alone returned 8 of 14 listings by id, and one search by name returned 13 of 13. Ids held. The search runs at the same time as the other two.
Rejected: the query alone (it misses about 4 in 10), the listing name in place of the query (the other options become the same product from other shops), a lookup by product id (no Channel3 endpoint for it was checked).
Source: docs/specs/ask-again.md
Status: active

## D106 · 2026-10-23 · Each Ask again counts as a Find, and one that finds nothing offers one Find another

Why: it sends Channel3 and Haiku calls as a Find does, so it counts toward the address's 20 a day (D73) and on `/status` (D78), as D97 says for Find another.
Rejected: a free Ask again (a script could rebuy past the daily limit), no Find another after an empty one (Rose must think of other words alone).
Source: docs/specs/ask-again.md
Status: active

## D107 · 2026-10-23 · A one-thing rebuy keeps last time's listing in a new rose_search.last jsonb column, and a basket keeps it in each group

Why: the mark and the change line must survive the 3 s redraw (D19) and a reopened link, so they live in Neon with the search (D23). A basket's groups are jsonb already.
Rejected: the page address, as D36 does for over-limit picks (a reopened link loses it, as D100 found for `tried`), only the paid ask's id in `rose_search` (today's price over the limit must be kept too).
Source: docs/specs/ask-again.md
Status: active

## D108 · 2026-10-23 · Sam's OK keeps paying KinCart's sandbox account, because a saved PayPal can't pay the shop

Why: the pay-the-shop spike charged Rose's saved PayPal with a stand-in shop as payee, and PayPal answered `422 BILLING_AGREEMENT_NOT_FOUND`. The same call to KinCart's own account completed. One order with two payees gave `500` three times. A real product pays each shop through PayPal's marketplace setup, never as a reseller, as D82 said.
Rejected: Rose approves each shop's payment on PayPal after Sam's OK (Sam's one OK no longer pays), a spike of PayPal's marketplace setup in sandbox (a Platform app, each shop signed up, Rose links again, and a possible manual review).
Supersedes: D82
Source: docs/specs/pay-the-shop.md
Status: active
