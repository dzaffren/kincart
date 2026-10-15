# Write the release commit as one line of -m flags

**Learned:** 2026-10-15 · **From:** /release 1.0.0

The guard that lets the release commit onto `main` accepts only a call that is exactly `git commit -m … -m …`. It refuses a `cd … &&` in front, and any newline inside a message.

Wrong: `cd <repo> && git commit -m "chore(release): v1.0.0" -m "<body wrapped over lines>"`

Right: run it from the repo, with one `-m` per body line: `git commit -m "chore(release): v1.0.0" -m "CHANGELOG.md: …" -m "package.json: …"`
