# Itemized receipt

**Version:** v1 · **Status:** Refined · **Type:** Enhancement · **Project type:** Web UI

**Shape doc:** docs/specs/after-review/shape.md
**Depends on:** None
**Page:** none. Skipped: you read the `.md` directly.

Rose's PayPal activity lists each thing Sam paid for, with its price, and KinCart's receipt says who got the money. It comes first because it is the smallest change, and PayPal judges see it in the sandbox.

## Problem

A basket charge reaches PayPal as one line. `charge()` at `lib/shop/paypal.ts:69` sends one purchase unit with `description: item.name`, and for a basket `claim()` sets that name to "2 things" (`lib/shop/requests.ts:318`). So Rose's PayPal activity says "2 things, $22.46", and a judge who opens it can't see what was bought. D33 chose this, because no scenario then needed line items.

KinCart's own receipt lists every line, but it doesn't say who got the money. In sandbox it is KinCart's sandbox business account, and the shop never sees an order. A judge can read the receipt as "walmart.com was paid".

## Slice test

| Check                         | Result |
| ----------------------------- | ------ |
| Cuts every layer it needs     | yes: the PayPal order that `charge()` sends, and the receipt card on Rose's and Sam's pages |
| One e2e test walks it         | yes: the basket e2e pays two things, reads the order back from PayPal, and checks both receipts |
| Worth shipping alone          | yes: Rose's PayPal activity shows what was bought, and the receipt says plainly who was paid |
| Fits (≤5 scenarios, ≤2 areas) | yes: 4 scenarios, in the PayPal call in `lib/shop/` and the receipt card in `app/(shop)/` |

**Path:** full. It changes the PayPal order every payment sends, and the receipt that both pages show.

## User story

As Sam, I want Rose's PayPal activity to list each thing I paid for, so that either of us can check a charge against what was bought.

## Flow

```mermaid
flowchart LR
    S((Sam)) -- "ticks 2 of 3, taps OK, pay $22.46" --> C["claim(): the 2 ticked lines"]
    C -- "2 lines at their stored prices" --> P["charge(): one order,<br/>one item for each line"]
    P -- "items + item total $22.46" --> PP[PayPal sandbox]
    PP -- "captured" --> K[KinCart's sandbox shop]
    PP -- "activity: 2 lines with prices" --> R((Rose))
    P -- "paid" --> RC["Receipt on both pages:<br/>Paid to KinCart's sandbox shop"]
```

Sam's OK sends one PayPal order with one item for each ticked line, so Rose's PayPal activity lists them, and both receipts say the money went to KinCart's sandbox shop.

## Acceptance criteria

```gherkin
Scenario: Sam pays two of three things, and PayPal lists the two
  Given Rose asked for "AA batteries, a night light and a phone charger"
  And Rose picked "Energizer MAX AA Batteries, 8 Pack" at $9.47 from walmart.com
  And Rose picked "LED Plug-in Night Light, Dusk to Dawn Sensor, 2 Pack" at $12.99 from amazon.com
  And Rose picked "Anker 20W USB-C Wall Charger" at $14.99 from target.com
  When Sam unticks the charger and taps "OK, pay $22.46"
  Then PayPal's order has 2 items: the batteries at $9.47 and the night light at $12.99, each quantity 1
  And the order's item total and amount are both $22.46
  And Rose's PayPal activity for the payment lists both things with their prices
  And Rose's and Sam's receipts say "Paid to KinCart's sandbox shop. In this demo, no order reaches the shops."

Scenario: A one-thing ask lists its one thing
  Given Rose asked for "a magnifying glass" and picked "Fancii 3X Large Magnifying Glass with Light" at $16.99 from amazon.com
  When Sam taps "OK, pay $16.99"
  Then PayPal's order has 1 item: the magnifying glass at $16.99, quantity 1
  And the receipt says "Paid to KinCart's sandbox shop. In this demo, no order reaches the shops."

Scenario: A long listing name is cut to fit PayPal
  Given Rose picked a listing whose name is 160 characters long, at $8.99
  When Sam taps "OK, pay $8.99"
  Then the payment goes through
  And PayPal's item name is the listing's first 124 characters followed by "..."
  And KinCart's receipt still shows the full name

Scenario: PayPal refuses the order
  Given Rose's saved PayPal can't pay, and PayPal refuses the order with its items
  When Sam taps "OK, pay $22.46"
  Then Sam sees "Payment didn't go through" and "Nothing was taken from Rose's PayPal for the 2 things", as today
  And Rose sees "Payment didn't go through. Nothing was taken."
  And KinCart sends no second order without the items
```

