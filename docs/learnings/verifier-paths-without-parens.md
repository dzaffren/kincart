# Give verifiers a git diff of app/, not a path with parentheses or ?

**Learned:** 2026-10-15 · **From:** /review demo-home · **Updated:** 2026-10-16 by /review photo-ask-several

The `finding-verifier` agent's Bash hook blocks parentheses in a command. So `git diff <base>...HEAD -- "app/(shop)/HomeView.tsx"` fails there, and three verifiers judged from the current file only. In photo-ask-several's review, the hook also blocked the `?` wildcard in `'app/?shop?/PhotoPicker.tsx'`.

Wrong: name a route-group file in a command the verifier must run, as `app/(shop)/HomeView.tsx` or `'app/?shop?/HomeView.tsx'`.

Right: tell the verifier to run `git diff <base>...HEAD -- app` for the change, and to read the current file with the Read tool.
