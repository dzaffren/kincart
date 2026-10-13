# Ping helper

**Version:** v1 · **Status:** Draft · **Type:** Feature · **Project type:** Web UI

**Shape doc:** docs/specs/shop-together/shape.md
**Depends on:** approve-and-pay, find-and-explain
**Page:** none. Skipped: you read the `.md` directly.

Sam's phone buzzes when Rose asks for something, and Rose's phone buzzes when Sam answers, so neither has to keep their page open. It is slice 3 in the shape, built now because slices 0 to 2 shipped with time left, and it makes "approve from afar" real on the video.

## Problem

Both pages only change while they are open on screen (D19). Sam has to keep opening their link to find out whether Rose asked, and Rose has to keep their page open to learn whether Sam said OK. A request Rose makes while Sam's phone is in their pocket can sit unseen for hours. On the video, approving from afar only looks real if Sam's phone buzzes.

## Slice test

| Check                         | Result |
| ----------------------------- | ------ |
| Cuts every layer it needs     | yes: a Turn on button on both pages, a background script that shows the notification, stored phones to notify, a send on Ask Sam and on Sam's answer, deployed |
| One e2e test walks it         | yes: one Playwright test with Rose's and Sam's pages: both turn on, Rose asks, Sam's notification opens Sam's page, Sam taps OK, Rose's notification opens the receipt. Whether Playwright's browser can receive a real push in CI is O5 |
| Worth shipping alone          | yes: Sam learns of a request, and Rose of Sam's answer, without keeping a page open |
| Fits (≤5 scenarios, ≤2 areas) | yes, at the limit: 5 scenarios; two areas, the shop pages (existing) and push notifications (new) |

**Path:** full. New controls on both pages, a new table, a background script, and the phones' push services.

## User story

As Sam, I want my phone to buzz when Rose asks for something, so that I can answer without keeping a page open.

As Rose, I want my phone to tell me when Sam has answered, so that I don't have to keep watching the page.

## Flow

```mermaid
flowchart LR
    S((Sam)) -- "taps Turn on, allows" --> SP[Sam's page]
    R((Rose)) -- "taps Turn on, allows" --> RP[Rose's page]
    RP -- "Ask Sam" --> APP[Shop app]
    APP -- "Rose would like… $24.99" --> SN[Sam's phone]
    SN -- "taps the notification" --> SP
    SP -- "OK or No" --> APP
    APP -- "Sam said OK / no" --> RN[Rose's phone]
    RN -- "taps the notification" --> RP
```

Each person turns notifications on once from their own page; after that Rose's ask buzzes Sam's phone, Sam's answer buzzes Rose's, and tapping either notification opens that person's page.

## States

The notification control on each page, per phone:

```mermaid
stateDiagram-v2
    [*] --> HomeScreenFirst: iPhone, opened in Safari
    [*] --> NotSupported: browser has no web push
    [*] --> Off: Android, or iPhone opened from the Home Screen
    HomeScreenFirst --> Off: added to Home Screen, opened from there
    Off --> On: taps Turn on, allows
    Off --> Blocked: taps Turn on, blocks
    Blocked --> Off: allowed again in the phone's settings
    On --> Off: the phone stops accepting them (browser data cleared)
```

## Acceptance criteria

