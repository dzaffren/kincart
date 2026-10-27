# Branch the next slice from origin/main after a squash merge

**Learned:** 2026-10-26 · **From:** /build confirm-ok

/spec confirm-ok started on `feat/new-links`, which GitHub had already squash-merged as #29. Local `main` still stood three PRs back, so `git log main..` listed every new-links commit as unmerged.

Wrong: branching from local `main` or from the shipped slice's branch. The PR then carries the old slice's commits again.

Right: run `git fetch` first. Branch from `origin/main`, and cherry-pick any spec commits made on the old branch.
