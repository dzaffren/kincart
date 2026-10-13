# PayPalHackathon · architecture

**Status:** Active · **Updated:** 2026-10-13 by /ship find-and-explain

## Context

```mermaid
flowchart LR
    U((Phone browser)) -- "GET /status" --> APP[Next.js app on Vercel]
    R((Rose's phone)) -- "links PayPal, finds, asks" --> APP
    S((Sam's phone)) -- "OK or No, price limit" --> APP
    APP -- "check rows, saved PayPal, requests, search, limit" --> NEON[(Neon Postgres)]
    APP -- "token, vault, orders" --> PP[PayPal sandbox]
    APP -- "product search" --> C3[Channel3]
    APP -- "read words, explain listings" --> CL[Claude Haiku 5.5]
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
    SLIB -- "paypal_vault, purchase_requests, rose_search, price_limit" --> NEON
    SLIB -- "vault tokens, orders" --> PP
    SLIB -- "POST /v1/search" --> C3[Channel3]
    SLIB -- "POST /v1/messages" --> CL[Claude Haiku 5.5]
    CI[".github/workflows/ci.yml"] -- "runs db:up" --> MIG["scripts/migrate.mjs"]
    MIG -- "applies db/migrations" --> NEON
```

| Component | Folder | What it does |
| --------- | ------ | ------------ |
| Status page | `app/status/` | Runs the checks in parallel, logs one line, renders the three lines |
| Checks | `lib/status/` | Database insert, PayPal token request, build commit |
| Shop pages | `app/(shop)/` | Rose's and Sam's pages behind secret links, the server actions behind each tap (Find, Ask Sam, OK or No, the price limit), the PayPal return route, and a refresh every 3 s |
| Shop logic | `lib/shop/` | Link check, PayPal vault and charge calls, `find()` (Haiku reads the words, two Channel3 searches, Haiku picks and explains up to three), storage for requests, Rose's search and Sam's limit, and `pay()` with its stuck-request retry |
| Migrations | `db/migrations/`, `scripts/migrate.mjs` | Plain SQL up and down files, and the runner behind `pnpm db:up` and `db:down` |
| CI | `.github/workflows/ci.yml` | `test` job on every push and PR; `migrate` job on main after `test` passes |
| E2E | `e2e/` | Playwright tests at phone width, one worker: `/status`, Rose's ask through Sam's OK or No to the receipt, and Rose's Find with real Channel3 and Claude calls |