```gherkin
Scenario Outline: Turning notifications on
  Given <person> opens their link on <phone>
  When <what they do>
  Then their page says "<message>"

  Examples:
    | person | phone                            | what they do                              | message                                                                                                   |
    | Sam    | an Android phone in Chrome                   | taps "Turn on notifications", then Allow  | On. Your phone will buzz when Rose asks for something. |
    | Sam    | an Android phone in Chrome                   | taps "Turn on notifications", then Block  | Blocked on this phone. To get them, allow notifications for this site in your browser's settings. Until then, keep this page open. |
    | Rose   | an iPhone (iOS 16.4+) in Safari              | nothing yet                               | On iPhone, add this page to your Home Screen first: tap Share, then Add to Home Screen. Then open KinCart from your Home Screen and turn them on there. |
    | Rose   | an iPhone on iOS 15, opened from the Home Screen | nothing yet                           | This browser can't show notifications. Keep this page open to see when Sam answers. |

Scenario: Rose turns notifications on from the iPhone Home Screen
  Given Rose has added their page to the Home Screen on an iPhone with iOS 16.4 or later
  When Rose taps the KinCart icon
  Then Rose's own page opens, not the status page
  When Rose taps "Turn on notifications", then Allow
  Then Rose's page says "On. Your phone will buzz when Sam answers."

Scenario: Rose asks, and Sam's phone buzzes with the page closed
  Given Sam turned notifications on, closed Sam's page and locked the phone
  When Rose picks "Dearfoams Women's Fireside Slipper" at $24.99 and taps "Ask Sam"
  Then within 10 seconds Sam's phone shows "Rose would like something" with "Dearfoams Women's Fireside Slipper, $24.99. Tap to see it and say OK or No."
  When Sam taps the notification
  Then Sam's page opens on that request, with "OK, pay $24.99" and "No"

Scenario Outline: Sam answers, and Rose's phone buzzes
  Given Rose turned notifications on, asked for "Dearfoams Women's Fireside Slipper" at $24.99, and closed their page
  When Sam taps <Sam taps> and <what happens>
  Then within 10 seconds Rose's phone shows "<title>" with "<text>"
  And tapping it opens Rose's page, showing <Rose's page>

  Examples:
    | Sam taps         | what happens                | title                      | text                                                                                   | Rose's page          |
    | "OK, pay $24.99" | the payment goes through    | Sam said OK                | Dearfoams Women's Fireside Slipper is paid: $24.99. Tap to see the receipt.            | the receipt          |
    | "No"             | nothing is charged          | Sam said no                | Sam said no to Dearfoams Women's Fireside Slipper. Nothing was taken.                  | "Sam said no to…"    |
    | "OK, pay $24.99" | PayPal refuses the payment  | Payment didn't go through  | Sam said OK, but the payment didn't go through. Nothing was taken.                     | "Payment didn't go through" |

Scenario: A phone that stopped accepting notifications changes nothing else
  Given Sam turned notifications on, then cleared the browser's data on that phone
  When Rose taps "Ask Sam" for "Dearfoams Women's Fireside Slipper" at $24.99
  Then Rose sees "Waiting for Sam" as before, with no delay or error
  And Sam's page shows the request as soon as it is opened
  And Sam's page offers "Turn on notifications" again
```

## Scope

**In:**

- A "Turn on notifications" control on Sam's page and on Rose's page, with the on, blocked, iPhone-Home-Screen-first and not-supported messages from scenario 1.
- iPhone: once the page is added to the Home Screen, its icon opens that person's own page.
- Sam's phone is notified when Rose asks: the item name and price. Tapping it opens Sam's page on the request.
- Rose's phone is notified when Sam answers: paid, said no, or the payment failed. Tapping it opens Rose's page.
- Every phone a person turned notifications on for gets them (O4).
- A notification that fails never delays or stops an ask or a payment. A phone that no longer accepts them is forgotten, and its page offers Turn on again.
- Open pages keep refreshing every 3 seconds (D19), as now.

**Out:**

- OK and No buttons on the notification itself: no slice planned. Sam checks the reason and the listing on the page before paying (find-and-explain scenario 2), and iPhone doesn't show notification buttons.
- A reminder when Sam hasn't answered: no slice planned.
- A Turn off button: no slice planned. The phone's own notification settings turn it off.
- Email or text messages: no slice planned (D1).
- Notifications through the PayPal app: no slice planned. In PayPal itself, these pings would be PayPal app notifications and none of the web push setup would exist. This slice is a stand-in for the hackathon, and the video and README say so.
- Asking by voice: slice 4, `ask-by-voice`.

## Interface

A Notifications section joins both pages, under a divider like Sam's price limit. It is composed from the system's existing pieces; the notifications themselves are drawn by the phone, so only their words are designed here.

```mermaid
flowchart LR
    SAMREST["Sam: Nothing to approve / Paid / Failed"] -- "section above Price limit" --> N1[Notifications]
    ROSE["Rose: What do you need? / Waiting for Sam"] -- "section at the bottom" --> N2[Notifications]
    NS["Sam's phone: Rose would like something"] -- "tap" --> REQ["Sam: Rose would like this"]
    NR["Rose's phone: Sam said OK / no"] -- "tap" --> OUT["Rose: receipt or notice"]
```

