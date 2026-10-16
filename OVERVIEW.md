# PayPalHackathon

**Status:** Active · **Release:** v1.2.0 · **Updated:** 2026-10-16 by /ship photo-ask-several

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
- `app/(shop)/` — the home page `/`, where Try KinCart starts your own Rose and Sam and a laptop shows both their pages side by side, Rose's page `/r/<link>`, which starts at Link PayPal with a demo sandbox login and Skip, Sam's page `/h/<link>`, the PayPal return route, the route a home page phone posts Link PayPal to in a new tab, each link's manifest, the notifications control, and the views they share.
- `lib/shop/` — households and the link check, PayPal vault and charge calls, Channel3 search and Claude Haiku calls behind Rose's Find, request, search, price-limit, total-limit and phone storage, `pay()`, and the pushes to saved phones.
- `public/` — `sw.js`, the service worker that shows a push and opens the link on tap, and the KinCart icons.
- `docs/design/design-system/` — the design tokens, and the showcase look, that the shop pages and `/status` load.
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
| basket-cap | Shipped | Sam sets a total limit for everything Rose asks for at once, such as $40. Rose's picks that come to more than that never reach Sam. | docs/specs/basket-cap.md |
| households | Shipped | Each visitor to kincart.vercel.app starts their own Rose and Sam, and sees only their own asks, limits and phones. | docs/specs/households.md |
| demo-home | Shipped | The home page says what KinCart does for the helper who would use it. On a laptop, a judge's own Rose and Sam then run side by side, live, so Sam's page changes as Rose asks. | docs/specs/demo-home.md |
| clearer-pages | Shipped | Sam sees the photo and the AI's "Good to know" note for each thing before paying. Rose's and Sam's pages show the KinCart name, and the listing photos get bigger. | docs/specs/clearer-pages.md |
| link-paypal-onboarding | Shipped | A new Rose starts at Link PayPal, with a demo sandbox login on screen, and links on PayPal's own page; on a laptop PayPal opens in a new tab. Skip pays from the demo PayPal, as every new Rose did before. | docs/specs/link-paypal-onboarding.md |
| photo-ask | Shipped | Rose takes or picks a photo of the thing they need, or of a written list, and AI turns it into a search. The photo goes to the AI once and is not kept. | docs/specs/photo-ask.md |
| photo-ask-several | Shipped | Rose sends up to 5 photos in one Find, one for each thing they need, and AI turns them into one basket. | docs/specs/photo-ask-several.md |

## More

README.md · docs/ARCHITECTURE.md · DECISIONS.md · CHANGELOG.md · docs/ROADMAP.md
