# Basket

**Version:** v1 · **Status:** Refined · **Type:** Feature · **Project type:** Web UI

**Shape doc:** docs/specs/shop-together/shape.md
**Depends on:** find-and-explain, ping-helper
**Page:** none. Skipped: you read the `.md` directly.

Rose types several things at once and picks a listing for each one they want. Sam ticks the ones to pay for, and one OK makes one charge; anything Sam leaves out goes back to Rose. It is slice 5 in the shape, built now because slices 0 to 3 shipped and ask-by-voice was dropped.

## Problem

A request is one item today. When Rose types "AA batteries, a night light and a phone charger", the page says "One thing at a time for now. What would you like first?" (find-and-explain scenario 3). Three things means three Finds, three Ask Sams, three buzzes on Sam's phone, three OKs and three charges. Rose also can't ask for the second thing until Sam answers the first, because only one request can be open at a time (`purchase_requests_one_open`, `lib/shop/requests.ts:71`).

## Slice test

| Check                         | Result |
| ----------------------------- | ------ |
| Cuts every layer it needs     | yes: Rose's box and a screen with a group of options per thing, the AI splitting the list and searching each thing, a stored basket, one PayPal charge for the total, Sam's page, both receipts and the notifications, deployed |
| One e2e test walks it         | yes: Rose types three things and picks one listing for two of them; Sam unticks one and pays the other; both pages show the receipt, and Rose's box gets the left-out thing back |
| Worth shipping alone          | yes: Rose asks for several things at once, and Sam answers once instead of once per thing |
| Fits (≤5 scenarios, ≤2 areas) | yes, at the limit: 5 scenarios; two areas, the shop pages and the find-and-pay path in `lib/shop`. All four answers together came to 8 scenarios over three areas, so the total cap moved to `basket-cap` (O1). Sam's ticking was split out too, then folded back at pause 2 (O10); Sam's answers share one scenario |

**Path:** full. A new screen, a new kind of request, and one charge for several items.

## User story

As Rose, I want to ask for several things at once, so that I don't have to wait for Sam's answer before asking for the next one.

As Sam, I want to see the whole list, untick what Rose doesn't need, and pay the rest with one OK, so that one shopping run is one decision and one charge.

## Flow

```mermaid
flowchart LR
    R((Rose)) -- "types 2 to 5 things" --> B[Request box]
    B -- "words and Sam's limit" --> F[Search and AI, per thing]
    F -- "up to 3 listings per thing" --> G[One group per thing]
    G -- "picks in some groups, taps Ask Sam" --> W[Waiting for Sam]
    W -- "each thing, its price, the total" --> S((Sam))
    S -- "unticks some, OK, pay $9.99" --> P[Rose's saved PayPal pays once]
    P -- "receipt for what was paid" --> R
    P -- "left-out things, back in the box" --> B
    S -- "No: nothing taken" --> R
```

Rose types several things and gets a group of up to three listings for each; Rose picks the ones they want, Sam ticks the ones to pay for, one OK pays them in one charge, and what Sam left out goes back into Rose's box.

## States

```mermaid
stateDiagram-v2
    [*] --> Asking
    Asking --> Looking: taps Find
    Looking --> Options: one thing, as find-and-explain
    Looking --> Groups: 2 to 5 things, at least one with listings
    Looking --> NothingFound: no thing has listings, or the AI failed
    Looking --> TooMany: more than 5 things
    NothingFound --> Asking: words kept in the box
    TooMany --> Asking: words kept in the box
    Groups --> Asking: tries other words
    Groups --> Waiting: picks at least one, taps Ask Sam
    Waiting --> Paid: Sam ticks at least one, taps OK
    Waiting --> Asking: Sam says no, or the charge fails
    Paid --> Asking: asks for something else, with what Sam left out in the box
```

## Acceptance criteria

```gherkin
Scenario: Rose asks for several things and sees options for each
  Given Rose's PayPal is linked and Sam's limit is $50 an item
  When Rose types "AA batteries, a night light and a phone charger" and taps Find
  Then within 20 seconds Rose sees three groups: AA batteries, a night light, a phone charger
  And each group has up to three real listings at $50 or less
  And each listing shows its own name and price and the three short sentences from find-and-explain

Scenario: Rose asks Sam for two, Sam pays for one, and the other goes back to Rose
  Given Rose sees the three groups
  When Rose picks AA batteries at $9.99 and a night light at $12.49, leaves the phone charger unpicked, and taps "Ask Sam"
  Then Sam's phone, with notifications on, shows "Rose would like 2 things" and "$22.48 in total"
  And Sam's page lists both, ticked, each with its price, shop, why it fits and a link to the listing, and "OK, pay $22.48"
  When Sam unticks the night light
  Then the total and the button change to $9.99
  When Sam taps "OK, pay $9.99"
  Then Rose's saved PayPal is charged $9.99, once
  And both pages show a receipt for the batteries at $9.99
  And Rose's page says "Sam left out a night light."
  When Rose taps "Ask for something else"
  Then Rose's box holds "a night light"

Scenario: Some of the things can't be shown
  Given Sam's limit is $30 an item
  When Rose types "AA batteries, a tablet for video calls and a left-handed teapot for a cat" and taps Find
  Then Rose sees up to three listings for AA batteries
  And under "a tablet for video calls" Rose sees "Nothing under $30 for this one."
  And under "a left-handed teapot for a cat" Rose sees "Couldn't find this one."
  And Rose can still pick the batteries and ask Sam

Scenario: More than five things
  Given Rose's PayPal is linked
  When Rose types "batteries, a night light, a phone charger, a doormat, a kettle and a flashlight" and taps Find
  Then Rose sees "Up to 5 things at a time. Which 5 do you need most?"
  And Rose's words are still in the box

Scenario Outline: Sam pays for all of it, or none
  Given Sam's page shows Rose's AA batteries at $9.99 and night light at $12.49, both ticked
  When Sam <does>
  Then Rose's saved PayPal is charged <charged>
  And Rose's page shows <what Rose sees>

  Examples:
    | does                                       | charged       | what Rose sees                                                   |
    | leaves both ticked and taps "OK, pay $22.48" | $22.48, once | one receipt listing both things, their prices and the $22.48 total |
    | taps "No"                                  | nothing       | "Sam said no to your 2 things. Nothing was taken." above an empty box |
```

