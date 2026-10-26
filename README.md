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
- Sam sets a total limit for everything Rose asks for at once, such as $40. Rose's picks that come to more than that never reach Sam.
- Each visitor to kincart.vercel.app starts their own Rose and Sam, and sees only their own asks, limits and phones.
- The home page says what KinCart does for the helper who would use it. On a laptop, a judge's own Rose and Sam then run side by side, live, so Sam's page changes as Rose asks.
- Sam sees the photo and the AI's "Good to know" note for each thing before paying. Rose's and Sam's pages show the KinCart name, and the listing photos get bigger.
- A new Rose starts at Link PayPal, with a demo sandbox login on screen, and links on PayPal's own page; on a laptop PayPal opens in a new tab. Skip pays from the demo PayPal, as every new Rose did before.
- Rose takes or picks a photo of the thing they need, or of a written list, and AI turns it into a search. The photo goes to the AI once and is not kept.
- Rose sends up to 5 photos in one Find, one for each thing they need, and AI turns them into one basket.
- One network address can run only 20 Finds, and start only 5 households, in 24 hours. Past that, nothing reaches Claude or Channel3, and the page says when to try again.
- `/status` shows how many Finds and Channel3 searches ran today and this month, and how many Finds and Try KinCarts the limits stopped.
- Rose's PayPal activity lists each thing Sam paid for, with its price, and KinCart's receipt says who got the money.
- A listing that isn't the thing Rose asked for, such as a storage bin sold as "Batteries", never reaches Rose. The AI checks each listing's photo as well as its words. It waits up to 15 s for that check, so a slow one no longer shows nothing found.
- The home page cites a checked US survey under its claim: about 1 in 10 of 657 adults had signed in to someone's money or medical account with their login. Step 1 of How it works says Rose can send a photo.
- When Find finds nothing, or Sam refuses a pick, Rose taps Find another, and the AI searches again with other words, without what Sam refused.
- Rose taps Ask again next to something Sam paid for before. KinCart finds today's listings for the same things, puts the one Rose bought last time first, and says what changed.
- When nothing fits under Sam's price limit, Rose sees the nearest listings over it, and Sam's OK pays one. Sam sees how far over the limit it is first.
- Every KinCart page tells the browser to refuse a frame from another site, and to send no page address to other sites. The home page's own phones still show Rose's and Sam's pages.
- After a No or a thing left out, Sam taps Find another on Sam's own page, and KinCart looks again for Rose. Rose's page says Sam asked, and Rose's phone buzzes when the search ends.
- Sam taps Make new links when a link leaks. Both old links stop working at once, Sam gets Rose's new link to send, and the household keeps its PayPal, limits and past buys.

## Docs

- [Overview](OVERVIEW.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Decisions](DECISIONS.md)
- [Changelog](CHANGELOG.md)

<!-- zuko:end -->

## What this is, and isn't

KinCart is a hackathon proof of concept. The whole path works: Rose asks, AI finds real listings and explains them, Sam says OK from their own phone, and a PayPal API call charges Rose's saved PayPal. Some parts stand in for what a shipped product would use:

- **Sandbox money.** The charge lands in a PayPal sandbox account. No order reaches a shop and nothing is delivered.
- **Secret links, not accounts.** No sign-up or login. Every household starts with a copy of one demo PayPal, so a judge can try both sides in one tap.
- **Free tiers.** Channel3's search returns US listings and allows about 1,000 searches a month. Claude Haiku's explanations are not checked by a person; Sam's OK is the check.
- **Web push stands in for PayPal app notifications.** It needs https, and on iPhone works only from the Home Screen.

What it would take to go further, and the two paths it could take, are in [docs/ROADMAP.md](docs/ROADMAP.md).

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
   - `ADDRESS_KEY`: a random key, from `openssl rand -hex 32`. One network address gets 20 Finds and 5 new households a day, counted under an HMAC of the address with this key. With it unset, Rose picks from the fixed list and Try KinCart starts nothing.
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`: they turn on notifications. Make the two keys with `pnpm exec web-push generate-vapid-keys`; the subject is the site's https URL or a `mailto:` address. With any unset, the Notifications section is hidden and nothing is sent.
3. `pnpm db:up` creates the tables.
4. `pnpm dev`, then open:
   - http://localhost:3000/status to check the database and PayPal.
   - `http://localhost:3000/r/<ROSE_LINK_TOKEN>` as Rose. Tap Link PayPal and log in as a US **personal** sandbox account, in a private window so no other PayPal login carries over.
   - `http://localhost:3000/h/<SAM_LINK_TOKEN>` as Sam.

Notifications: on Android, tap Turn on notifications on the page. On iPhone (iOS 16.4 or later) they only work from the Home Screen: open the link in Safari, tap Share, then Add to Home Screen, then open KinCart from the Home Screen and turn them on there. A phone needs https for this, so try it on the Vercel deployment, not `pnpm dev`. In PayPal itself these pings would be PayPal app notifications; web push stands in for them here.

Checks: `pnpm lint`, `pnpm test` (needs `DATABASE_URL`), `pnpm test:e2e` (also needs the PayPal keys, the two link tokens, `PAYPAL_E2E_VAULT_ID`, the Claude and Channel3 keys, `ADDRESS_KEY`, the three VAPID variables, and Playwright's browsers from `pnpm exec playwright install chromium firefox`; stop `pnpm dev` first). The e2e makes real sandbox charges against a saved PayPal, real Channel3 searches and Claude calls, and real pushes through Mozilla's push service. To get one, link Rose's PayPal once as above, then read it with `psql "$DATABASE_URL" -c 'SELECT payment_token FROM paypal_vault'`.
