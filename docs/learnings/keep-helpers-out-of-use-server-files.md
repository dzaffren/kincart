# Keep helpers out of a "use server" file

**Learned:** 2026-10-26 · **From:** /build new-links

Every export of a file that starts with `"use server"` becomes a server action, which any browser can call with its own arguments. `app/(shop)/actions.ts` is one, so a helper such as `origin()` must stay private there.

Wrong: exporting a helper from `actions.ts` so that a page can reuse it.

Right: move the helper to a plain module, such as `app/(shop)/origin.ts`, and import it from both.
