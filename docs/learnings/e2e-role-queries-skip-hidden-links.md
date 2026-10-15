# Read a wide home page's links from the phone captions, not Be Rose

**Learned:** 2026-10-15 · **From:** /build link-paypal-onboarding

At 1280px the home page hides its Be Rose and Be Sam buttons and shows the two phones. `getByRole` leaves out hidden elements, so `getByRole("link", { name: "Be Rose" }).getAttribute("href")` waited out the 30 s test timeout.

Wrong: read Rose's link from Be Rose in a laptop-sized test.

Right: read it from the caption link above the phone, `getByRole("link", { name: "Open Rose's page" })`, which shows from 880px.
