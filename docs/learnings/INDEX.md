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
