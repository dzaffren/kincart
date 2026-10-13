# PayPalHackathon · architecture

**Status:** Active · **Updated:** 2026-10-13 by /ship skeleton

## Context

```mermaid
flowchart LR
    U((Phone browser)) -- "GET /status" --> APP[Next.js app on Vercel]
    APP -- "writes a check row" --> NEON[(Neon Postgres)]
    APP -- "asks for a sandbox token" --> PP[PayPal sandbox]
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
    CI[".github/workflows/ci.yml"] -- "runs db:up" --> MIG["scripts/migrate.mjs"]
    MIG -- "applies db/migrations" --> NEON
```

| Component | Folder | What it does |
| --------- | ------ | ------------ |
| Status page | `app/status/` | Runs the checks in parallel, logs one line, renders the three lines |
| Checks | `lib/status/` | Database insert, PayPal token request, build commit |
| Migrations | `db/migrations/`, `scripts/migrate.mjs` | Plain SQL up and down files, and the runner behind `pnpm db:up` and `db:down` |
| CI | `.github/workflows/ci.yml` | `test` job on every push and PR; `migrate` job on main after `test` passes |
| E2E | `e2e/` | Playwright test that walks `/status` at phone width |
