# Approve and pay

**Version:** v1 · **Status:** Draft · **Type:** Feature · **Project type:** Web UI

**Shape doc:** docs/specs/shop-together/shape.md
**Depends on:** skeleton; the design system (D15)
**Page:** none. Skipped: you read the `.md` directly.

Rose, the relative, links their sandbox PayPal once and picks one of three items. Sam, the helper, taps OK or No on their own phone, and an OK charges Rose's saved PayPal and shows both of them a receipt. It ships first after the skeleton because it rests on the riskiest claim, the vault (O1), and it is the core value: nobody hands over a password.

## Problem

Today, when your relative wants something online, you log in as them with their passwords and buy it. That happens a few times a month. Each time it costs you the time of a full checkout, and it means you hold their passwords. This slice takes both away: their PayPal is linked once, and from then on a purchase needs only your tap.

## Slice test

| Check                         | Result |
| ----------------------------- | ------ |
| Cuts every layer it needs     | yes: Rose's page and Sam's page, the request and answer endpoints, a requests table, the PayPal vault and charge, deployed |
| One e2e test walks it         | yes: one Playwright test with two pages, Rose's and Sam's, walks link, ask, OK and receipt. Whether it can drive PayPal's own sandbox login page is O6 |
| Worth shipping alone          | yes: with nothing else, Rose gets one of three items paid from their own PayPal on Sam's tap, and no password changes hands |
| Fits (≤5 scenarios, ≤2 areas) | yes, at the limit: 5 scenarios, two areas (the two people's pages, the PayPal vault and charge) |

**Path:** full. New pages, a new table, a new PayPal integration.

## User story

As Rose, I want to ask for something and have it paid from my PayPal once Sam says OK, so that I don't have to get through checkout or give anyone my passwords.

As Sam, I want to approve Rose's purchase from my own phone, so that I don't have to log in as Rose.

## Flow

```mermaid
flowchart LR
    R((Rose, the relative)) -- "taps Link PayPal, once" --> PPL[PayPal sandbox approval page]
    PPL -- "approved: PayPal saved" --> RP["Rose's page: three items"]
    RP -- "Ask Sam: reading glasses, $18.99" --> W[Request: waiting]
    W -- "shows within 5 s" --> SP["Sam's page: OK or No"]
    SP -- "OK" --> C[Charge Rose's saved PayPal]
    C -- "receipt + transaction ID" --> RP
    C -- "receipt + transaction ID" --> SP
    SP -- "No: Sam said no" --> RP
```

Rose links PayPal once; after that each purchase is a pick and an ask. Sam's OK charges the saved PayPal and both pages show the receipt; Sam's No goes back to Rose with nothing charged.

## States

```mermaid
stateDiagram-v2
    [*] --> Waiting: Rose asks
    Waiting --> Declined: Sam taps No
    Waiting --> Paying: Sam taps OK
    Paying --> Paid: PayPal charges Rose
    Paying --> Failed: PayPal refuses
    Declined --> [*]: Rose can ask again
    Paid --> [*]: Rose can ask again
    Failed --> [*]: Rose can ask again
```

A request only moves forward. Once it leaves Waiting, no tap sends it back, which is what keeps scenario 5 to one charge.

## Acceptance criteria

```gherkin
Scenario Outline: Rose links PayPal once
  Given Rose opens their link and the page says "Link your PayPal to start"
  When Rose taps "Link PayPal" and <does> on PayPal's sandbox page
  Then Rose is back on their page and it says "<message>"
  And the page <items>

  Examples:
    | does     | message                 | items                                           |
    | approves | PayPal linked           | shows three items, and still does a day later   |
    | cancels  | PayPal isn't linked yet | shows the "Link PayPal" button again, no items  |

Scenario: Sam says OK and Rose's PayPal pays
  Given Rose has linked PayPal
  And Sam's page is open and says "Nothing to approve"
  When Rose picks "Reading glasses, +2.00" at $18.99 and taps "Ask Sam"
  Then Rose's page says "Waiting for Sam" with the glasses and $18.99, and no item list
  And within 5 seconds Sam's page shows "Rose would like Reading glasses, +2.00" for $18.99 with OK and No
  When Sam taps OK
  Then Rose's sandbox PayPal is charged $18.99
  And Sam's page shows the receipt: Reading glasses, +2.00, $18.99, Paid, the date and time, and PayPal's transaction ID
  And within 5 seconds Rose's page shows the same receipt

Scenario: Sam says no
  Given Rose is waiting on Sam for "AA batteries, pack of 8" at $9.99
  When Sam taps No
  Then within 5 seconds Rose's page says "Sam said no to AA batteries, pack of 8", in neutral grey, not as an error
  And Rose's PayPal is not charged
  And Rose can pick an item and ask again
  And Sam's page says "Nothing to approve"

Scenario: The charge fails after Sam's OK
  Given Rose is waiting on Sam for "Weekly pill organiser" at $12.50
  And PayPal will refuse to charge Rose's saved PayPal
  When Sam taps OK
  Then Sam's page says "Payment didn't go through. Nothing was taken from Rose's PayPal."
  And within 5 seconds Rose's page says "Payment didn't go through. Nothing was taken."
  And Rose's page shows the three items again

Scenario: An answered request can't be answered again
  Given Sam has Rose's request for "Reading glasses, +2.00" at $18.99 open in two tabs
  When Sam taps OK in the first tab, then OK in the second
  Then Rose's PayPal is charged $18.99 once
  And the second tab shows the same receipt, with the same PayPal transaction ID
```

## Scope

**In:**

- Two fixed people, Rose (the relative) and Sam (the helper), each with one long random secret link. No sign-up (O3). The two names are fixed in code; change them before filming if your relative takes part (shape O4).
- Who can do what: Rose's link can link PayPal, pick, ask, and see the answer and receipt. It has no OK or No. Sam's link can see the waiting request, tap OK or No, and see the receipt. It can't link PayPal or ask. Any other link says it doesn't work.
- Rose links a sandbox PayPal once, and it stays linked.
- A fixed list of three items in US dollars (O4): Reading glasses, +2.00 at $18.99; Weekly pill organiser at $12.50; AA batteries, pack of 8 at $9.99.
- One waiting request at a time (O5).
- Both pages check for changes every 3 seconds while open, so a request or an answer shows within 5 seconds without a reload.
- On OK: one charge to Rose's saved PayPal, paid into the app's sandbox business account. Both pages show the receipt: item, amount, Paid, date and time, PayPal's transaction ID.
- On No: Rose sees it in plain, neutral words, and nothing is charged.
- Each page shows the latest request's outcome until Rose asks for something new.
- Screens composed from the design system (D15).

**Out:**

- Typed requests and AI explanations of options: `find-and-explain`.
- Notifications when the page is closed: `ping-helper`.
- Asking by voice: `ask-by-voice`.
- Sam paying from their own PayPal: not built. The vault works (O1, D16), so the O2 fallback isn't needed.
- Cancelling a waiting request, refunds, a history of past purchases, unlinking or switching PayPal accounts: no slice planned.
- More than one relative or helper, and sign-up: no slice planned (O3).
- Spend limits, auto-approve, real shop orders: shape's Not doing list.

## Interface

Two phone pages built from the design system's tokens (D15), one for Rose and one for Sam, plus a page for a broken link. Each is a pure view that takes one state and renders it, the same pattern as `StatusView`.

```mermaid
flowchart LR
    NL["Rose: Link your PayPal to start"] -- "Link PayPal, approves" --> PK["Rose: What would you like?"]
    NL -- "cancels at PayPal" --> NC["Rose: PayPal isn't linked yet"]
    NC -- "Link PayPal" --> PK
    PK -- "Ask Sam" --> WT["Rose: Waiting for Sam"]
    WT -- "shows within 5 s" --> RQ["Sam: Rose would like Reading glasses"]
    RQ -- "OK, pay $18.99" --> PD["Both: receipt"]
    RQ -- "No: grey notice for Rose" --> PK
    RQ -- "PayPal refuses: red notice for both" --> PK
    PD -- "Ask for something else" --> PK
```

Rose's page loops through pick, wait and outcome. Every outcome returns Rose to the three items. Sam's page keeps the latest outcome until Rose asks again.

| Page | State | Heading | What else shows |
| ---- | ----- | ------- | --------------- |
| Rose | not linked | Link your PayPal to start | one line on what linking does; Link PayPal |
| Rose | cancelled at PayPal | PayPal isn't linked yet | "Nothing was saved"; Link PayPal |
| Rose | pick | What would you like? | "PayPal linked. Nothing is paid until Sam says OK."; three radio cards with prices; Ask Sam |
| Rose | pick, no item chosen | What would you like? | red line under the cards: "Pick one of the three first." |
| Rose | pick, after No | What would you like? | grey notice above: "Sam said no to AA batteries, pack of 8." |
| Rose | pick, after a failed charge | What would you like? | red notice above: "Payment didn't go through. Nothing was taken." |
| Rose | waiting | Waiting for Sam | amber notice: "Asked at 10:15 AM. This page changes by itself when Sam answers."; item and amount |
| Rose | paid | Sam said OK. It's paid. | green receipt; Ask for something else |
| Sam | nothing | Nothing to approve | "Keep this page open." After a No, a grey notice: "You said no to AA batteries, pack of 8. Rose can see that." |
| Sam | request | Rose would like Reading glasses, +2.00 | $18.99 with "Paid from Rose's PayPal if you say OK."; asked time; OK, pay $18.99; No |
| Sam | paid | Paid from Rose's PayPal | green receipt; "Rose sees this receipt too." |
| Sam | failed | Payment didn't go through | red notice: "Nothing was taken from Rose's PayPal for Weekly pill organiser. Rose can ask again." |
| either | wrong or cut-off link | This link doesn't work | open the whole link again, or ask the sender |

The receipt shows Paid, the amount at 40px, the item, the day and time, and the PayPal transaction ID. Rose and Sam see the same one.

Busy states: Link PayPal becomes "Opening PayPal…", Ask Sam becomes "Asking Sam…", and OK becomes "Paying…" with No hidden, so it can't be tapped mid-charge. No loading screen: the server sends each page complete. No empty state beyond Sam's "Nothing to approve".

Checked: no sideways scroll at 320px and 390px wide; light and dark both rendered; text on the green receipt is 15.2:1 light and 12.2:1 dark, and "Paid" on it is 7.0:1 and 8.1:1. Every other pair is in the brief's table. Radio cards are real radio inputs, so the arrow keys move between them and the focus ring shows on the card.

Craft checks: a one-line "approve a purchase" prompt gives a card with a shadow, a gradient header, and green and red Approve and Decline buttons. Here, No is a plain grey button, cards are flat, and the amount is the one big thing. Against the brief's references: Monzo's large amount and plain "you paid" receipt, and Stripe Checkout's amount kept in view, with an error that says how to fix it ("Pick one of the three first."). It holds up next to both. One thing it lacks: Monzo's receipt names who was paid, and there's no real shop here (shape O9).

**Motion tier:** 1. Buttons shrink to 98% on press (120ms). Notices and the receipt rise 8px and fade in (240ms, ease-out). Spinners turn once every 900ms. Colour changes are instant. Under reduced motion nothing moves, and the words still change.

**Components used:** tokens only, as the system has no component library (its conventions say to build each control from the tokens). Built here from them: `Button` (primary, secondary, busy), `ItemPicker` (radio cards), `Notice` (wait, neutral, danger), `Summary`, `ReceiptCard`, in `app/(shop)/ui.tsx`.

**Preview:** `/preview/approve-and-pay` on `pnpm dev`. The views are `app/(shop)/RoseView.tsx`, `SamView.tsx` and `BrokenLinkView.tsx`. Tokens come from `docs/design/design-system/tokens/` through `app/(shop)/layout.tsx`, and the font from `next/font` in `app/layout.tsx`.

## Open items

| ID | What | Type | Raised at | Owner | Status | Answer |
| -- | ---- | ---- | --------- | ----- | ------ | ------ |
| O1 | Saving Rose's PayPal once (vault), then charging it later on Sam's OK alone, works in sandbox (from shape O1) | unproven | shape | poc | Resolved | Yes, with the v3 vault, once "Save payment methods" is ticked on the sandbox app. It was off, and PayPal answered `NOT_AUTHORIZED`. Personal account `sb-tvgg853347282` approved setup token `4RV72937BH429471C` once; payment token `1j970427g9944212v` was charged $18.99 later with no buyer present: `POST /v2/checkout/orders` with `payment_source.paypal.vault_id` came back `COMPLETED` at once, capture `7BM91101S1572292D`. The same `PayPal-Request-Id` sent twice returned the same order and one capture. Billing Agreements v1 also worked, but PayPal lists it as deprecated. `.env.local` now holds a US sandbox app (merchant `sb-qe3zu53303991`); Vercel and GitHub still hold the MY app's keys. Spike, 2026-10-13 |
| O2 | Fallback if the vault fails. Normal checkout puts Rose's PayPal login back in the path (from shape O2) | question | shape | user | Resolved | Sam pays from their own PayPal: OK opens normal PayPal checkout on Sam's phone. No shared passwords; the money comes from Sam. Built only if O1 fails, and then scenario 1 goes and scenarios 2, 4 and 5 charge Sam. 2026-10-13 |
| O3 | Two fixed demo people and no sign-up. Anyone holding Sam's link could approve a sandbox charge (from shape O8) | assumption | shape | user | Accepted risk | One long random secret link each. A leaked link for Sam can approve a charge in sandbox money only. Agreed 2026-10-13 |
| O4 | Assuming US dollars and US sandbox accounts: a US personal account for Rose, a US business account receiving the money. Which countries PayPal offers the vault in is unchecked; the spike uses US accounts | assumption | spec p1 | user | Resolved | Confirmed with pause 1 approval, 2026-10-13 |
| O5 | Assuming one waiting request at a time, with no cancel. If Sam never answers, Rose can't ask for anything else | assumption | spec p1 | user | Resolved | Confirmed with pause 1 approval, 2026-10-13 |
| O6 | The e2e can drive PayPal's sandbox login and approval page in CI, or it has to start from an already-linked PayPal | unproven | spec p1 | spec p3 | Open | — |
| O7 | A personal sandbox account can approve the billing agreement and be charged. Both spike approvals were made by the MY business account (`sb-hnzlq53312161`), so a personal payer is untested | unproven | poc | user | Resolved | Yes. Personal account `sb-tvgg853347282` approved agreement `B-0K795184PM582223H`, and $9.99 was charged later with no buyer present: capture `8VU82241V0834892E`, `COMPLETED`. The same account then passed the vault test in O1. 2026-10-13 |

_Never delete this section or its rows. See references/ledger.md._

## Glossary

- **Vault** — PayPal's store for a saved payment method. The account holder approves once, and the app can charge later without them logging in.
- **Billing agreement** — PayPal's older form of a saved PayPal. The buyer approves once and the shop gets an ID (`B-…`) it can charge later. Deprecated; the spike tried it before the vault was switched on (O1).
- **PayPal-Request-Id** — a header PayPal uses to spot a repeated request and return the first result instead of charging again.
- **Sandbox** — PayPal's test environment. Fake accounts, fake money, real API.
- **Secret link** — a URL with a long random part nobody can guess. Holding the link is the only key.
- **Transaction ID** — the reference PayPal gives each payment, shown on the receipt so either person can find it in PayPal.
- **e2e** — end to end: one test that drives the app in a real browser the way a person would.
- **Spike** — a short throwaway experiment (`/poc`) that answers one risky question.
