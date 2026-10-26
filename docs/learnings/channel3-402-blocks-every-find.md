# Read the find log's reason before debugging a failed Find e2e

**Learned:** 2026-10-23 · **From:** /build sam-finds-another

When Channel3's searches run out, it answers `402`. Find then logs `find outcome=nothing-found ... reason=channel3 402`, and Rose's page shows "Couldn't find that." Every e2e that waits for "Which one would you like?" times out at its first Find, also on code that the branch didn't change.

Wrong: reading the timeout as a bug in the new code, or as a slow Haiku call.

Right: run the e2e with the server's log lines in view, and grep `[WebServer] find`. A `reason=channel3 402` is a blocker (the quota or credit), not a code fault.

**Updated:** 2026-10-26 by /build sam-finds-another. `.env.local` keeps spare keys as `CHANNEL3_API_KEY_II` and `_III`, but the code reads only `CHANNEL3_API_KEY`. Check each key with one `curl` to `/v1/search` and print only the status. Then run the e2e with `CHANNEL3_API_KEY` exported from a key that answers `200`. Next reads the shell's value before `.env.local`.
