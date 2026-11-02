# Pentest v1.3.0

**Result:** pass
**Mode:** live · 127.0.0.1:3100
**Range:** v1.2.0..a051faf (16 commits)
**Date:** 2026-11-02

The live target was a production build of a051faf on a local Postgres. The run started a second household with Try KinCart, sent every check to it, and then deleted it. No request reached PayPal, Claude or Channel3, and household 1 was not changed.

## Findings

| ID | Severity | Category | Where | Description |
| -- | -------- | -------- | ----- | ----------- |
| P1 | low | A07:2025 Authentication Failures | app/(shop)/actions.ts:151 takeChallenge | confirmed() accepts a signed passkey answer a second time, because the challenge it checks against is whatever passkey_challenge cookie the caller sends |
| P2 | low | A03:2025 Software Supply Chain Failures | pnpm-lock.yaml (package.json:18) dependencies | the range adds @simplewebauthn/server 14.0.3 and its new transitive packages to the lockfile |
| P3 | low | A03:2025 Software Supply Chain Failures | pnpm-lock.yaml (package.json:17) dependencies | the range adds @simplewebauthn/browser 14.0.0 to the lockfile |
| P4 | low | A03:2025 Software Supply Chain Failures | pnpm-lock.yaml (package.json:19) dependencies | the range changes next from 16.4.0 to 16.4.1, with @next/env and every @next/swc-* binary |

## Assessed

- A01:2025 Broken Access Control — live: Rose's link on Sam's page and Sam's link on Rose's page return 404; Sam's passkey actions with Rose's link return nothing and set no cookie
- A02:2025 Security Misconfiguration — live: frame-ancestors 'self', X-Frame-Options SAMEORIGIN and Referrer-Policy same-origin on / and on Sam's page; code: .env.example, ci.yml, the preview routes' production gate
- A03:2025 Software Supply Chain Failures — the lockfile diff against v1.2.0 (P2 to P4)
- A04:2025 Cryptographic Failures — the HMAC of the network address; the passkey's stored counter, pinned at 0 (P1)
- A05:2025 Injection — SQL in requests.ts, usage.ts and migrations 0011 to 0016, all parameterised or static; listing text and photos reach Haiku, which has no tools
- A06:2025 Insecure Design — the new_rose cookie, the link swap, the passkey challenge in a client cookie (D124)
- A07:2025 Authentication Failures — live: Make new links stops the old pair at once and the new pair opens; a passkey answer used once is accepted again (P1)
- A08:2025 Software or Data Integrity Failures — ci.yml adds `branches: [main]` and two env values, with no untrusted trigger
- A09:2025 Security Logging and Alerting Failures — passkey on, off and refused, and links replaced, each write a log line
- A10:2025 Mishandling of Exceptional Conditions — the passkey checks fail closed; Try KinCart fails closed when its count fails

## Not assessed

- A01:2025 Broken Access Control — Sam's OK, and Ask Sam, Find, Link PayPal and Skip, were not sent live: they reach PayPal, Claude or Channel3. The code checks the household and the person first
- A07:2025 Authentication Failures — a passkey answer reused for another action, or after the cookie's 5 minutes, was not sent live
- A03:2025 Software Supply Chain Failures (advisories) — no advisory lookup was run