## Scope

**In:**

- Every charge sends its things to PayPal as items: a basket's ticked lines, a one-thing ask, and the three fixed items.
- Each item has the listing's name, its price, and quantity 1. The order carries an item total equal to the amount.
- The receipt card on Rose's and Sam's pages says who got the money. It shows on receipts from before this ships too, because the same account got that money.

**Out:**

- Each shop paid from its own PayPal, and each shop's name on its PayPal lines. `pay-the-shop` picks these up.
- A link from KinCart's receipt to Rose's PayPal activity. No later slice.
- Tax and shipping lines. No later slice. KinCart charges the listed price only.

## Interface

The receipt card gains one line under the things and their prices: "Paid to KinCart's sandbox shop. In this demo, no order reaches the shops." `ReceiptCard` is shared, so Rose's paid screen and Sam's paid screen both show it. Nothing else on either page changes, and Sam's OK screen stays as it is (O4).

```mermaid
flowchart LR
    OK["Sam: OK, pay $22.46"] -- "PayPal captures" --> SP["Sam: Paid from Rose's PayPal"]
    OK -- "PayPal captures" --> RP["Rose: Sam said OK. It's paid."]
    SP -- "ReceiptCard" --> L["Paid · $22.46 · 2 lines<br/>Paid to KinCart's sandbox shop…<br/>date · PayPal transaction"]
    RP -- "ReceiptCard" --> L
    OK -- "PayPal refuses" --> F["Payment didn't go through, as today"]
```

Both paid screens draw the same receipt card with the new line, and a refused payment shows today's screens unchanged.

The PayPal side has no screen in KinCart. Its contract is the order that `charge()` sends: one item for each thing, each with the listing's name, its price and quantity 1, and an item total equal to the amount.

**Motion tier:** 0. The line adds no motion. The receipt keeps its existing `enter` animation.

**Components used:** `ReceiptCard`, `LineItems` and the `receipt-detail` text style, from `app/(shop)/ui.tsx` and `app/(shop)/shop.css` on the tokens in `docs/design/design-system/`.

**Preview:** `/preview/itemized-receipt` under `pnpm dev` (`app/(shop)/preview/itemized-receipt/page.tsx`). It shows Rose's and Sam's paid screens for scenarios 1 to 3, and the refused payment for scenario 4. The line is built into `ReceiptCard` at `app/(shop)/ui.tsx:74`.

## Technical plan

### Approach

`charge()` takes the things it pays for and sends one PayPal item for each. The amount and the item total are both the sum of those items' stored cents, so PayPal's `ITEM_TOTAL_MISMATCH` check can't fail. `pay()` passes a basket's ticked lines, and a one-thing ask passes its one item. The receipt line from pause 2 is already in `ReceiptCard`. Nothing in the schema changes.

Relies on: D16, D17, D20, D24, D32, D82, D86, D87

```mermaid
flowchart TB
    subgraph "Sam's page"
        BA["BasketAnswer / SamView"]
    end
    subgraph server
        AN["answer() actions.ts:183"] -- "ticked line ids" --> CL["claim() requests.ts:298"]
        CL -- "PurchaseRequest with kept lines" --> PY["pay() pay.ts:6"]
        PY -- "item, request key, lines" --> CH["charge() paypal.ts:48"]
        PY -- "paid + capture id" --> RE["record() requests.ts:325"]
    end
    subgraph pages
        RC["ReceiptCard ui.tsx:68"]
    end
    BA -- "POST answer=ok, line=..." --> AN
    CH -- "POST /v2/checkout/orders with items" --> PP[PayPal sandbox]
    RE -- "purchase_requests row" --> RC
```

Sam's OK claims the ticked lines, `pay()` hands them to `charge()`, and PayPal gets one item for each. The receipt reads the recorded row as today.

