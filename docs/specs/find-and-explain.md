# Find and explain

**Version:** v1 · **Status:** Draft · **Type:** Feature · **Project type:** Web UI

**Shape doc:** docs/specs/shop-together/shape.md
**Depends on:** approve-and-pay
**Page:** none. Skipped: you read the `.md` directly.

Rose types what they need in plain words, and AI shows up to three real listings under Sam's price limit, each explained plainly. Rose's pick goes into approve-and-pay's request, replacing the fixed list of three. It ships now because the hackathon rules require AI, and this is where it arrives.

## Problem

Rose can only ask for one of three fixed items today: reading glasses, a pill organiser or AA batteries. Anything else means a relative searching a shop on Rose's behalf, which is the chore this app exists to remove. Shops show dozens of near-identical listings with small print that Rose can't easily compare. This slice lets Rose say what they need in their own words and get at most three real options with a plain explanation of each, while Sam still approves every purchase and sets how much one can cost.

## Slice test

| Check                         | Result |
| ----------------------------- | ------ |
| Cuts every layer it needs     | yes: Rose's request box and options, search and AI, the stored request, Sam's limit, deployed |
| One e2e test walks it         | yes: Rose types a need, picks one of the options, Sam sees the reason and link and taps OK, both see the receipt |
| Worth shipping alone          | yes: Rose can ask for anything in their own words instead of three fixed items |
| Fits (≤5 scenarios, ≤2 areas) | yes: 5 scenarios; two areas, search with AI (new) and the shop pages (existing) |

**Path:** full. It adds a screen, an outside service, AI and stored data.

## User story

As Rose, I want to say what I need in my own words and see a few options explained plainly, so that I can pick one without wading through a shop.

## Flow

```mermaid
flowchart LR
    R((Rose)) -- "types what they need" --> B[Request box]
    B -- "words and Sam's limit" --> F[Search and AI]
    F -- "up to three listings, explained" --> O[Options]
    O -- "picks one, taps Ask Sam" --> W[Waiting for Sam]
    W -- "item, price, reason, link" --> S((Sam))
    S -- "OK" --> P[Rose's saved PayPal pays]
    S -- "sets the limit" --> L[(Price limit)]
    L -- "caps the search" --> F
```

Rose types a need, the search and AI return up to three listings under Sam's limit, and Rose's pick goes to Sam, whose OK pays as in approve-and-pay.

## States

```mermaid
stateDiagram-v2
    [*] --> Asking
    Asking --> Looking: taps Find
    Looking --> Options: listings found under the limit
    Looking --> NothingFound: no listings, AI failed, or none under the limit
    NothingFound --> Asking: words kept in the box
    Options --> Asking: tries other words
    Options --> Waiting: picks one, taps Ask Sam
    Waiting --> Paid: Sam taps OK
    Waiting --> Asking: Sam says no, or the charge fails
    Paid --> Asking: asks for something else
```

## Acceptance criteria

```gherkin
Scenario: Rose asks in their own words and sees options explained
  Given Rose's PayPal is linked and Sam's limit is $50, which it is until Sam changes it
  When Rose types "warm slippers that are easy to put on, size 8" and taps Find
  Then within 15 seconds Rose sees up to three real listings, each $50 or less
  And each shows the listing's own name and price, never a price the AI wrote
  And each has two or three short sentences: what it is, why it fits what Rose asked, and one thing to watch for

Scenario: Rose picks one, and Sam checks it before paying
  Given Rose sees three slipper listings
  When Rose picks the second and taps "Ask Sam"
  Then Sam's page shows that listing's name and price, the AI's one-line reason it fits, and a link to the real listing
  When Sam taps "OK, pay" with that price
  Then Rose's saved PayPal is charged the price Rose saw, and both pages show the receipt as in approve-and-pay

Scenario Outline: Nothing to show
  Given Rose's PayPal is linked
  When Rose types <words> and taps Find, and <what happens>
  Then Rose sees "<message>"
  And Rose's words are still in the box

  Examples:
    | words                            | what happens                     | message                                                   |
    | "a left-handed teapot for a cat" | the search returns no listings   | Couldn't find that. Try different words.                  |
    | "what time is it in Ohio"        | there is no product to look for  | Couldn't find that. Try different words.                  |
    | "warm slippers, size 8"          | the AI service doesn't answer    | Couldn't find that. Try different words.                  |
    | "milk, bread and eggs"           | it is a list of several things   | One thing at a time for now. What would you like first?   |

Scenario: Nothing under Sam's limit
  Given Sam's limit is $30
  When Rose types "a tablet for video calls" and every listing found costs more than $30
  Then Rose sees "Nothing under $30 for that. Try different words, or ask Sam to raise the limit."
  And Rose's words are still in the box

Scenario: Sam sets the price limit
  Given Sam's page shows the price limit at $50
  When Sam changes it to $30 and taps Save
  Then Sam's page says "Saved. Rose's next search stays at $30 or less."
  And Rose's next search shows only listings at $30 or less
```

