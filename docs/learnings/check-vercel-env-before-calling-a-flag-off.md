# Check Vercel's env before calling a flag off

**Learned:** 2026-10-14 · **From:** /ship ping-helper

A flag that defaults off in code can already be on in production. The three VAPID variables were set on Vercel Production for the O1 spike, so merging ping-helper turned notifications on at deploy, while the PR said they would stay off until someone set them.

Wrong: reading `.env.example` and saying the slice ships dark.

Right: `pnpm dlx vercel env ls production` lists the variable names, never the values. Check it before the merge question, and say plainly whether the merge turns the feature on.