```mermaid
sequenceDiagram
    participant S as Sam's page
    participant A as answer()
    participant D as Neon
    participant P as pay() / charge()
    participant PP as PayPal sandbox
    S->>A: OK, line=aa-8, line=light-plug
    A->>D: claim(): status paying, lines = 2 kept, amount_cents 2246
    D-->>A: PurchaseRequest with 2 lines
    A->>P: pay(request)
    P->>PP: POST /v2/checkout/orders, vault_id, items [9.47, 12.99], item_total 22.46, amount 22.46
    PP-->>P: 201 COMPLETED, capture 7KT20419UA331082M
    P->>D: record(): status paid, order id, capture id
    Note over S,D: Rose's and Sam's pages re-render within 3 s (D19)<br/>ReceiptCard: lines, "Paid to KinCart's sandbox shop…", transaction
```

```mermaid
flowchart LR
    C3[Channel3] -- "listing name, price" --> RS[(rose_search)]
    RS -- "Rose's picks" --> PR[("purchase_requests.lines")]
    PR -- "kept lines: name, cents" --> CH["charge()"]
    CH -- "items: name, unit_amount, quantity 1" --> PP[PayPal sandbox]
    PP -- "activity: each item" --> R((Rose's PayPal))
```

Listing names cross from Channel3 to PayPal, by way of Neon. KinCart sends them as JSON values, and PayPal cuts any name past 127 characters (O6).

### Changes

| File | What changes | Why |
| ---- | ------------ | --- |
| `lib/shop/paypal.ts:48` | `charge(vaultId, item, requestKey, lines = [item])`. The purchase unit at `:69` gets `items`, one for each line with `name`, `quantity: "1"` and `unit_amount`. Its `amount` becomes the sum of the lines, with `breakdown.item_total` the same sum. `description` stays `item.name` | Scenarios 1, 2, 3; O1 |
| `lib/shop/pay.ts:9` | Passes `request.lines ?? undefined` as the fourth argument | Scenario 1: a basket's ticked lines reach PayPal |
| `app/(shop)/ui.tsx:74` | Built at pause 2: the payee line in `ReceiptCard` | Scenario 1, 2; O3 |
| `lib/shop/paypal.test.ts:79` | The charge test checks the one item and the amount with its breakdown. A new test checks two lines, and one checks that a 422 `ITEM_TOTAL_MISMATCH` gives `refused` after one call | Scenarios 1, 2, 4 |
| `lib/shop/pay.test.ts` | A new test: a basket claimed with 2 of 3 lines ticked sends PayPal those 2 items | Scenario 1 |
| `app/(shop)/RoseView.test.tsx` | A new test: the paid screen says "Paid to KinCart's sandbox shop. In this demo, no order reaches the shops." | Scenario 1 |
| `e2e/paypal.ts` | New. `paypalOrder(id)` gets a token with `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`, then reads `GET /v2/checkout/orders/<id>` | Scenarios 1, 2, 3: the e2e checks the order as PayPal kept it |
| `e2e/itemized-receipt.spec.ts` | New. The two e2e tests below | Scenarios 1, 2, 3 |

Reusing: `reset()` and `sql()` from `e2e/db.ts`, the seeded-search pattern from `e2e/basket-cap.spec.ts`, `stubPaypal()`, `apiCall()` and `json()` in `paypal.test.ts`, `stubOrders()` and `claimedGlasses()` in `pay.test.ts`, and `issueOf()` for PayPal's refusal reason.

### Earn-it

| Added | Triggered by |
| ----- | ------------ |
| A `lines` parameter on `charge()` | Scenario 1. `charge()` sees only the request's one `item`, which for a basket is "2 things" |
| `e2e/paypal.ts` | Scenarios 1 and 3. The pages show the capture id, not the items, so only PayPal's own order proves what was sent. No helper in `e2e/` calls PayPal today |

### Non-functionals

