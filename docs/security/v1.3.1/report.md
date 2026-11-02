# Pentest v1.3.1

**Result:** pass
**Mode:** live · 127.0.0.1:3100
**Range:** v1.3.0..16a1782 (1 commit)
**Date:** 2026-11-02

The live target was a production build of 16a1782 on a local Postgres. The run started two households with Try KinCart, sent every check to them, and then deleted them. No request reached PayPal, Claude or Channel3, and household 1 was not changed.

## Findings

| ID | Severity | Category | Where | Description |
| -- | -------- | -------- | ----- | ----------- |

## Assessed

- A01:2025 Broken Access Control — live: Sam's passkey actions with Rose's link return nothing; an action name outside on, off, ok and links is refused; one household's challenge, signed by the same key, is refused by another household
- A02:2025 Security Misconfiguration — no config, header, CI or manifest file changed in the range
- A03:2025 Software Supply Chain Failures — package.json and pnpm-lock.yaml are unchanged
- A04:2025 Cryptographic Failures — challenges still come from @simplewebauthn/server; the counter pinned at 0 is unchanged
- A05:2025 Injection — the two new queries and migration 0017 are static or parameterised
- A06:2025 Insecure Design — the challenge moved from a client cookie to a server row, bound to household and action
- A07:2025 Authentication Failures — live: v1.3.0's P1 replay of a used Turn off answer, with its challenge as the cookie, is refused; an answer asked for OK can't turn the passkey off; an answer 5 minutes 19 seconds after its challenge is refused
- A08:2025 Software or Data Integrity Failures — no deserialisation beyond JSON.parse, and no CI or release path changed
- A09:2025 Security Logging and Alerting Failures — the refused log lines for on, off, ok and links are all still there
- A10:2025 Mishandling of Exceptional Conditions — the passkey checks return nothing on a throw; a database error in the spend aborts the action

## Not assessed

- A07:2025 Authentication Failures — a replay through OK and through Make new links was not sent live. Both call the same check as Turn off, which was
- A03:2025 Software Supply Chain Failures (advisories) — no advisory lookup was run