The section sits on each person's resting screens, and each notification opens the screen that answers it.

| Page | Screens with the section | Not on |
| ---- | ------------------------ | ------ |
| Sam  | Nothing to approve, Paid, Payment didn't go through: under the outcome, above Price limit | the request screen, where OK and No stay the only actions |
| Rose | What do you need? (and the fixed list when Find is off), Waiting for Sam: at the bottom | Link PayPal, the options, the receipt |

| State | Text under "Notifications" | Control |
| ----- | -------------------------- | ------- |
| off | Turn them on to get a buzz when Rose asks for something, even with this page closed. (Rose: when Sam answers) | "Turn on notifications", secondary button |
| turning on | as off | the button shows the spinner and "Turning on…" while the phone asks |
| couldn't turn on | as off | the button, and red under it: "Couldn't turn them on. Try again in a minute." |
| on | On. Your phone will buzz when Rose asks for something. (Rose: when Sam answers) | none |
| blocked | Blocked on this phone. To get them, allow notifications for this site in your browser's settings. Until then, keep this page open. | none |
| iPhone, not from the Home Screen | On iPhone, add this page to your Home Screen first: tap Share, then Add to Home Screen. Then open KinCart from your Home Screen and turn them on there. | none |
| not supported | This browser can't show notifications. Keep this page open to see when Rose asks for something. (Rose: when Sam answers) | none |

Sam's "Nothing to approve" line drops "Keep this page open."; the section now says when that applies.

The notifications:

| To | When | Title | Text | Tapping it opens |
| -- | ---- | ----- | ---- | ---------------- |
| Sam | Rose taps Ask Sam | Rose would like something | Dearfoams Women's Fireside Slipper, $24.99. Tap to see it and say OK or No. | Sam's page, on the request |
| Rose | Sam's OK is paid | Sam said OK | Dearfoams Women's Fireside Slipper is paid: $24.99. Tap to see the receipt. | Rose's page, on the receipt |
| Rose | Sam taps No | Sam said no | Sam said no to Dearfoams Women's Fireside Slipper. Nothing was taken. | Rose's page, with "Sam said no to…" |
| Rose | the payment fails | Payment didn't go through | Sam said OK, but the payment didn't go through. Nothing was taken. | Rose's page, with "Payment didn't go through" |

The item name goes in the text, not the title, because Android shows one line of title and listing names run long.

The app icon is KinCart's tick cart, from the logo kit (`docs/design/logo/kit/`, guidelines in `guidelines.md`). The Home Screen name is "KinCart", seven letters, so iPhone shows it whole.

| Where | File in `kit/web/` |
| ----- | ------------------ |
| iPhone Home Screen | `apple-touch-icon.png`, 180px, opaque |
| Android Home Screen | `icon-192.png`, `icon-512.png`, and `maskable-512.png` for the circle crop |
| Beside each notification | `icon-192.png` |
| Android's status bar | `badge-96.png`, white on transparent |
| Browser tab | `favicon.ico`, `favicon.svg` |

Checked: no sideways scroll at 320px; light and dark both rendered. No new colour pairs: the section uses the price limit's label, muted text, divider and error colours. The button is 56px tall and the focus ring shows on it. The text line is a polite live region, so a screen reader hears "On." when it changes.

Craft checks: a one-line "notification settings" prompt gives a bell icon, a toggle switch and a custom "Allow notifications?" pop-up. Here there is no toggle, because the phone owns turning it off; the button says what it does, and every state that can't turn on says what to do instead. Against Stripe: each refusal names what happened and the next step, and the error sits under the button it belongs to.

**Motion tier:** 1, as approve-and-pay. Nothing new moves: "Turning on…" turns the existing spinner.

**Components used:** Button (secondary, busy), and from tokens as in the price limit: `field-label`, `small`, `field-error` and the divider. `NotifySection` is composed from these, like `LimitForm`. Design system: the Claude Design project `shop-together` (2b71c794), tokens in `docs/design/design-system/tokens/` (D15).

