# Leave Haiku room to think, even at low effort

**Learned:** 2026-10-14 · **From:** /ship basket

`output_config.effort: "low"` does not turn thinking off. Now and then Haiku 5.5 thinks before a structured answer, and the thinking counts toward `max_tokens`. The pick call used about 360 output tokens without thinking and 560 to 710 with it, so a 1000 cap was sometimes cut off (4 of 18 runs thought) and `find` came back "nothing found" with `reason=anthropic max_tokens`. It passed locally and in the PR, then failed on main.

Wrong: sizing `max_tokens` from the answer alone, or reading one green e2e run as proof.

Right: size it from the largest output seen over a dozen runs, thinking included, with room to spare (4000 for the pick, 2000 for the split). When `reason=anthropic max_tokens` shows up in a log, check `usage.output_tokens` and whether a `thinking` block came back.
