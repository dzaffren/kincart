# Building with this design system

Seven components ship on `window.ShopTogether`: `Button`, `Notice`, `Summary`, `ReceiptCard`, `ItemPicker`, `ListingPicker` and `PhoneFrame`. Use them whenever one fits. Build anything else in plain JSX with the classes and tokens below. Never hard-code a colour, size, radius, duration or font.

## Setup

Load `styles.css`. It imports `_ds_bundle.css`, which pulls Atkinson Hyperlegible Next from Google Fonts and holds every token, the base `body` rules, the focus ring and the component classes. Without it nothing is styled.

Put each screen in `<main className="screen">`. It makes the 480px phone column with 24px side padding, spaces its children, styles the `h1`, and zeroes `p` margins. `Summary`, `Notice` and `ReceiptCard` are built from `<p>` elements and look wrong outside it.

Light and dark follow the device through `prefers-color-scheme`. There is no provider and no theme class. Under `prefers-reduced-motion`, all animation stops.

## Classes

| Class | Use |
|---|---|
| `screen`, `stack`, `heading` | screen column; a 16px-gap group (a form, a pair of buttons); an `h1` or label with the line under it, 8px apart |
| `lead`, `small`, `amount` | muted intro line; 16px muted text; the big tabular money figure |
| `field-label`, `field-input`, `field-error` | a text box's label, the box (`aria-invalid="true"` turns its edge red), the red line under it |
| `money-input` | wraps a `field-input` with a leading `<span>$</span>` |
| `button button-primary`, `button button-secondary` | a link that looks like `Button`, e.g. `<a className="button button-secondary">` |
| `link` | a quiet text link with a 48px tap height |

## Rules

- One primary `Button` per screen: the next step. Everything else is `kind="secondary"`.
- Green (`--color-success`) only means paid. Red (`--color-danger`) only means a real failure. A helper's "no" is `<Notice tone="neutral">`.
- Nothing smaller than `--type-small` (16px). Nothing tappable under `--target-min` (48px).
- Wide screens use two media queries: `(min-width: 880px) and (min-height: 480px)` shows two `PhoneFrame`s, and `(min-width: 1280px) and (min-height: 480px)` moves the text beside them. CSS can't read a variable there, so copy these values.

## Tokens

| Family | Names | Use |
|---|---|---|
| Surface and text | `--color-bg`, `--color-surface`, `--color-sunken`, `--color-text`, `--color-muted`, `--color-line`, `--color-control` | page; cards and inputs; behind the amount, a helper's "no"; text; secondary text; dividers; edges of inputs and tappable cards |
| Accent | `--color-accent`, `--color-accent-press`, `--color-on-accent`, `--color-accent-soft`, `--color-accent-text` | the one primary button; its pressed state; text on it; the option you picked; text on accent-soft and quiet buttons |
| Status | `--color-success` + `--color-success-soft`, `--color-wait` + `--color-wait-soft`, `--color-danger` + `--color-danger-soft` | paid or approved; waiting for the helper; real failures only. Text colour on its `-soft` background. |
| Type | `--type-amount`, `--type-heading`, `--type-title`, `--type-body`, `--type-button`, `--type-small`, `--type-code` | font shorthands: write `font: var(--type-title)`, never `font-size`. One heading per screen. `--type-small` is the smallest text allowed. |
| Space | `--space-1` `-2` `-3` `-4` `-6` `-8` `-12` `-16` | 4, 8, 12, 16, 24, 32, 48, 64px. There is no `-5`, `-7` or `-10`. |
| Layout | `--page-max`, `--page-inline`, `--control-height`, `--target-min`, `--frame-width`, `--frame-height` | 480px phone column; 24px side padding; 56px buttons and inputs; 48px smallest tap target; the 390 × 844 phone frame |
| Shape | `--radius-control`, `--radius-surface`, `--border-width`, `--border-selected`, `--focus-ring-width`, `--focus-ring-offset`, `--shadow-overlay`, `--scrim` | controls; cards; 1px edges; 2px selected edge; focus ring; modals and their backdrop |
| Motion | `--motion-fast`, `--motion-base`, `--motion-slow`, `--motion-loading`, `--ease-out`, `--ease-in` | press; tint fade; banner, toast, modal; one spinner turn. Animate only `transform` and `opacity`. |

A selected option is `border: var(--border-selected) solid var(--color-accent)` on `var(--color-accent-soft)`.

## Where the truth lives

- `components/general/<Name>/<Name>.prompt.md` and `<Name>.d.ts`: each component's props and worked examples. Read them before using one.
- `_ds_bundle.css`: the exact token values, light and dark, and every class above.
- `guidelines/colors.html`, `guidelines/typography.html`, `guidelines/spacing.html`, `guidelines/motion.html`: each foundation drawn with its intended use.

## Example

```jsx
const { Button, Summary } = window.ShopTogether;

export default function Approve() {
  return (
    <main className="screen">
      <div className="heading">
        <h1>Rose would like this</h1>
        <p className="small">She asked at 10:15 AM.</p>
      </div>
      <Summary
        title="Adjustable Wide Slippers with Hook-and-Loop Strap"
        cents={3250}
        note="From amazon.com. Paid from Rose's PayPal if you say OK."
      />
      <form className="stack">
        <Button type="submit" name="answer" value="ok">OK, pay $32.50</Button>
        <Button type="submit" name="answer" value="no" kind="secondary">No</Button>
      </form>
    </main>
  );
}
```