## Scope

**In:**
- A list of 2 to 5 things typed into Rose's box. The AI splits it into things, and each is searched and explained as in find-and-explain: up to three real US listings at or under Sam's per-item limit.
- One group per thing. Rose picks one listing in any group, or none to leave that thing out. Ask Sam needs at least one pick (O2).
- A thing with nothing to show gets one grey line in its group: "Couldn't find this one." or "Nothing under $30 for this one." When no thing has listings, "Couldn't find that. Try different words." as today (O3).
- More than five things: "Up to 5 things at a time. Which 5 do you need most?", with Rose's words kept.
- Sam's page lists every picked thing with its price, shop, why it fits and a link, each ticked at first, and the total of the ticked ones. OK pays that total; No refuses all of it. With nothing ticked, OK can't be tapped (O11).
- One PayPal charge for the ticked total, from Rose's saved PayPal. One receipt on both pages, listing every paid line and the total.
- What Sam leaves out goes back to Rose: both receipts name it, and Rose's "Ask for something else" puts it in the box in Rose's own words, ready for Find.
- The notifications from ping-helper, worded for several things.
- One thing typed works exactly as today: up to three options and one request (O6).

**Out:**
- A total cap for one basket, set by Sam: `basket-cap` (O1).
- Groceries. Channel3 doesn't list them (O4). No later slice.
- One charge per shop when the things come from different shops. The sandbox charge lands in one test business account (shape O9). No later slice.
- Rose changing a pick after asking. Sam says no, and Rose asks again. No later slice.

## Interface

Rose's options screen becomes one group per thing: the thing's name as a heading, find-and-explain's listing cards under it, and a "None of these" card last. Sam's request screen leads with the total of the ticked things, then lists each as a ticked card with its price, shop and reason, and its link under the card. The waiting screen and both receipts list every line under the total.

```mermaid
flowchart LR
    A["Rose: What do you need?"] -- "Find, 2 to 5 things" --> G["Rose: Which ones would you like?"]
    A -- "Find, 6 or more" --> A
    G -- "Ask Sam, 2+ picks" --> W["Rose: Waiting for Sam"]
    G -- "Ask Sam, 1 pick" --> W1["find-and-explain's one-item request"]
    G -- "Try other words" --> A
    W -- "push: 2 things, $22.48" --> S["Sam: Rose would like 2 things"]
    S -- "untick, OK, pay $9.99" --> R["Both: receipt for what was paid"]
    R -- "Ask for something else: left-out things in the box" --> A
    S -- "No" --> A
```

Rose's Find with 2 to 5 things opens the groups screen; two or more picks go to Sam as one basket, Sam's OK pays for the ticked ones and shows both of them the same receipt, and Rose's next ask starts with what Sam left out.

