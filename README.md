# PayPalHackathon

<!-- zuko:start — generated from OVERVIEW.md; edit that file, not this block -->

## What it does

A shop-together helper for the PayPal AI hackathon: an older person asks for something, AI finds and explains options, a family helper approves from their own phone, and PayPal pays.
Used by older shoppers and the relative who helps them pay online.

## Install and run

| Task    | Command         |
| ------- | --------------- |
| install | `pnpm install`  |
| migrate | `pnpm db:up`    |
| run     | `pnpm dev`      |
| test    | `pnpm test`     |
| e2e     | `pnpm test:e2e` |
| lint    | `pnpm lint`     |

## Features

- A `/status` page that says plainly whether the database and the PayPal sandbox keys work, and which build is live.

## Docs

- [Overview](OVERVIEW.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Decisions](DECISIONS.md)
- [Changelog](CHANGELOG.md)

<!-- zuko:end -->

## Setup

You need Node 24, pnpm 9, and Postgres 17: either a free Neon database or Docker.

1. `pnpm install`
2. Copy `.env.example` to `.env.local` and fill it in.
   - `DATABASE_URL`: a Neon connection string, or a local Postgres:

     ```
     docker run -d --name shop-together-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=shop_together -p 5432:5432 postgres:17
     ```

     with `DATABASE_URL=postgres://postgres:postgres@localhost:5432/shop_together`.
   - `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`: a sandbox app from developer.paypal.com, under Apps & Credentials.
3. `pnpm db:up` creates the tables.
4. `pnpm dev`, then open http://localhost:3000/status.

Checks: `pnpm lint`, `pnpm test` (needs `DATABASE_URL`), `pnpm test:e2e` (also needs the PayPal keys, since it expects `connected`).
