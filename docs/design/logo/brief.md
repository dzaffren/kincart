# Design brief — KinCart

**Summary**: an older relative asks for something in plain words, and a family helper approves and pays from their own phone, so nobody hands over a password.
**Audience**: older shoppers on their own phone, and the family member who helps. They meet the mark as a Home Screen icon, beside a notification, in a browser tab and at the top of each page.
**Brand adjectives**: clear, steady, kind   **Avoid feeling**: flashy, cluttered, childish (from the design system brief)
**Promise / big idea**: family does your shopping with you, from wherever they are.
**Competitive landscape**: shopping apps use carts, bags and tags; payment apps use blue, shields, coins and cards; family apps use hearts, hands and houses; approval is a plain tick. A plain cart is out; a cart is allowed only in a form nobody else has. PayPal's blues and its P are out.
**Mark type hypothesis**: the name is short, so wordmark-led; it lives mostly as an app icon, so a compact symbol locked up with the wordmark. Three types tried: abstract-pictorial, letterform, pictorial.
**Must work on**: iPhone and Android Home Screens, Android's circle crop, a 16px tab, a one-colour notification badge, light and dark.
**Constraints**: the design system's colours, white mark on the violet tile `#5B3AA0`. Wordmark in Atkinson Hyperlegible Next Bold (OFL, logo use allowed), outlined to paths.
**Success criteria**: readable at 16px; not mistakable for PayPal; reads as clear, steady and kind.
**Assumptions I made**: the name is spelled KinCart with two capitals; no tagline; the earlier Shop-together icon concepts are not carried over.

## Word map

```
kin            → family, two of you, arm round a shoulder, held, generations
cart           → wheels, basket, handle, push, carry
asks / OK      → question, nod, tick, agree
older relative → coin purse, pull-along trolley, shopping list, reading glasses
no passwords   → two keys, two clasps, both must agree
```

Intersections: cart × OK → a tick that is the basket. kin × cart → the K on wheels. older × both agree → a kiss-lock purse whose two beads must meet.

## Longlist (idea / distinct / simple / relevant / 16px, out of 5)

| Type | One line | Score |
| ---- | -------- | ----- |
| Abstract-pictorial | A tick on two wheels is a cart: the helper's OK carries the shopping | 5 3 5 5 5 |
| Letterform | The K of KinCart on two wheels | 4 4 4 4 4 |
| Pictorial | A coin purse whose two clasp beads meet: it opens when you both agree | 5 5 4 4 2 |
| Letterform | The i's dot held in the K's open arms | 3 3 4 4 3 — built, read as "K." |
| Monogram | A small C held in the K's arms: kin holds the cart | 3 3 3 4 3 — too wide to sit near-square |
| Pictorial | The pull-along shopping trolley | 4 4 3 5 2 — reads as luggage |
| Pictorial | Two carts nested the way they line up at the store | 4 4 2 4 1 |
| Wordmark | The word rides on two wheels | 3 2 4 4 2 — too close to OpenCart |

Built: the first five. Shown: the first three.

Library check (`search_library.py --subject` cart, basket, letter k, check, tick, purse, wallet): OpenCart is a swoosh and two dots after the word, and Spree a cart with a smile; both use two dots for wheels, as A and B do. No purses or wallets at all. K marks are Kickstarter's rounded K and a K in a hexagon; none on wheels.
