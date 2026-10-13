# Run next typegen after adding a route, before tsc

**Learned:** 2026-10-13 · **From:** /build approve-and-pay

`PageProps<"/r/[token]">` and `RouteContext<"/r/[token]/linked">` come from types Next.js generates into `.next/types`. A new route isn't in them until `next dev`, `next build` or `next typegen` runs, so `tsc --noEmit` fails with `does not satisfy the constraint 'AppRoutes'` and `Cannot find name 'RouteContext'` even though the code is right.

Wrong: `npx tsc --noEmit -p .` straight after adding `app/(shop)/r/[token]/page.tsx`.

Right: `pnpm exec next typegen && npx tsc --noEmit -p .`