| Who | State | Heading | What's on it |
| --- | ----- | ------- | ------------ |
| Rose | asking | What do you need? | the hint becomes "Say it the way you'd tell Sam, one thing or up to 5. For example: AA batteries, a night light and a phone charger."; the rest as find-and-explain |
| Rose | looking | What do you need? | as find-and-explain: the box locked, "Looking…" with the spinner |
| Rose | groups | Which ones would you like? | "For "AA batteries, a night light and a phone charger". Pick one for each thing you want."; per thing, its name at title size, up to three listing cards, then "None of these"; Ask Sam; Try other words |
| Rose | Ask Sam with no pick | Which ones would you like? | red above Ask Sam: "Pick at least one first." |
| Rose | asking Sam | Which ones would you like? | Ask Sam becomes "Asking Sam…" with the spinner; Try other words goes |
| Rose | a thing with nothing | Which ones would you like? | in that thing's group, a grey notice instead of cards: "Couldn't find this one." or "Nothing under $30 for this one." |
| Rose | more than five | What do you need? | grey notice: "Up to 5 things at a time. Which 5 do you need most?"; Rose's words still in the box |
| Rose | waiting | Waiting for Sam | approve-and-pay's notice; a summary with "2 things", $22.48 at 40px, and each line's name and price |
| Rose | paid | Sam said OK. It's paid. | the receipt: Paid, $22.48, each line's name and price, the date, the PayPal transaction |
| Rose | paid, some left out | Sam said OK. It's paid. | the receipt for the paid lines only; under it a grey notice: "Sam left out a night light." |
| Rose | asking again | What do you need? | after "Ask for something else", the box holds what Sam left out, in Rose's words: "a night light" |
| Rose | Sam said no | What do you need? | grey notice: "Sam said no to your 2 things. Nothing was taken."; an empty box |
| Rose | charge failed | What do you need? | approve-and-pay's red notice, unchanged |
| Sam | request | Rose would like 2 things | a summary: "In total", $22.48 at 40px, "Paid from Rose's PayPal if you say OK."; "Untick anything you don't want to pay for."; per line, a ticked card with the name, "$9.99 at amazon.com" and "Why it fits: …", and "See it on amazon.com" under it; asked time; OK, pay $22.48; No |
| Sam | one unticked | Rose would like 2 things | the card loses its violet edge and tick; the summary and the button say $9.99 at once |
| Sam | nothing ticked | Rose would like 2 things | the summary says $0.00; the OK button reads "Tick at least one to pay" and does nothing (O11); No still works |
| Sam | paying | Rose would like 2 things | the summary becomes "Paying", the ticked total and the ticked lines; one "Paying…" button |
| Sam | paid | Paid from Rose's PayPal | the same receipt as Rose's; with something left out, a grey notice: "You left out a night light. Rose can ask for it again." |
| Sam | said no | Nothing to approve | grey notice: "You said no to Rose's 2 things. Rose can see that." |
| Sam | charge failed | Payment didn't go through | red notice: "Nothing was taken from Rose's PayPal for the 2 things. Rose can ask again." |

When Rose picks only one thing from a basket, it goes to Sam as a one-item request, exactly as find-and-explain, so no screen ever says "1 things" (O8).

The notifications from ping-helper, for a basket:

| To | Title | Text |
| -- | ----- | ---- |
| Sam | Rose would like 2 things | $22.48 in total. Tap to see them and say OK or No. |
| Rose | Sam said OK | Your 2 things are paid: $22.48. Tap to see the receipt. |
| Rose | Sam said OK | Sam paid $9.99 for 1 thing and left out a night light. Tap to see the receipt. |
| Rose | Sam said no | Sam said no to your 2 things. Nothing was taken. |

A failed charge keeps ping-helper's text, which names no item.

"None of these" is there because a radio can't be unticked: it is how Rose takes back a pick. Nothing is ticked at first, and a group left alone is left out (O2). Ask Sam keeps its plain label, and Sam sees the total before paying. Sam's OK button is different: it names the ticked total and changes on every tick, so Sam's basket form runs in the browser (`BasketAnswer`, a client component like `NotifyControl`). With the browser's script off, the boxes still tick and OK still pays for the ticked ones; only the total on the button stays as it loaded.

Checked: no sideways scroll at 420px; light and dark both rendered. No new colour pairs: the line list uses body text on the summary's and receipt's existing backgrounds, the tick box's edge is the `control` colour every option ring uses, and the ticked box is the button's `on-accent` on `accent`. The focus ring shows on "None of these" and on Sam's cards like on any option card, which is 56px tall at least.

Craft checks: a one-line "shopping basket" prompt gives quantity steppers, a cart badge, subtotal, tax and shipping rows, and a Checkout button. Here there are no quantities and no checkout: each thing keeps Rose's own words as its heading, and the only next step is Ask Sam. Against Stripe Checkout's order summary: line names on the left, prices on the right in tabular figures, the total above them. Against Monzo: Sam's total stays at 40px with plain words around it, and it follows Sam's ticks, so the number on the button is always the number that leaves Rose's PayPal.

**Motion tier:** 1, as before. Nothing new moves: the grey notices rise and fade like every notice, a tick changes the card and the total at once, and "Looking…", "Asking Sam…" and "Paying…" turn the spinner.

**Components used:** from the system, Button, Notice, Summary, ReceiptCard and ListingPicker. Three gain an optional prop: Summary and ReceiptCard take `lines`, and ListingPicker takes `name` and `none`. Composed from tokens here: the line list (`LineItems`, `space-2`, tabular figures), the group stack (`space-8`), and Sam's tick card, which is the listing card with a square box (`space-6`, `border-selected`, `radius-control`, `control`, `accent`, `on-accent`) where the radio ring sits. Changing three system components and adding the tick box is O9.

**Preview:** http://localhost:3000/preview/basket with `pnpm dev`. It answers 404 in production. The listings are written examples and grey squares stand in for photos; real results replace both at /build.

## Technical plan

### Approach

Haiku's first call now returns a list of things instead of a kind. Each thing comes back with Rose's own words for it and a short shop query. One thing runs find-and-explain's search exactly as today. Two to five things run that same search for every thing at once, each with its own two Channel3 searches and its own Haiku pick (D31), and the result is saved as groups in Rose's one current search. More than five stops before any search.

