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
  Then Rose sees "Couldn't find that. Try different words."
  And Rose's words are still in the box

  Examples:
    | words                               | what happens                          |
    | "a left-handed teapot for a cat"    | the search returns no listings        |
    | "what time is it in Ohio"           | there is no product to look for       |
    | "warm slippers, size 8"             | the AI service doesn't answer         |

Scenario: Nothing under Sam's limit
  Given Sam's limit is $30
  When Rose types "a tablet for video calls" and every listing found costs more than $30
  Then Rose sees "Nothing under $30 for that. Try different words, or ask Sam to raise the limit."
  And Rose's words are still in the box

Scenario: Sam sets the price limit
  Given Sam's page shows "Price limit: $50"
  When Sam changes it to $30 and saves
  Then Sam's page shows "Price limit: $30"
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
- "Couldn't find that. Try different words." when the search finds nothing or the AI fails, and "Nothing under $X" when everything found costs more than the limit. Rose's words stay in the box.

**Out:**
- Rose setting their own limit. Sam sets it (O9).
- Asking by voice: slice 4, `ask-by-voice`.
- A notification on Sam's phone: slice 3, `ping-helper`.
- A real order with the shop. Sandbox money only (shape O9). No later slice.
- More than three options, or "show more". No later slice.
- Remembering past searches. No later slice.

## Open items

| ID | What | Type | Raised at | Owner | Status | Answer |
| -- | ---- | ---- | --------- | ----- | ------ | ------ |
| O1 | Which AI model, and what a demo's worth of calls costs (from shape O6) | question | shape | user | Open | — |
| O2 | Whose listings and which currency. Channel3 search is US-first (from shape O7) | question | shape | user | Resolved | US listings in US dollars, matching approve-and-pay's US sandbox accounts and USD (approve-and-pay O4). Confirmed with pause 1 approval, 2026-10-13 |
| O3 | Link tokens sit in the page address, so they appear in Vercel's request log on every refresh and in PayPal's return address when Rose links | flag | spec p1 | user | Accepted risk | Only the project owner can read Vercel's logs, PayPal doesn't publish return addresses, and the money is sandbox only. Change both tokens on Vercel after recording the demo video, since a video or screenshot showing the address bar would expose them. A cookie-based fix was drafted as approve-and-pay v2 and dropped as not worth the hours. Agreed 2026-10-13 |
| O4 | Channel3's search returns real US listings with a name, price, photo, link and enough detail to explain them, within the 1,000 free searches a month | unproven | spec p1 | spec p3 | Open | — |
| O5 | Assuming fewer than three listings under the limit shows the one or two there are, rather than nothing | assumption | spec p1 | user | Resolved | Confirmed with pause 1 approval, 2026-10-13 |
| O6 | Assuming Sam's limit is whole dollars from $5 to $500 | assumption | spec p1 | user | Resolved | Confirmed with pause 1 approval, 2026-10-13 |
| O7 | A listing's price can change between Rose's search and Sam's OK. Sam pays the price Rose saw, because no real order is placed | flag | spec p1 | user | Accepted risk | No real order reaches the shop, so the charge only has to match what Rose and Sam saw. Agreed with pause 1 approval, 2026-10-13 |
| O8 | Assuming 15 seconds is acceptable for results, with "Looking…" shown meanwhile | assumption | spec p1 | user | Resolved | Confirmed with pause 1 approval, 2026-10-13 |
| O9 | The shape rules out spend limits. Is Sam's price limit one? | question | spec p1 | user | Resolved | No. It only caps what Rose is shown; Sam still approves every purchase, and nothing is ever approved automatically. Sam sets it on Sam's page, $50 by default. Agreed 2026-10-13 |

_Never delete this section or its rows. See references/ledger.md._

## Glossary

- **Listing**: one product for sale in an online shop, with its name, price, photo and link.
- **Channel3**: a hackathon sponsor whose API searches real product listings across shops. 1,000 free searches a month.
- **Price limit**: the most one item may cost. Sam sets it, and Rose is never shown anything above it.
- **Sandbox**: PayPal's test environment. Fake accounts, fake money, real API.
- **e2e**: end-to-end, one test that walks the whole slice as a user would.
