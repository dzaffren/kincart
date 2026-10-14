# design-sync notes

- Run from `docs/design/design-system/`. The app isn't a built package, so the converter bundles `.design-sync/entry.ts`: it imports `styles.css`, `app/(shop)/shop.css` and `font.css`, and re-exports the components. Build with `--node-modules ../../../node_modules --entry .design-sync/entry.ts`.
- No `.d.ts` ships, so every component's props are hand-written in `cfg.dtsPropsFor`. Change a component's props in `app/(shop)/` and you must update its entry there too.
- New reusable component in `app/(shop)/`: export it from `entry.ts`, add it to `componentSrcMap` and `dtsPropsFor`, and write `.design-sync/previews/<Name>.tsx`. Screens (`RoseView`, `SamView`, `BrokenLinkView`) and helpers (`LocalTime`, `Refresher`) stay out.
- `font.css` defines `--font-atkinson`. In the app, `next/font` sets it on `<html>`; without it `shop.css`'s `--font-sans` is invalid and every design falls back to the browser's serif.
- Previews wrap each component in `<div className="screen">`. `Summary`, `Notice` and `ReceiptCard` are `<p>` elements, and `.screen p` zeroes their margins.
- `overrides/docs.mjs` is a fork: `guidelinesGlob` also copies the `.html` foundation pages and flattens them to `guidelines/<name>.html`, because they link `../styles.css`.
- Playwright `1.64.0` in `.ds-sync/` matches the repo pin and the cached `chromium-1248`.

## Known render warns

- `ListingPicker` review captures crop at the 700px capture window. The full card in `_screenshots/general__ListingPicker.png` shows every listing and the error line.

## Re-sync risks

- `dtsPropsFor` is hand-copied from `app/(shop)/Button.tsx` and `ui.tsx`. Nothing checks it against the source.
- `font.css` copies what `next/font` does in `app/layout.tsx`. If the app changes font or variable name, change it too.
- The font loads from Google Fonts at runtime. If that's blocked, designs fall back to `system-ui`.
- Previews copy listing and item data from `app/(shop)/preview/find-and-explain/page.tsx` and `lib/shop/items.ts`. They can drift from the app's real wording.
