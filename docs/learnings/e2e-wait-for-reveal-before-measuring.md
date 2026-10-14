# Wait for the page's animations to finish before measuring layout

**Learned:** 2026-10-15 · **From:** /ship demo-home

The home page's reveal moves the phones for about 880ms after load. A fast run gets past Try KinCart inside that time, so two `boundingBox()` reads in a row see the phones at two heights. CI failed one of its two runs on the same commit this way, 111.55 against 110.58.

Wrong: compare two `boundingBox()` results as soon as the content is visible.

Right: `await page.waitForFunction(() => document.getAnimations().every((a) => a.playState === "finished"))` first. To prove a layout check is sensitive to motion, slow the motion token in a throwaway test, such as `:root { --showcase-reveal: 4s; }` from `addInitScript`.
