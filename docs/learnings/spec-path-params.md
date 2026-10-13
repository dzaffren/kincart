# Write path parameters as <token> in specs, not {token}

**Learned:** 2026-10-13 · **From:** /ship approve-and-pay

The ship gate reads any `{word}` in a spec as a template blank nobody filled in, and fails. `/r/{token}` and `purchase-{id}` in the Changes table stopped the approve-and-pay ship until they were rewritten.

Wrong: `` redirects to `/r/{token}` ``

Right: `` redirects to `/r/<token>` ``