Ask Sam reads the picks from the saved groups, never from the form (D23). Two or more picks become one purchase request whose lines sit in a jsonb column (D32): `item` holds "2 things" and the total. One pick becomes find-and-explain's one-item request (O8). Sam's OK sends the ticked line ids. `claim()` keeps only stored lines that are ticked, and in the same update that moves the request to paying, it rewrites the lines, the total and what was left out. `pay()` and PayPal's `charge()` are unchanged: they charge `item`, which is now the ticked total, as one purchase unit (D33). Rose's next "Ask for something else" fills the box with what was left out.

There is no new switch. Baskets ride `searchOn()`, like find-and-explain.

Relies on: D12, D17, D18, D19, D20, D21, D22, D23, D24, D29, and the drafted D31, D32 and D33 below.

```mermaid
flowchart TB
    subgraph phones["Rose's and Sam's phones"]
        RV["RoseView: groups, Ask Sam"]
        BA["BasketAnswer (client): ticks, OK, No"]
    end
    subgraph server["Next.js on Vercel"]
        ACT["actions.ts: find, askSam, answer"]
        FIND["find.ts: split, then searchThing per thing"]
        REQ["requests.ts: ask, claim, keep"]
        PAY["pay.ts, paypal.ts: unchanged"]
    end
    RV -- "words; pick-0 to pick-4 listing ids" --> ACT
    BA -- "answer, ticked line ids" --> ACT
    ACT -- "words and Sam's limit" --> FIND
    FIND -- "Haiku and Channel3, per thing at once" --> EXT["Haiku, Channel3"]
    ACT -- "groups, basket lines, ticked ids" --> REQ
    REQ -- "rose_search.groups, purchase_requests.lines and left_out" --> DB[(Neon)]
    ACT -- "claimed request, ticked total" --> PAY
    PAY -- "one order, one purchase unit" --> PP[PayPal sandbox]
```

Rose's words go out to Haiku once and to Channel3 once per thing; the picks and the ticks come back in as ids only, and every price is read from Neon.

```mermaid
sequenceDiagram
    participant R as Rose's page
    participant A as find action
    participant H as Haiku
    participant C as Channel3
    participant D as Neon
    R->>A: "AA batteries, a night light and a phone charger"
    A->>D: Sam's limit ($50)
    A->>H: split the words
    H-->>A: 3 things, each with Rose's words and a query
    par each of the 3 things at once
        A->>C: search the query, max_price 50, and without a limit
        C-->>A: up to 10 listings each
        A->>H: the thing's words and its listings
        H-->>A: up to 3 picks, aboveLimit
    end
    A->>D: save the search: outcome basket, 3 groups
    A-->>R: redirect, "Which ones would you like?"
```

The three things search side by side, so a basket takes about as long as its slowest thing, plus the split.

```mermaid
sequenceDiagram
    participant S as Sam's page
    participant A as answer action
    participant D as Neon
    participant P as PayPal
    participant R as Rose's phone
    S->>A: answer ok, line aa-24 (night light unticked)
    A->>D: claim: read the lines, keep aa-24
    A->>D: UPDATE paying, lines [aa-24], left_out ["a night light"], $9.99, WHERE waiting
    A->>P: charge $9.99, one purchase unit "1 thing"
    P-->>A: COMPLETED, capture id
    A->>D: record paid
    A-->>S: redirect, the receipt and "You left out a night light."
    A->>R: after(): push "Sam paid $9.99 for 1 thing and left out a night light."
```

The trim and the claim are one update, guarded by `status = 'waiting'`, so a double tap or a second phone can't trim twice or charge twice.

### Changes

