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
- Rose links their sandbox PayPal once and picks one of three items. Sam taps OK or No on their own phone, and an OK charges Rose's saved PayPal and shows both of them a receipt.
- Rose types what they need in plain words, and AI shows up to three real listings under Sam's price limit, each explained plainly. Rose's pick goes to Sam, who sees why it fits and a link to the listing.
- Sam's phone buzzes when Rose asks for something, and Rose's phone buzzes when Sam answers, so neither has to keep their page open.
- Rose types several things at once and picks a listing for each one they want. Sam ticks the ones to pay for, and one OK makes one charge; anything Sam leaves out goes back to Rose.

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
   - `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`: a sandbox app from developer.paypal.com, under Apps & Credentials. Make it with a **US** sandbox business account and tick **Save payment methods** under its features, or saving Rose's PayPal fails with `NOT_AUTHORIZED`.
   - `ROSE_LINK_TOKEN` and `SAM_LINK_TOKEN`: two long random strings (the command is in `.env.example`). They are the only key to each person's page.
   - `ANTHROPIC_API_KEY` and `CHANNEL3_API_KEY`: an API key from the Claude Console and a free one from trychannel3.com. They turn on Rose's Find; with either unset, Rose picks from a fixed list of three items.
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`: they turn on notifications. Make the two keys with `pnpm exec web-push generate-vapid-keys`; the subject is the site's https URL or a `mailto:` address. With any unset, the Notifications section is hidden and nothing is sent.
3. `pnpm db:up` creates the tables.
4. `pnpm dev`, then open:
   - http://localhost:3000/status to check the database and PayPal.
   - `http://localhost:3000/r/<ROSE_LINK_TOKEN>` as Rose. Tap Link PayPal and log in as a US **personal** sandbox account, in a private window so no other PayPal login carries over.
   - `http://localhost:3000/h/<SAM_LINK_TOKEN>` as Sam.

Notifications: on Android, tap Turn on notifications on the page. On iPhone (iOS 16.4 or later) they only work from the Home Screen: open the link in Safari, tap Share, then Add to Home Screen, then open KinCart from the Home Screen and turn them on there. A phone needs https for this, so try it on the Vercel deployment, not `pnpm dev`. In PayPal itself these pings would be PayPal app notifications; web push stands in for them here.

Checks: `pnpm lint`, `pnpm test` (needs `DATABASE_URL`), `pnpm test:e2e` (also needs the PayPal keys, the two link tokens, `PAYPAL_E2E_VAULT_ID`, the Claude and Channel3 keys, the three VAPID variables, and Playwright's browsers from `pnpm exec playwright install chromium firefox`; stop `pnpm dev` first). The e2e makes real sandbox charges against a saved PayPal, real Channel3 searches and Claude calls, and real pushes through Mozilla's push service. To get one, link Rose's PayPal once as above, then read it with `psql "$DATABASE_URL" -c 'SELECT payment_token FROM paypal_vault'`.