|                      |                                                                               |
| -------------------- | ----------------------------------------------------------------------------- |
| **Load**             | One PayPal call per OK, as today. The body grows by up to 5 items of under 200 bytes each |
| **Breaks first**     | Nothing new at 10 times the load. PayPal's request limits on the sandbox app come first, as today |
| **Security surface** | No new caller: `answer()` checks Sam's link as today. Listing names from Channel3 go to PayPal as JSON values, never as code. The amount comes only from prices stored in Neon (D23), never from the form. No new secret in the app. The e2e helper reads the PayPal keys that CI already holds |
| **Proof it works**   | In Vercel's logs, `purchase id=<n> item=basket status=paid capture=<id>` as today. In the demo buyer's sandbox activity, the payment lists each thing with its price. `GET /v2/checkout/orders/<id>` shows `items` |
| **Rollout**          | No flag, no migration, no new env value. Merge, CI tests, and Vercel promotes (D10). A payment stuck in `paying` across the deploy retries with the same `PayPal-Request-Id`, and PayPal returns the first order with no items (seen in sandbox, 2026-10-22). Rollback: revert the merge |

### Test plan

| Scenario | Test | Command |
| -------- | ---- | ------- |
| 1 Sam pays two of three things | `lib/shop/paypal.test.ts`: two lines give two items, `amount` 22.46 and `item_total` 22.46. `lib/shop/pay.test.ts`: a basket claimed with 2 of 3 ticked sends those 2. `app/(shop)/RoseView.test.tsx`: the payee line. The e2e, test 1 | `pnpm test`, `pnpm test:e2e e2e/itemized-receipt.spec.ts` |
| 2 A one-thing ask lists its one thing | `lib/shop/paypal.test.ts`: the glasses give one item at 18.99 and `item_total` 18.99. The e2e, test 2 | `pnpm test`, `pnpm test:e2e e2e/itemized-receipt.spec.ts` |
| 3 A long listing name is cut to fit PayPal | The e2e, test 2: PayPal's item name is the first 124 characters and "...", and the receipt shows all 160 | `pnpm test:e2e e2e/itemized-receipt.spec.ts` |
| 4 PayPal refuses the order | `lib/shop/paypal.test.ts`: a 422 `ITEM_TOTAL_MISMATCH` gives `{ state: "refused", reason: "ITEM_TOTAL_MISMATCH" }` after one orders call. The existing refused test in `pay.test.ts` covers the failed status | `pnpm test` |
| O5 Rose's PayPal activity | By hand at `/build`: sign in to sandbox.paypal.com as the demo buyer, and open the first itemized payment | — |

**E2E:** `e2e/itemized-receipt.spec.ts`, from an already-saved PayPal (D20) and seeded searches with fixed names and prices:

1. Rose picks the batteries ($9.47), the night light ($12.99) and the charger ($14.99) and taps Ask Sam. Sam unticks the charger and taps "OK, pay $22.46". Both pages show the payee line. The test reads `paypal_order_id` from Neon, and PayPal's order has 2 items with those names, `9.47` and `12.99`, quantity `1`, and `item_total` and `amount` both `22.46`.
2. Rose picks one listing with a 160-character name at $8.99, and Sam taps "OK, pay $8.99". PayPal's order has 1 item named with the first 124 characters and "...", and Rose's receipt shows the whole name.

### Chunks

Single chunk. It changes about 30 lines of app code, and its unit tests and e2e share the local database (learning: build chunks one after another when their tests share the local database).

### Risks

| Risk | Mitigation |
| ---- | ---------- |
| PayPal's sandbox activity page doesn't show the items for a saved-PayPal charge, so scenario 1's activity step fails | Accepted at pause 1 (O5). The API keeps them: order `8MW84402XV8639141` came back `COMPLETED` with 2 items on 2026-10-22. `/build` checks the page by hand, and drops the step if PayPal doesn't show them |
| Live PayPal refuses a name past 127 characters, where the sandbox cuts it | Accepted (O6). KinCart only runs in sandbox. `pay-the-shop` or a move to live adds a cut in `charge()` |
| A payment stuck in `paying` across the deploy is charged without items | PayPal returns the first order for the same `PayPal-Request-Id`, so it is charged once and recorded as paid. Only that one order has no items |
| `amount_cents` on the row and the sum of its lines differ, so Sam's button and the charge disagree | `claim()` sets `amount_cents` to the sum of the same kept lines (`requests.ts:317`). A test in `pay.test.ts` pays a claimed basket and checks the amount |

