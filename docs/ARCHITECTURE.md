# PayPalHackathon · architecture

**Status:** Active · **Updated:** 2026-10-16 by /ship photo-ask-several

## Context

```mermaid
flowchart LR
    U((Phone browser)) -- "GET /status" --> APP[Next.js app on Vercel]
    J((Judge's browser)) -- "GET /, Try KinCart, Rose's and Sam's pages in two frames" --> APP
    R((Rose's phone)) -- "links PayPal, finds, asks" --> APP
    S((Sam's phone)) -- "OK or No, price and total limits" --> APP
    APP -- "check rows, households, saved PayPal, requests, search, limits, phones" --> NEON[(Neon Postgres)]
    APP -- "token, vault, orders" --> PP[PayPal sandbox]
    J -- "new tab: signs in with the demo login, Save and Continue" --> PP
    APP -- "product search" --> C3[Channel3]
    APP -- "read words or up to 5 photos, explain listings" --> CL[Claude Haiku 5.5]
    APP -- "encrypted, signed pushes" --> PS[Apple / Google / Mozilla push services]
    PS -- "buzzes" --> R & S
    GH[GitHub Actions] -- "runs migrations on green main" --> NEON
    GH -- "test + migrate results" --> VC[Vercel Deployment Checks]
    VC -- "promotes the deploy" --> APP
```

## Components

```mermaid
flowchart TB
    PAGE["app/status"] -- "calls the checks" --> LIB["lib/status"]
    LIB -- "INSERT over TCP" --> NEON[(Neon)]
    LIB -- "POST /v1/oauth2/token" --> PP[PayPal sandbox]
    SHOP["app/(shop)"] -- "actions and page loads" --> SLIB["lib/shop"]
    SLIB -- "households, and per household: paypal_vault, purchase_requests, rose_search, price_limit, total_limit, push_subscriptions" --> NEON
    SLIB -- "vault tokens, orders" --> PP
    SLIB -- "POST /v1/search" --> C3[Channel3]
    SLIB -- "POST /v1/messages" --> CL[Claude Haiku 5.5]
    SLIB -- "web-push POST per phone" --> PS[Push services]
    PS -- "push event" --> SW["public/sw.js"]
    CI[".github/workflows/ci.yml"] -- "runs db:up" --> MIG["scripts/migrate.mjs"]
    MIG -- "applies db/migrations" --> NEON
```

| Component | Folder | What it does |
| --------- | ------ | ------------ |
| Status page | `app/status/` | Runs the checks in parallel, logs one line, renders the three lines under the KinCart showcase head |
| Checks | `lib/status/` | Database insert, PayPal token request, build commit |
| Shop pages | `app/(shop)/` | The home page `/`, where Try KinCart starts a household and this browser keeps its two links in an httpOnly cookie. From 880px wide the home page shows two phones: still samples of Rose's and Sam's screens before Try KinCart, then their real pages in lazy frames, which leave out Notifications; Rose's and Sam's pages behind each household's secret links, the server actions behind each tap (Find, Ask Sam, OK or No, the price and total limits, Turn on notifications), Ask Sam's stop when the picks come to more than Sam's total limit, Sam's tick list for a basket, Rose's photo button, which takes up to 5 photos and shrinks each, one at a time, to a JPEG of at most 180 KB before Find sends them, Rose's link screen with the demo sandbox login and Skip, `POST /r/<token>/link`, where a home page phone sends Link PayPal in a new tab because PayPal refuses frames, the PayPal return route, a manifest per link, the words of each ping, and a refresh every 3 s |
| Shop logic | `lib/shop/` | Households: `whoIs()` turns a link into a household and a person (the env's links are household 1, any other is found by its SHA-256 hash), `startHousehold()` saves a new one with no saved PayPal, and `copyDemoVault()` gives it a copy of household 1's when Rose taps Skip. Every query below takes the household. Link check, PayPal vault and charge calls, `find()` (Haiku splits the words into up to five things; each thing gets two Channel3 searches and a Haiku pick of up to three, all at once), `findPhoto()`, which does the same from up to 5 of Rose's photos and any words, read in one Haiku call that also names the photos that showed nothing, with the photos sent to Haiku once and never stored, storage for requests and their basket lines, Rose's search, Sam's two limits and saved phones, `claim()`, which keeps only the lines Sam ticked, `pay()` with its stuck-request retry, and `notify()`, which sends one push per saved phone with `web-push` and forgets dead ones |
| Service worker | `public/sw.js` | Registered under each person's link; shows a push and opens that link on tap |
| Migrations | `db/migrations/`, `scripts/migrate.mjs` | Plain SQL up and down files, and the runner behind `pnpm db:up` and `db:down` |
| CI | `.github/workflows/ci.yml` | `test` job on every push and PR; `migrate` job on main after `test` passes |
| E2E | `e2e/` | Playwright tests at phone width unless a test sets a laptop window, one worker: `/status`, Rose's ask through Sam's OK or No to the receipt, Rose's Find with real Channel3 and Claude calls, from words, one photo or several, a three-thing basket that Sam trims before paying, a basket stopped by Sam's total limit, a real push to Sam and back to Rose in Firefox, two judges each in their own household, and a judge on a laptop playing Rose and Sam side by side while a phone loads neither frame |