## Scope

**In:**
- One box where Rose types what they need. It replaces the fixed list of three.
- A search of real US listings in US dollars, and up to three shown, all at or under Sam's limit.
- An AI explanation for each: what it is, why it fits Rose's words, and one thing to watch for, such as size, pack count or delivery time.
- Rose picks one and taps Ask Sam, as in approve-and-pay. The request keeps the name, price, listing link and reason as Rose saw them, and Sam's OK charges that price.
- Sam's page shows the item, price, the AI's one-line reason and a link to the real listing, then OK or No as in approve-and-pay.
- Sam's page has a price limit Sam can change. It is $50 until Sam changes it.
- "Couldn't find that. Try different words." when the search finds nothing or the AI fails, "Nothing under $X" when everything found costs more than the limit, and "One thing at a time for now. What would you like first?" when Rose types a list. Rose's words stay in the box.

**Out:**
- Rose setting their own limit. Sam sets it (O9).
- Asking by voice: slice 4, `ask-by-voice`.
- A notification on Sam's phone: slice 3, `ping-helper`.
- A real order with the shop. Sandbox money only (shape O9). No later slice.
- A list of several things in one ask, such as groceries, approved once and paid as one total: a later `basket` slice, only if time is left (shape O10).
- More than three options, or "show more". No later slice.
- Remembering past searches. No later slice.

## Interface

Rose's request box replaces approve-and-pay's pick screen. The options reuse its radio cards, with the listing's price, photo and explanation inside. Sam's approval adds "Why it fits" and a link to the listing, and a price limit field sits under Sam's other screens.

| Who | State | Heading | What's on it |
| --- | ----- | ------- | ------------ |
| Rose | asking | What do you need? | Hint: "Say it the way you'd tell Sam. For example: warm slippers that are easy to put on, size 8."; a 3-line box; Find; "Sam's limit is $50 an item. Nothing is paid until Sam says OK." |
| Rose | Find with an empty box | What do you need? | red under the box: "Type what you need first." |
| Rose | looking | What do you need? | the box locked with Rose's words; Find becomes "Looking…" with the spinner |
| Rose | options | Which one would you like? | For "warm slippers that are easy to put on, size 8"; up to three radio cards, each with the name, "$24.99 at walmart.com", the photo with what and why beside it, and "Good to know:" with the catch; Ask Sam; Try other words |
| Rose | fewer than three | Which one would you like? | adds "Only 2 found at $30 or less." |
| Rose | Ask Sam with no pick | Which one would you like? | red under the cards: "Pick one first." |
| Rose | nothing found | What do you need? | grey notice: "Couldn't find that. Try different words."; Rose's words still in the box |
| Rose | a list of several things | What do you need? | grey notice: "One thing at a time for now. What would you like first?" |
| Rose | nothing under the limit | What do you need? | grey notice: "Nothing under $30 for that. Try different words, or ask Sam to raise the limit." |
| Rose | waiting | Waiting for Sam | as approve-and-pay, plus "From amazon.com" |
| Rose | Sam said no, or the charge failed | What do you need? | approve-and-pay's notices, above the box |
| Sam | request | Rose would like this | the name, $32.50 at 40px, "From amazon.com. Paid from Rose's PayPal if you say OK."; "Why it fits: …"; "See it on amazon.com", opening in a new tab; asked time; OK, pay $32.50; No |
| Sam | nothing, paid or failed | as approve-and-pay | under a divider: "Price limit" with "Rose is only shown items at or under this price.", a $ field holding 50, and Save |
| Sam | limit saved | as approve-and-pay | "Saved. Rose's next search stays at $30 or less." |
| Sam | limit out of range | as approve-and-pay | red under the field: "Pick a whole-dollar amount from $5 to $500." |

"Nothing found" and "nothing under the limit" are grey, not red: nothing is broken, and the brief keeps red for real failures. The photo is the listing's first one, 64px, with a 1px border, on the `sunken` colour while it loads; a listing with no photo shows none. Its alt text is empty because the name sits right next to it.

Checked: no sideways scroll at 320px and 390px; light and dark both rendered. New colour pairs: the listing link 9.0:1 light and 11.3:1 dark; the shop name on a picked card 7.3:1 and 8.8:1; field edges 3.6:1 and 4.5:1. The focus ring shows on the box, the limit field, the link and the cards, and the link is 48px tall.

Craft checks: a one-line "AI product picker" prompt gives star ratings, a sparkle "AI picks" badge and "Buy now" buttons. Here there is no badge, the explanation is plain text with a "Good to know" catch, and the only next step is Ask Sam. Against Stripe Checkout: the heading labels the box, the hint gives an example, and the empty-box error sits under the box and says what to do. Against Monzo: Sam's amount stays at 40px, with plain wording around it.

