# PayPalHackathon

**Status:** Active · **Updated:** 2026-10-14 by /ship basket (shipped)

A shop-together helper for the PayPal AI hackathon: an older person asks for something, AI finds and explains options, a family helper approves from their own phone, and PayPal pays.
Used by older shoppers and the relative who helps them pay online.

## Run it

| Task    | Command         |
| ------- | --------------- |
| install | `pnpm install`  |
| migrate | `pnpm db:up`    |
| run     | `pnpm dev`      |
| test    | `pnpm test`     |
| e2e     | `pnpm test:e2e` |
| lint    | `pnpm lint`     |

## Where things are

- `app/status/` — the `/status` page and its view.
- `lib/status/` — the database, PayPal and build checks.
- `app/(shop)/` — Rose's page `/r/<link>`, Sam's page `/h/<link>`, the PayPal return route, each link's manifest, the notifications control, and the views they share.
- `lib/shop/` — the link check, PayPal vault and charge calls, Channel3 search and Claude Haiku calls behind Rose's Find, request, search, price-limit and phone storage, `pay()`, and the pushes to saved phones.
- `public/` — `sw.js`, the service worker that shows a push and opens the link on tap, and the KinCart icons.
- `docs/design/design-system/` — the design tokens the shop pages load.
- `db/migrations/` and `scripts/migrate.mjs` — plain SQL migrations and the runner.
- `e2e/` — Playwright tests.
- `.github/workflows/ci.yml` — tests on every push; migrates Neon after a green main.

## Slices

| Slice    | Status | What it does                                                                                                  | Page                   |
| -------- | ------ | ------------------------------------------------------------------------------------------------------------- | ---------------------- |
| skeleton | Shipped | A `/status` page that says plainly whether the database and the PayPal sandbox keys work, and which build is live. | docs/specs/skeleton.md |
| approve-and-pay | Shipped | Rose links their sandbox PayPal once and picks one of three items. Sam taps OK or No on their own phone, and an OK charges Rose's saved PayPal and shows both of them a receipt. | docs/specs/approve-and-pay.md |
| find-and-explain | Shipped | Rose types what they need in plain words, and AI shows up to three real listings under Sam's price limit, each explained plainly. Rose's pick goes to Sam, who sees why it fits and a link to the listing. | docs/specs/find-and-explain.md |
| ping-helper | Shipped | Sam's phone buzzes when Rose asks for something, and Rose's phone buzzes when Sam answers, so neither has to keep their page open. | docs/specs/ping-helper.md |
| basket | Shipped | Rose types several things at once and picks a listing for each one they want. Sam ticks the ones to pay for, and one OK makes one charge; anything Sam leaves out goes back to Rose. | docs/specs/basket.md |

## More

README.md · docs/ARCHITECTURE.md · DECISIONS.md · CHANGELOG.md