**Preview:** http://localhost:3000/preview/ping-helper with `pnpm dev`. It answers 404 in production.

## Open items

| ID | What | Type | Raised at | Owner | Status | Answer |
| -- | ---- | ---- | --------- | ----- | ------ | ------ |
| O1 | On iPhone, the Home Screen icon opens the person's own secret link (not `/` or `/status`), and web push works from there. Only a real iPhone with iOS 16.4+ can show it | unproven | spec p1 | poc | Resolved | Yes. A throwaway page at `/spike/<token>`, with its own manifest (`start_url` and `scope` on that link, `display: standalone`, the kit's icons) and a service worker scoped to the link, was added to your iPhone's Home Screen from a Vercel preview. Opened from the Home Screen, it loaded the link, subscribed through Apple's push service, and a push sent with `web-push` and VAPID keys showed on the lock screen; tapping it opened `/spike/<token>?from=push`. Not captured: whether iPhone launched from the manifest's `start_url` or from Safari's address. Both are the person's link, and Android needs the per-link manifest anyway. Spike, 2026-10-14 |
| O2 | Which phones can you test on? "Both must work" needs an iPhone with iOS 16.4+ and an Android phone in hand, or the missing one ships untested | question | spec p1 | user | Resolved | Both, an iPhone and an Android phone. Each path gets checked by hand before the video. 2026-10-13 |
| O3 | Assuming a notification within 10 seconds of the tap is good enough. Delivery goes through Apple's and Google's push services, which this app doesn't control | assumption | spec p1 | user | Resolved | Confirmed with pause 1 approval, 2026-10-13 |
| O4 | Assuming every phone a person turned notifications on for gets them, with no limit on how many | assumption | spec p1 | user | Resolved | Confirmed with pause 1 approval, 2026-10-13 |
| O5 | Playwright's browser can get a push subscription and receive a push in CI. Its Chromium is an open-source build and may have no push service | unproven | spec p1 | poc | Resolved | Yes, in Playwright's Firefox only. Headless Firefox 157 with a persistent profile (`launchPersistentContext`) and `dom.push.serverURL` set to `wss://push.services.mozilla.com/` subscribed, and a real push sent with `web-push` and VAPID keys came back 201 and arrived through `updates.push.services.mozilla.com` in 337 ms; `getNotifications()` showed it. Firefox in a normal Playwright context fails with "Error retrieving push subscription". Chromium fails in every headless form: the headless shell says "push service not available", full Chromium and Google Chrome hang subscribing past 20 s, and a normal Playwright context is incognito, where Chrome refuses push ("Registration failed - permission denied"). A headless browser can't tap a notification, so the e2e reads the notification's data and opens its link itself. Spike, 2026-10-14 |
| O6 | Assuming the notification shows the item and price, on the lock screen too. Anyone who sees Sam's phone sees what Rose is buying; phones can hide notification text on the lock screen in their own settings | assumption | spec p1 | user | Resolved | Confirmed with pause 1 approval, 2026-10-13 |
| O7 | Both links opened on one phone, as when you test alone: does each person get their own notifications there? | question | spec p1 | spec p3 | Open | — |
| O8 | The design system has no app icon. The iPhone Home Screen and the notifications need one; without it iPhone uses a screenshot of the page | flag | spec p2 | /design-system | Resolved | The KinCart logo kit, `docs/design/logo/kit/`: a tick on two wheels, white on the violet tile, with every Home Screen, notification and badge size. Wired in at this slice's build. 2026-10-14 |

_Never delete this section or its rows. See references/ledger.md._

## Glossary

- **Web push**: how a website shows a notification on a phone while the site is closed. The phone's own push service (Google's on Android, Apple's on iPhone) carries the message.
- **Home Screen web app**: a website saved to the iPhone's Home Screen with Share, then Add to Home Screen. It opens without Safari's bars, and on iPhone only these can get web push.
- **Push subscription**: the address a phone's browser hands out for one site. The app sends each notification to it, and it stops working if the browser's data is cleared.
- **e2e**: end-to-end, one test that walks the whole slice as a user would.
