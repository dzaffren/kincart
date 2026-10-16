# Match env names with digits before calling a key missing

**Learned:** 2026-10-16 · **From:** /spec continue photo-ask-several

The build listed `.env.local`'s names with `grep -o '^[A-Z_]*='`. That pattern skips `CHANNEL3_API_KEY` and `PAYPAL_E2E_VAULT_ID`, so the build called both missing, ran e2e test 1 with a placeholder key, and left the spec at Draft on an Open row. Both keys were there, and the test passed with them.

Wrong: `grep -o '^[A-Z_]*=' .env.local`.

Right: `grep -o '^[A-Z0-9_]*=' .env.local`, and check that a key has a value by its length only, never by printing it.
