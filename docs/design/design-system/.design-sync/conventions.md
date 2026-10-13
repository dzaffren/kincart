# Building with this design system

There is no component library here, only tokens. Build every control yourself in plain JSX/HTML and style it with the CSS custom properties below. Never hard-code a colour, size, radius, duration or font.

## Setup

Load `styles.css`. It pulls Atkinson Hyperlegible Next from Google Fonts, imports every file in `tokens/`, sets the page background, text colour and 18px body font on `body`, and draws the focus ring on `:focus-visible`. Without it nothing is styled.

Light and dark follow the device through `prefers-color-scheme`. There is no theme class or provider; just use the tokens and both modes work. Under `prefers-reduced-motion`, `styles.css` stops all animation and the motion tokens drop to 0ms.

## Tokens

| Family | Names | Use |
|---|---|---|
| Surface and text | `--color-bg`, `--color-surface`, `--color-sunken`, `--color-text`, `--color-muted`, `--color-line`, `--color-control` | page; cards and inputs; behind the amount, a helper's "no"; text; secondary text; dividers; edges of inputs and tappable cards |
| Accent | `--color-accent`, `--color-accent-press`, `--color-on-accent`, `--color-accent-soft`, `--color-accent-text` | the one primary button; its pressed state; text on it; the option you picked; text on accent-soft and quiet buttons |
| Status | `--color-success` + `--color-success-soft`, `--color-wait` + `--color-wait-soft`, `--color-danger` + `--color-danger-soft` | paid or approved; waiting for the helper; real failures only. Text colour on its `-soft` background. |
| Type | `--type-amount`, `--type-heading`, `--type-title`, `--type-body`, `--type-button`, `--type-small`, `--type-code` | font shorthands: write `font: var(--type-title)`, never `font-size`. One heading per screen. `--type-small` is the smallest text allowed. |
| Space | `--space-1` `-2` `-3` `-4` `-6` `-8` `-12` `-16` | 4, 8, 12, 16, 24, 32, 48, 64px. There is no `-5`, `-7` or `-10`. |
| Layout | `--page-max`, `--page-inline`, `--control-height`, `--target-min` | 480px phone column; 24px side padding; 56px buttons and inputs; 48px smallest tap target |
| Shape | `--radius-control`, `--radius-surface`, `--border-width`, `--border-selected`, `--focus-ring-width`, `--focus-ring-offset`, `--shadow-overlay`, `--scrim` | controls; cards; 1px edges; 2px selected edge; focus ring; modals and their backdrop |
| Motion | `--motion-fast`, `--motion-base`, `--motion-slow`, `--motion-loading`, `--ease-out`, `--ease-in` | press; tint fade; banner, toast, modal; one spinner turn. Animate only `transform` and `opacity`. |

A selected option is `border: var(--border-selected) solid var(--color-accent)` on `var(--color-accent-soft)`.

## Where the truth lives

- `styles.css` and `tokens/*.css`: the exact values, light and dark.
- `guidelines/colors.html`, `guidelines/typography.html`, `guidelines/spacing.html`, `guidelines/motion.html`: each foundation drawn with its intended use. Read them before styling a screen.

## Example

```jsx
const css = `
  .screen { max-width: var(--page-max); margin: 0 auto; padding: var(--space-8) var(--page-inline); display: grid; gap: var(--space-4); }
  .screen h1 { font: var(--type-heading); margin: 0; }
  .amount { font: var(--type-amount); font-variant-numeric: tabular-nums; margin: 0; padding: var(--space-4); background: var(--color-sunken); border-radius: var(--radius-surface); }
  .primary { height: var(--control-height); border: 0; border-radius: var(--radius-control); background: var(--color-accent); color: var(--color-on-accent); font: var(--type-button); transition: transform var(--motion-fast) var(--ease-out); }
  .primary:active { transform: scale(0.98); background: var(--color-accent-press); }
`;

export default function Approve() {
  return (
    <main className="screen">
      <style>{css}</style>
      <h1>Mary wants a kettle</h1>
      <p className="amount">$29.99</p>
      <button type="button" className="primary">OK, pay $29.99</button>
    </main>
  );
}
```

