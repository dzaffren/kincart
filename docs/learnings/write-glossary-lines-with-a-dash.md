# Write glossary lines with a dash, and list every term the spec uses

**Learned:** 2026-10-26 · **From:** /spec picks-that-match v2

zuko's spec gate checks that each term such as "e2e" has a `## Glossary` line. It finds a line written `- **e2e** — meaning`, and misses `- **e2e:** meaning`.

Wrong: a colon inside the bold, or leaving out a term because the user knows it.

Right: `- **Term** — meaning`, one line for each term, as the specs before it do.
