# Give verifiers app/?shop?/ paths, not app/(shop)/

**Learned:** 2026-10-15 · **From:** /review demo-home

The `finding-verifier` agent's Bash hook blocks parentheses in a command. So `git diff <base>...HEAD -- "app/(shop)/HomeView.tsx"` fails there, and three verifiers judged from the current file only.

Wrong: name a route-group file as `app/(shop)/HomeView.tsx` in a command the verifier must run.

Right: tell the verifier to use a git pathspec wildcard, `git diff <base>...HEAD -- 'app/?shop?/HomeView.tsx'`. Git matches `?` against the parentheses.
