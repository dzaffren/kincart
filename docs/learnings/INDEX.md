# Learnings

- Run local Postgres containers with --network host on this machine
- Set the framework and checks by hand when creating a Vercel project from the CLI
- Tick "Save payment methods" on the PayPal sandbox app before calling the vault
- Run next typegen after adding a route, before tsc
- Make PayPal-Request-Id unique across databases, not just within one
- Write path parameters as <token> in specs, not {token}
- Stop pnpm dev before running the e2e
- Channel3's price filter returns near-misses, never nothing
- Run Playwright with one worker when specs reset the same tables
- Pipe {} into zuko's Stop-hook scripts when running them by hand
- Set three prefs for push in Playwright's Firefox
- Lint the tracked files when pnpm lint fails on design caches
- Check Vercel's env before calling a flag off
- Build chunks one after another when their tests share the local database
- Leave Haiku room to think, even at low effort
- Put what a server action redirects back to at the top of the page
