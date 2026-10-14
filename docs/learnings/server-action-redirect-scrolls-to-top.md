# Put what a server action redirects back to at the top of the page

**Learned:** 2026-10-14 · **From:** /spec basket-cap

A server action that calls `redirect()` to the same page with a new query comes back scrolled to the top. Measured at 390×844: `scrollY` went from 2264 to 0 after Ask Sam, so "Pick at least one first." under basket's groups was off screen. Playwright's `toBeVisible()` passed anyway, because it doesn't care about scroll.

Wrong: an error line right above the submit button on a page taller than the screen, checked with `toBeVisible()`.

Right: a notice at the top of the page, checked with `toBeInViewport()` on a page tall enough to scroll.