| File | What changes | Why |
| ---- | ------------ | --- |
| `db/migrations/0005_basket.up.sql`, `.down.sql` (new) | Up: `purchase_requests` gains `lines jsonb` and `left_out jsonb`, both null for a one-item request; `rose_search` gains `groups jsonb NOT NULL DEFAULT '[]'`; `rose_search_outcome_check` (the name Postgres gave it, read from the local database) is dropped and re-added with `basket` and `too many`. `several` stays allowed, so old rows keep loading. Down, below | 1, 2, 4 |
| `scripts/migrate.test.ts:43` | Up checks `purchase_requests.lines` and `rose_search.groups`; down removes them, and `push_subscriptions` now survives a down, since down undoes only 0005; up brings both back | reverse path |
| `lib/shop/ai.ts:3`, `:9`, `:11`, `:41` | `Need` becomes `{ things: { words: string; query: string }[] }`. The prompt asks for every product they want to buy, in their order, with their own words for each ("a night light", not "night light") and a short query that keeps sizes, colours and must-haves. Something sold as one product, like salt and pepper shakers, stays one thing. Nothing to buy gives an empty list. `max_tokens` goes from 200 to 600, so a list of six or more still comes back whole and counts as too many | 1, 4 |
| `lib/shop/find.ts:5`, `:7`, `:27` | `Group` moves here from `RoseView.tsx:21`. `Search` gains `{ outcome: "basket"; groups: Group[] }` and `"too many"`, and loses `"several"`. Today's search body (`:32` to `:44`) becomes `searchThing(words, query, limitCents)`, unchanged. `search()`: no things or a blank query gives nothing found; one thing runs `searchThing` with Rose's whole words, as today; six or more gives too many and searches nothing; two to five run `searchThing` for every thing with `Promise.all`, each with its own words. A thing that throws becomes "nothing found" in its own group only. No group with options gives nothing found (O3). The log line becomes `find outcome=basket things=3 shown=3 listings=8 ms=11873`, with `reason=` naming any thing that failed | 1, 3, 4 |
| `lib/shop/requests.ts:8`, `:10`, `:26`, `:192` | `Line` moves here from `ui.tsx:11`, beside `Source`. `PurchaseRequest` and `Row` gain `lines` and `leftOut`, null when absent or empty | 2 |
| `lib/shop/requests.ts:72` | `ask(item, source?, lines?)` also writes `lines` | 2 |
| `lib/shop/requests.ts:126` | New pure `keep(lines, ticked)` returns `{ lines, leftOut, cents }` for the stored lines whose ids are ticked, or null when none are. `claim(id, ticked?)`: for a basket, reads the stored lines, runs `keep`, and returns null without claiming when nothing is kept (O11). Otherwise it runs one `UPDATE … SET status = 'paying', answered_at = now(), lines, left_out, amount_cents, item_name WHERE id = $1 AND status = 'waiting'`. A one-item request ignores `ticked`, as today | 2, 5 |
| `lib/shop/requests.ts:44`, `:83`, `:91` | `SavedSearch` gains `groups`; `saveSearch` writes them for a basket, `getSearch` reads them | 1 |
| `app/(shop)/actions.ts:62` | `askSam`, for a saved basket: reads `pick-0` to `pick-4` against `saved.groups[i].options`, and a listing picked in two groups counts once. No pick: `?pick=missing` (O2). One pick: `ask(option, source)` as today (O8). Two or more: `ask({ id: "basket", name: things(n), cents: total }, undefined, lines)`, each line carrying its group's words as `thing`, then `sendPing("asked", { item, lines })` and `clearSearch()` | 2 |
| `app/(shop)/actions.ts:80` | `answer`: OK passes `formData.getAll("line")` to `claim()`. `sendPing("declined", declined)` and `sendPayment(await pay(claimed), claimed)` pass the request, not just its item | 2, 5 |
| `app/(shop)/pings.ts:11`, `:37`, `:43` | `ping(kind, { item, lines?, leftOut? })`: with lines, the words in the Interface's notification table. `sendPing` and `sendPayment` take the same object | 2, 5 |
| `app/(shop)/state.ts:11` | `roseState`: a saved basket gives the `basket` state, with `error` on `?pick=missing`. Waiting, the declined or failed outcome and the paid receipt pass `lines`, and the receipt passes `leftOut`. `?ask=1` after a paid request that left something out puts `listed(leftOut)` in the box. `too many` reaches the box through the existing outcome-to-problem fall-through | 1, 2, 4 |
| `app/(shop)/state.ts:60`, `:81` | `samState` passes `lines` for request, failed and declined, and `receiptOf` adds `lines` and `leftOut` | 2, 5 |
| `app/(shop)/ui.tsx:11`, `:25` | Imports `Line` from `requests.ts`. New `things(n)`: "1 thing", "2 things" | O8 |
| `app/(shop)/RoseView.tsx:21`, `:107`, `:125`; `SamView.tsx:103`, `:113`; `BasketAnswer.tsx:25` | `Group` comes from `find.ts`. The "One thing at a time" notice goes. Counts use `things(n)`, so a basket trimmed to one line says "1 thing" while paying or failed. Otherwise as built at pause 2 | O8 |
| `app/(shop)/r/[token]/page.tsx:33`, `h/[token]/page.tsx:30` | `sendPayment(settled.result, settled.request)` | 2 |
| `app/(shop)/preview/basket/page.tsx:4` | `Group` from `find.ts` | — |
| `e2e/basket.spec.ts` (new) | The e2e below, plus "more than five things", which asks Haiku and never reaches Channel3 | 1, 2, 4 |
| `e2e/find-and-explain.spec.ts:62` | "a shopping list asks for one thing at a time" goes: that answer no longer exists, and scenario 4 takes its place | 4 |

No change: `lib/shop/pay.ts` and `paypal.ts` (they charge `request.item`, which `claim()` already set to the ticked total; the log reads `item=basket`), `search.ts`, `e2e/db.ts` (`reset()` already empties both tables), `.github/workflows/ci.yml` (the keys are there), and `package.json`.

