# PayPalHackathon

**Status:** Active · **Release:** v1.2.0 · **Updated:** 2026-10-27 by /ship security-story

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
- `lib/status/` — the database, PayPal and build checks, and the sums of today's and this month's usage.
- `app/(shop)/` — the home page `/`, where Try KinCart starts your own Rose and Sam and a laptop shows both their pages side by side, Rose's page `/r/<link>`, which starts at Link PayPal with a demo sandbox login and Skip, Sam's page `/h/<link>`, with Confirm each OK for a passkey, the PayPal return route, the route a home page phone posts Link PayPal to in a new tab, each link's manifest, the notifications control, and the views they share.
- `lib/shop/` — households and the link check, PayPal vault and charge calls, Channel3 search, the listing photo downloads, and Claude Haiku calls behind Rose's Find, with `picks/`, the recorded set of real listings that `picks.test.ts` runs against Haiku, request, search, price-limit, total-limit and phone storage, the daily Find and household limits for each network address, the usage counts for `/status`, `pay()`, and the pushes to saved phones.
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
| find-limits | Shipped | One network address can run only 20 Finds, and start only 5 households, in 24 hours. Past that, nothing reaches Claude or Channel3, and the page says when to try again. | docs/specs/find-limits.md |
| usage-on-status | Shipped | `/status` shows how many Finds and Channel3 searches ran today and this month, and how many Finds and Try KinCarts the limits stopped. | docs/specs/usage-on-status.md |
| itemized-receipt | Shipped | Rose's PayPal activity lists each thing Sam paid for, with its price, and KinCart's receipt says who got the money. | docs/specs/itemized-receipt.md |
| picks-that-match | Shipped | A listing that isn't the thing Rose asked for, such as a storage bin sold as "Batteries", never reaches Rose. The AI checks each listing's photo as well as its words. It waits up to 15 s for that check, so a slow one no longer shows nothing found. | docs/specs/picks-that-match.md |
| home-page-proof | Shipped | The home page cites a checked US survey under its claim: about 1 in 10 of 657 adults had signed in to someone's money or medical account with their login. Step 1 of How it works says Rose can send a photo. | docs/specs/home-page-proof.md |
| find-another | Shipped | When Find finds nothing, or Sam refuses a pick, Rose taps Find another, and the AI searches again with other words, without what Sam refused. | docs/specs/find-another.md |
| ask-again | Shipped | Rose taps Ask again next to something Sam paid for before. KinCart finds today's listings for the same things, puts the one Rose bought last time first, and says what changed. | docs/specs/ask-again.md |
| allow-over-limit | Shipped | When nothing fits under Sam's price limit, Rose sees the nearest listings over it, and Sam's OK pays one. Sam sees how far over the limit it is first. | docs/specs/allow-over-limit.md |
| security-headers | Shipped | Every KinCart page tells the browser to refuse a frame from another site, and to send no page address to other sites. The home page's own phones still show Rose's and Sam's pages. | docs/specs/security-headers.md |
| sam-finds-another | Shipped | After a No or a thing left out, Sam taps Find another on Sam's own page, and KinCart looks again for Rose. Rose's page says Sam asked, and Rose's phone buzzes when the search ends. | docs/specs/sam-finds-another.md |
| new-links | Shipped | Sam taps Make new links when a link leaks. Both old links stop working at once, Sam gets Rose's new link to send, and the household keeps its PayPal, limits and past buys. | docs/specs/new-links.md |
| confirm-ok | Shipped | Sam can turn on a passkey, off by default, so each OK, Make new links and Turn off asks for Sam's face or fingerprint. A leaked Sam link alone then can't pay or lock the family out. | docs/specs/confirm-ok.md |
| security-story | Shipped | The README's Security section says what each guard stops, what still stands in, and which code the three pentests covered. ROADMAP's rows on links and free tiers now match it. | docs/specs/security-story.md |

## More

README.md · docs/ARCHITECTURE.md · DECISIONS.md · CHANGELOG.md · docs/ROADMAP.md