### Decisions to record

## D86 · 2026-10-22 · Every charge lists its things as PayPal items, and the total is their sum

Why: Rose's PayPal activity should show what Sam paid for (itemized-receipt scenario 1). The amount and `item_total` come from the same stored cents as the items, so PayPal's `ITEM_TOTAL_MISMATCH` refusal (seen in sandbox) can't happen. A basket is still one purchase unit and one charge for the ticked total, as D33 said.
Rejected: one line named "2 things" (D33: Rose's activity can't show what was bought), a retry without items when PayPal refuses (a second charge path to test, for a mismatch the sum already rules out).
Supersedes: D33
Source: docs/specs/itemized-receipt.md
Status: active

## D87 · 2026-10-22 · Listing names go to PayPal whole, and PayPal cuts any past 127 characters

Why: the sandbox took 128- and 300-character names and kept the first 124 characters and "..." (itemized-receipt O6, 2026-10-22). KinCart's receipt keeps the whole name.
Rejected: cutting in `charge()` to 126 characters and "…" (code for a cut PayPal already makes in sandbox).
Source: docs/specs/itemized-receipt.md
Status: active

## Open items

| ID | What | Type | Raised at | Owner | Status | Answer |
| -- | ---- | ---- | --------- | ----- | ------ | ------ |
| O1 | Line items reverse D33, which rejected them. PayPal refuses an order when the item amounts don't add up to the total (from shape O11) | flag | shape | user | Resolved | Supersede D33. The item total is built from the same stored cents as the items, so they add up. A refusal shows as today's failed payment, with no retry. 2026-10-22 |
| O2 | What each PayPal line says: the listing's name, Rose's own word for it, or the name and its shop | question | spec p1 | user | Resolved | The listing's name, cut to fit PayPal's limit. The shop is left out, so nobody reads it as the shop got paid. 2026-10-22 |
| O3 | What KinCart's receipt says about who got the money | question | spec p1 | user | Resolved | "Paid to KinCart's sandbox shop. In this demo, no order reaches the shops." It is true until `pay-the-shop` ships, and that slice swaps it for each shop's name (D82). 2026-10-22 |
| O4 | Whether Sam also sees who gets the money before tapping OK, or only on the receipt | question | spec p1 | user | Resolved | The receipt only. Sam's OK screen stays as it is. 2026-10-22 |
| O5 | PayPal's sandbox activity page shows the item lines for a saved-PayPal charge, and the name it shows as the payee is unknown | unproven | spec p1 | build | Accepted risk | `/build` makes the first itemized charge and checks the demo buyer's activity page by hand. If PayPal doesn't show the lines, scenario 1 drops that step. The e2e reads the items back from PayPal's API either way. 2026-10-22 |
| O6 | Who cuts a listing name past PayPal's 127 characters. The sandbox cut 128- and 300-character names to 124 characters and "..." and still took the order | flag | spec p3 | user | Resolved | PayPal cuts it, and scenario 3 now says so. KinCart sends the whole name (D87). Live PayPal's behaviour is unchecked; KinCart runs only in sandbox. 2026-10-22 |

_Never delete this section or its rows. See references/ledger.md._

## Glossary

- **Line items** — the `items` list in a PayPal order, with a name, price and quantity for each thing. PayPal shows them on the payer's activity.
- **Item total** — the `breakdown.item_total` in a PayPal order. PayPal refuses the order when it isn't the sum of the items.
- **Purchase unit** — one payment inside a PayPal order, with its amount and payee. KinCart sends one for each charge.
- **Payee** — the PayPal account that receives the money.
- **Sandbox** — PayPal's test system. Its accounts and money aren't real.
- **/poc** — zuko's timeboxed spike. It answers one risky question with throwaway code.
- **e2e** — end to end: an automated test that drives the app the way a person would, start to finish.
- **PayPal-Request-Id** — a header that makes a resent order safe. PayPal answers a repeat of the same id with the first order, and charges once.
- **Capture** — the moment PayPal takes the money. The capture id is the "PayPal transaction" on KinCart's receipt.