Reusing: `searchThing` (today's search body), `choose()`, `searchListings()`, `query()`, `whoIs()`, the one-open index for one basket at a time, the `WHERE status = 'waiting'` claim guard, `pay()` and `charge()`, `sendPing`/`after()` (D29), `listed()` and `money()`, `reset()` in `e2e/db.ts`, and the pause 2 components.

### Data

```mermaid
erDiagram
    PURCHASE_REQUESTS {
        bigint id PK
        text item_id "basket for a basket"
        text item_name "2 things"
        integer amount_cents "the total; the ticked total once claimed"
        jsonb lines "new: id, name, cents, shop, url, reason, thing per line; null for one item"
        jsonb left_out "new: Rose's words for unticked things; null when none"
        text status
    }
    ROSE_SEARCH {
        smallint id PK
        text outcome "gains basket and too many"
        jsonb listings "one thing's options, as today"
        jsonb groups "new: thing, options, problem per group"
    }
```

The two tables stay unlinked: Ask Sam copies the picked lines out of `rose_search` into the request, then clears the search, as find-and-explain does.

**Migration:** expand only. Three nullable or defaulted columns and a wider check; nothing to backfill, and no code reads the new columns until the deploy that writes them. CI runs it on Neon after tests pass on main (D11). No contract step: `several` stays in the check, unused and harmless.
**Reverse:** `0005_basket.down.sql`: `DELETE FROM rose_search WHERE outcome IN ('basket', 'too many')`, then put back the old check, then drop `groups`, `lines` and `left_out`. `pnpm db:down` runs it, and `scripts/migrate.test.ts` checks up, down, up. Past baskets keep their row, total and "2 things", and lose their lines.

### Earn-it

| Added | Triggered by |
| ----- | ------------ |
| `purchase_requests.lines` | Scenario 2: Sam sees each line, and both receipts list what was paid (D32) |
| `purchase_requests.left_out` | Scenario 2: both receipts name what Sam left out, and Rose's box gets it back |
| `rose_search.groups`, and `basket` and `too many` in the check | Scenarios 1, 3 and 4: the groups and the problem survive the redirect and the 3 s refresh, and Ask Sam reads prices from them (D23) |
| `keep()` with the trim inside `claim()` | Scenario 2 and O11: the charge is the stored prices of the ticked lines, never the form's, and a double tap can't trim twice |
| Searching every thing at once | O5: a basket within 20 s (D31) |
| `things(n)` | O8: no screen says "1 things", including a basket trimmed to one |
| `max_tokens` 600 | Scenario 4: a six-thing list must come back whole to count as too many |

Cut: PayPal line items (D33); a retry per thing (the group says "Couldn't find this one" and Rose can try other words); a cache of searches; a flag (baskets ride `searchOn()`).

### Non-functionals

|                      |                                                                               |
| -------------------- | ----------------------------------------------------------------------------- |
| **Load**             | Two people, a few baskets a month. A basket Find is 1 + n Haiku calls and 2n Channel3 searches, at most 6 and 10; Ask Sam and the answer are one or two queries each, as today |
| **Breaks first**     | Channel3's free-tier quota (O7), 10 searches for a 5-thing Find. When refused, the groups say "Couldn't find this one" and the log carries `reason=channel3 429` |
| **Security surface** | `find`, `askSam` and `answer` run only with Rose's or Sam's link (`whoIs`). Prices come from the saved groups and the stored lines, never the form; a pick or tick that matches no stored id is dropped, and a forged OK with nothing kept charges nothing. Rose's words go to Haiku, as today; each thing's short query goes to Channel3. No new secrets. New stored data: listing names, prices, links and reasons per line, and Rose's words for left-out things |
| **Proof it works**   | In Vercel's log: `find outcome=basket things=3 shown=3 listings=8 ms=11873`, then `purchase id=12 item=basket status=paid capture=…` |
| **Rollout**          | No flag; baskets go live with the deploy wherever `searchOn()` is true. Rollback: promote the previous deploy on Vercel. Old code ignores the new columns; a saved basket search shows the empty box, and a waiting basket shows Sam "Rose would like 2 things" with OK charging the total. `pnpm db:down` removes the columns if needed |

### Test plan

| Scenario | Test | Command |
| -------- | ---- | ------- |
| 1 Groups for several things | `lib/shop/ai.test.ts`: the new schema and prompt, `max_tokens` 600. `lib/shop/find.test.ts` (Haiku and Channel3 stubbed): three things give three groups, every thing's searches start before any finishes, and each `choose` gets its own thing's words; one thing still gives `options` (O6). e2e below | `pnpm test`, `pnpm test:e2e` |
| 2 Sam unticks one | `lib/shop/requests.test.ts`: `keep` keeps ticked ids only and ignores unknown ones; `claim(id, ["aa-24"])` sets $9.99, one line and `["a night light"]`, and a second claim returns null. `app/(shop)/actions.test.ts`: two picks make one $22.48 request with two lines and one `asked` ping; one pick makes a one-item request (O8); a listing picked twice counts once; OK with one tick pays $9.99. `pings.test.ts`: the four basket texts. `state.test.ts`: groups, waiting with lines, paid with left out, and `?ask=1` putting "a night light" in the box. e2e below | `pnpm test`, `pnpm test:e2e` |
| 3 Some can't be shown | `find.test.ts`: a thing over the limit and a thing with nothing give their problems while the other group shows; a thing whose search throws blanks only its own group; no group with options gives nothing found (O3). `state.test.ts`. The preview frame | `pnpm test` |
| 4 More than five | `find.test.ts`: six things give too many and Channel3 is never called. `state.test.ts`: the notice and the words kept. e2e "more than five things" | `pnpm test`, `pnpm test:e2e` |
| 5 All, or No | `actions.test.ts` (`pay` stubbed): OK with both ticked pays $22.48 and pings `paid` with no left out; No declines and pings "Sam said no to your 2 things"; OK with nothing ticked claims nothing and charges nothing (O11) | `pnpm test` |
| Storage and migration | `requests.test.ts`: `ask` with lines and `saveSearch` with groups round-trip. `scripts/migrate.test.ts`: up, down, up | `pnpm test` |

**E2E:** `e2e/basket.spec.ts`, test "Rose asks for three things, Sam pays for one, and the other goes back to Rose". Rose types "AA batteries, a night light and a phone charger" and taps Find. Within 20 s Rose's page shows three group headings, each group with up to three listings at $50 or less, or a grey line. The test picks the first listing in the first two groups that have listings, leaves the third alone, and taps Ask Sam. Sam's page shows "Rose would like 2 things", both ticked, and "OK, pay" with their sum. The test unticks the second, checks the button now names the first price, and taps it. Both pages show one receipt with the first line, and Rose's says "Sam left out {the second group's heading}.". "Ask for something else" leaves that heading in Rose's box. A real Haiku, Channel3 and sandbox charge (D20, D24). Stop `pnpm dev` before running it.

