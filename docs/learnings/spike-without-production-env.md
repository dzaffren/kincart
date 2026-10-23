# Spike on the recorded set when the production env can't be pulled

**Learned:** 2026-10-23 · **From:** /spec ask-again (/poc O12)

`npx vercel env pull --environment=production` was blocked in auto mode as credential handling, so a spike couldn't read live Neon. The recorded set in `lib/shop/picks/asks.json` holds real Channel3 results with ids and titles from Oct 22, and it answered the question with a one-day gap.

Wrong: asking for live Neon first, or working round the block.

Right: run the spike on the recorded set and say how big the gap is. If the user wants live data, they run `! npx vercel env pull <file> --environment=production` themselves.
