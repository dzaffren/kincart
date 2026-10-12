# Decisions

Append-only. A changed decision is a new entry that supersedes the old one; only an
old entry's Status line ever changes.

## D1 · 2026-10-12 · Web page on a phone, no native app

Why: 22-44 hours in total; the helper only needs to open a link and tap OK, which a phone browser does.
Rejected: native phone app (an app store build or Expo setup eats a large share of the hours).
Source: docs/specs/shop-together/shape.md
Status: active

## D2 · 2026-10-12 · Next.js + TypeScript for the whole app

Why: pages and server routes live in one app; PayPal (@paypal/paypal-server-sdk) and Channel3 (@channel3/sdk) both ship TypeScript packages; Node 24 is already installed.
Rejected: Python FastAPI + HTML templates (local python3 is 3.9, and the phone pages would be hand-written).
Source: docs/specs/skeleton.md
Status: active

## D3 · 2026-10-12 · Host on Vercel Hobby

Why: the demo must stay up for free through judging, Dec 1-15; Vercel deploys Next.js from GitHub and does not sleep.
Rejected: Render free (sleeps after 15 minutes idle, so a judge's first visit waits 30-60 s), not hosted (fewer judges will clone and run it).
Source: docs/specs/skeleton.md
Status: active

## D4 · 2026-10-12 · Neon Postgres, free tier

Why: Vercel functions keep no state between requests; Neon free has no expiry, 0.5 GB and 100 compute-hours a month.
Rejected: Render Postgres free (deleted 30 days after creation, before judging), Supabase free (limits unchecked; its auth and storage aren't needed).
Source: docs/specs/skeleton.md
Status: active

## D5 · 2026-10-12 · GitHub Actions gates every deploy

Why: the repo must be public on GitHub anyway, and a red run must keep a broken build off the live demo.
Rejected: no CI (a broken merge goes straight to the live demo).
Source: docs/specs/skeleton.md
Status: active

## D6 · 2026-10-12 · Vitest for units, Playwright for e2e

Why: Playwright drives a phone-sized browser and two pages at once (relative and helper); Vitest gives precise failures for logic like money sums.
Rejected: Playwright only (slower, and vaguer failures for pure logic).
Source: docs/specs/skeleton.md
Status: active

## D7 · 2026-10-12 · pnpm as the package manager

Why: chosen by the user at spec pause 1; already installed here (9.0.0), with faster installs.
Rejected: npm (the suggested default; slower installs).
Source: docs/specs/skeleton.md
Status: active

## D8 · 2026-10-12 · MIT license

Why: the rules require an open-source license GitHub detects; MIT is short and permissive.
Rejected: Apache-2.0 (a longer file, and its patent grant isn't needed here).
Source: docs/specs/skeleton.md
Status: active

## D9 · 2026-10-12 · A status page is the skeleton's one screen

Why: one visit proves the deploy, Neon and the PayPal sandbox keys from the live host.
Rejected: a request box (slice 1 swaps it for a fixed list, and it never touches PayPal).
Source: docs/specs/skeleton.md
Status: active