### Chunks

| Chunk | Scenarios | Files owned |
| ----- | --------- | ----------- |
| A · finding and storing | 1, 3, 4, storage | `db/migrations/0005_*`, `scripts/migrate.test.ts`, `lib/shop/ai.ts` and test, `lib/shop/find.ts` and test, `lib/shop/requests.ts` and test |
| B · asking and answering | 2, 5 | `app/(shop)/actions.ts` and test, `pings.ts` and test, `state.ts` and test, `ui.tsx`, `RoseView.tsx`, `SamView.tsx`, `BasketAnswer.tsx`, `r/[token]/page.tsx`, `h/[token]/page.tsx`, `preview/basket/page.tsx` |
| C · e2e | 1, 2, 4 | `e2e/basket.spec.ts`, `e2e/find-and-explain.spec.ts` |

The moved types live in chunk A: `Group` and `Search` in `find.ts`, and `Line`, `PurchaseRequest`, `SavedSearch`, `ask`, `claim` and `keep` in `requests.ts`. B and C build against the signatures in Changes.

### Risks

| Risk | Mitigation |
| ---- | ---------- |
| A 5-thing Find runs past 20 s, or 10 searches at once get rate-limited | The spike (O12) took 7.2 to 7.7 s with no 429. On Vercel, a cold start and Neon add to that; the 20 s budget leaves room. A thing that fails blanks only its own group, and the log names why |
| Haiku splits Rose's words differently from what Rose meant, or drops the "a" | The prompt asks for Rose's own words and keeps one product as one thing; Rose can try other words. The poc checks the e2e's list |
| Channel3 has nothing for one of the e2e's three things, so the test can't pick two | The test picks from any two groups with listings, not fixed ones. Batteries, night lights and chargers are everyday stock; the poc checks all three |
| A rollback while a basket waits | Old code shows Sam a one-item screen for "2 things" and OK charges the asked total: the right amount, just less detail. Accepted |

### Decisions to record

```
## D31 · 2026-10-14 · A basket searches all its things at once, each with find-and-explain's two calls

Why: a 5-thing basket must show within 20 s (O5); searched all at once, it took 7.2 to 7.7 s in the spike with no rate limit (O12), where one after another would add up every thing's time. Each thing keeps its own searches and Haiku pick, so a thing that fails blanks only its own group (scenario 3).
Rejected: one thing after another (about 27 s for five at the spike's 4.3 to 5.9 s a thing, past the 20 s budget), one Haiku call choosing for every thing at once (one long answer, and one bad thing spoils the whole basket).
Source: docs/specs/basket.md
Status: active

## D32 · 2026-10-14 · A basket is one purchase request, with its lines in a jsonb column

Why: one OK and one charge per basket (scenario 2), and the one-open index already keeps Rose to one request at a time; the lines are only ever read with their request, like Rose's saved listings (D23).
Rejected: a `request_lines` table (a join on every 3 s render, for rows nothing reads alone), one request per thing (Sam answers each one, the problem this slice removes).
Source: docs/specs/basket.md
Status: active

## D33 · 2026-10-14 · A basket is charged as one PayPal purchase unit for the ticked total

Why: `charge()` stays as it is, and our receipt already lists every line (scenario 2).
Rejected: PayPal line items with an amount breakdown (Rose's PayPal activity would list each thing, but no scenario needs it, and the item amounts must add up to the total exactly or PayPal refuses the order).
Source: docs/specs/basket.md
Status: active
```

## Open items