**Motion tier:** 1, as approve-and-pay. Nothing new moves: notices rise and fade as before, and "Looking…" turns the spinner.

**Components used:** the design system is tokens only. From approve-and-pay: Button, Notice, Summary, ReceiptCard and the radio option cards. Composed from tokens here: the text box and limit field (`control.height`, `control` edge, `radius.control`), the listing card (an option card with a photo), and the text link (`accent-text`, `target.min`).

**Preview:** http://localhost:3000/preview/find-and-explain with `pnpm dev`. It answers 404 in production. The listings are written examples and grey squares stand in for photos; real results replace both at /build.

## Open items

| ID | What | Type | Raised at | Owner | Status | Answer |
| -- | ---- | ---- | --------- | ----- | ------ | ------ |
| O1 | Which AI model, and what a demo's worth of calls costs (from shape O6) | question | shape | user | Resolved | Claude Haiku 5.5 (`claude-haiku-5-5`), in two fixed steps: read Rose's words into a search, then pick up to three and explain them. At $0.10 in and $0.50 out per million tokens, a search of about 5,500 tokens in and 550 out costs about $0.001, so 200 demo searches cost about $0.20 (estimate, before the spike). Rejected: Sonnet 5.5 (about $0.017 a search, slower) and Opus 5.5 (about $0.033, slowest), and letting the AI search a second time (no scenario needs it, and it adds 3 to 5 seconds). Agreed 2026-10-13 |
| O2 | Whose listings and which currency. Channel3 search is US-first (from shape O7) | question | shape | user | Resolved | US listings in US dollars, matching approve-and-pay's US sandbox accounts and USD (approve-and-pay O4). Confirmed with pause 1 approval, 2026-10-13 |
| O3 | Link tokens sit in the page address, so they appear in Vercel's request log on every refresh and in PayPal's return address when Rose links | flag | spec p1 | user | Accepted risk | Only the project owner can read Vercel's logs, PayPal doesn't publish return addresses, and the money is sandbox only. Change both tokens on Vercel after recording the demo video, since a video or screenshot showing the address bar would expose them. A cookie-based fix was drafted as approve-and-pay v2 and dropped as not worth the hours. Agreed 2026-10-13 |
| O4 | Channel3's search returns real US listings with a name, price, photo, link and enough detail to explain them, within the 1,000 free searches a month | unproven | spec p1 | spec p3 | Open | — |
| O5 | Assuming fewer than three listings under the limit shows the one or two there are, rather than nothing | assumption | spec p1 | user | Resolved | Confirmed with pause 1 approval, 2026-10-13 |
| O6 | Assuming Sam's limit is whole dollars from $5 to $500 | assumption | spec p1 | user | Resolved | Confirmed with pause 1 approval, 2026-10-13 |
| O7 | A listing's price can change between Rose's search and Sam's OK. Sam pays the price Rose saw, because no real order is placed | flag | spec p1 | user | Accepted risk | No real order reaches the shop, so the charge only has to match what Rose and Sam saw. Agreed with pause 1 approval, 2026-10-13 |
| O8 | Assuming 15 seconds is acceptable for results, with "Looking…" shown meanwhile | assumption | spec p1 | user | Resolved | Confirmed with pause 1 approval, 2026-10-13 |
| O9 | The shape rules out spend limits. Is Sam's price limit one? | question | spec p1 | user | Resolved | No. It only caps what Rose is shown; Sam still approves every purchase, and nothing is ever approved automatically. Sam sets it on Sam's page, $50 by default. Agreed 2026-10-13 |
| O10 | Rose may type a list, such as groceries, but a request is one item, one price and one charge | question | spec p2 | user | Resolved | One thing at a time: the AI spots a list and Rose sees "One thing at a time for now. What would you like first?". A `basket` slice (several items, one OK, one total) goes after slice 4, only if time is left. Agreed 2026-10-13 |
| O11 | Reading Rose's words with Haiku, one Channel3 search, and Haiku picking and explaining finish within 15 seconds (O8) | unproven | spec p3 | poc | Open | — |
| O12 | CI's e2e calls Channel3 and Claude for real, as it already does PayPal (D20) | question | spec p3 | user | Resolved | Real calls. Results change from run to run, so the e2e checks the shape: up to three options, each at or under the limit, each explained. A Channel3 or Claude outage turns CI red until it is rerun. Rejected: recorded replies behind a test-only switch. Agreed 2026-10-13 |

_Never delete this section or its rows. See references/ledger.md._

## Glossary

- **Listing**: one product for sale in an online shop, with its name, price, photo and link.
- **Channel3**: a hackathon sponsor whose API searches real product listings across shops. 1,000 free searches a month.
- **Price limit**: the most one item may cost. Sam sets it, and Rose is never shown anything above it.
- **Sandbox**: PayPal's test environment. Fake accounts, fake money, real API.
- **e2e**: end-to-end, one test that walks the whole slice as a user would.
