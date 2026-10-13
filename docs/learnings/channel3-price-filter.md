# Channel3's price filter returns near-misses, never nothing

**Learned:** 2026-10-13 · **From:** /poc for find-and-explain

`filters.price.max_price` keeps every result under the price, but it never comes back empty. "Tablet for video calls" under $30 returned tablet cases and sleeves, not tablets.

Wrong: treat an empty filtered search as "nothing under the limit".

Right: run the same search without the filter at the same time, and let the AI say whether the real thing only exists above the limit.