| ID | What | Type | Raised at | Owner | Status | Answer |
| -- | ---- | ---- | --------- | ----- | ------ | ------ |
| O1 | The four answers together fail the slice test: up to 3 options per thing, Sam unticking things, a total cap and up to 5 things come to 8 scenarios over three areas (Rose's find, Sam's approval, Sam's limit form). This spec keeps up to 3 options per thing and the 5-thing cap. Sam unticking moves to `basket-trim` and the total cap to `basket-cap`, both added to the shape after this slice | flag | spec p1 | user | Resolved | Split agreed. `basket-trim` and `basket-cap` go into the shape after `basket`, only if time is left. 2026-10-14 |
| O2 | Assuming a thing Rose leaves unpicked is left out of the basket, and Ask Sam with no pick at all says "Pick at least one first." | assumption | spec p1 | user | Resolved | Confirmed with pause 1 approval, 2026-10-14 |
| O3 | Assuming a thing with nothing to show gets a grey line in its group while the other groups still show, and only when no thing has listings does Rose see "Couldn't find that. Try different words." | assumption | spec p1 | user | Resolved | Confirmed with pause 1 approval, 2026-10-14 |
| O4 | Channel3 doesn't list groceries, which the shape gave as the example. Searched under $50: "milk" returned skin lotions and a baby formula, "sliced bread" a squishy toy and bread knives, "a dozen eggs" egg crates and ornaments. A basket is household things, such as batteries, a night light and a charger | flag | spec p1 | user | Resolved | Accepted. A basket is household things; the shape's "such as groceries" is changed to match. 2026-10-14 |
| O5 | Assuming up to 20 seconds is acceptable for a basket of up to 5 things, with "Looking…" shown meanwhile. One thing took 9.9 s in find-and-explain's spike (its O11) | assumption | spec p1 | user | Resolved | Confirmed with pause 1 approval, 2026-10-14 |
| O6 | Assuming one thing typed still works exactly as find-and-explain: up to three options and a one-item request | assumption | spec p1 | user | Resolved | Confirmed with pause 1 approval, 2026-10-14 |
| O7 | A 5-thing basket uses up to 10 Channel3 searches, against 2 per Find today. find-and-explain O14 accepted the free tier, assumed 1,000 a month, for a few hundred Finds. The basket e2e adds about 6 searches to every CI run | flag | spec p1 | user | Accepted risk | The demo, testing and CI need a few hundred searches a month at most. If Channel3 refuses for quota, Rose sees "Couldn't find that" and the log says why, as in find-and-explain O14. Agreed 2026-10-14 |
| O8 | Assuming one pick from a basket goes to Sam as a one-item request, exactly as find-and-explain, so Sam's screen, the receipt and the notifications never say "1 things" | assumption | spec p2 | user | Resolved | Confirmed with pause 2 approval, 2026-10-14 |
| O9 | Summary, ReceiptCard and ListingPicker are design-system components, and this slice gives each an optional prop. Sam's ticking also needs a tick box, which the system doesn't have; it is built from the option ring's tokens. craft.md asks for both to be a deliberate choice: accept them here as composition, as find-and-explain did with the listing card, or take them through `/design-system`. Either way the Claude Design bundle in `docs/design/design-system/ds-bundle/` shows the old versions until `/design-sync` | flag | spec p2 | user | Resolved | Accepted as composition with pause 2 approval: no new colours or tokens. The bundle stays stale until `/design-sync`. 2026-10-14 |
| O10 | Sam ticking which things to pay for, split out as `basket-trim` at O1, comes back into this slice at pause 2. Unticked things go back to Rose: both receipts name them, and Rose's next ask starts with them in the box. The slice stays at 5 scenarios in the same two areas: Sam's answers share one scenario, and the untick path is scenario 2 | flag | spec p2 | user | Resolved | Asked for at pause 2 review; "back in Rose's box" picked over a note only or reopening the old options. `basket-trim` comes off the shape. 2026-10-14 |
| O11 | Assuming Sam can't pay with nothing ticked: OK reads "Tick at least one to pay" and does nothing, and No is how Sam refuses all of it | assumption | spec p2 | user | Resolved | Confirmed with pause 2 approval, 2026-10-14 |
| O12 | Unproven: with the real keys, a basket Find shows within 20 s (O5) when 10 Channel3 searches and 5 Haiku picks run at once, with no 429 from either; Haiku splits a list into Rose's own words ("a night light") and counts six things as six; and Channel3 has listings for all three of the e2e's things. find-and-explain's spike timed one thing only | unproven | spec p3 | user | Resolved | Proven by a spike on 2026-10-14, everything fired at once as planned, from this machine: the 3-thing list took 6.2, 7.2 and 8.1 s, and the 5-thing list (adding a doormat and a flashlight) 7.7, 7.2 and 7.5 s. Of that, the split took 1.5 to 2.7 s, each thing 4.3 to 5.9 s, and Channel3 1.7 to 3.1 s. 48 Channel3 searches and 34 Haiku calls, with no 429 and no error. Haiku kept Rose's words ("a night light", "a phone charger") with queries like "night light", and counted the six-thing list as six. Every thing got three picks in every run. The plan stands |

_Never delete this section or its rows. See references/ledger.md._

## Glossary

- **Basket**: several things Rose asks for at once, approved with one OK and paid with one charge.
- **Listing**: one product for sale in an online shop, with its name, price, photo and link.
- **Channel3**: a hackathon sponsor whose API searches real product listings across shops.
- **Price limit**: the most one item may cost. Sam sets it, and Rose is never shown anything above it.
- **Sandbox**: PayPal's test environment. Fake accounts, fake money, real API.
- **e2e**: end-to-end, one test that walks the whole slice as a user would.
- **Haiku**: Claude Haiku 5.5, the small, fast Claude model that splits Rose's words and explains each listing.
- **jsonb**: a Postgres column that holds a JSON value, such as a list of lines.
- **Purchase unit**: one amount inside a PayPal order; a basket's order has one, for the ticked total.
- **429**: the HTTP answer "too many requests", sent when a service rate-limits a caller.
- **Backfill**: filling a new column for rows that already exist; this slice has none to fill.
