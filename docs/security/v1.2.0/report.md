# Pentest v1.2.0

**Result:** pass
**Mode:** live · 127.0.0.1:3100
**Range:** v1.1.0..5fcaee9 (4 commits)
**Date:** 2026-10-16

The live target was a production build of 5fcaee9 on a local Postgres. The run started a second household with Try KinCart, sent every check to it, and then deleted it. No request reached PayPal, and household 1 was not changed.

## Findings

| ID | Severity | Category | Where | Description |
| -- | -------- | -------- | ----- | ----------- |

## Assessed

- A01:2025 Broken Access Control — Sam's link on Rose's page, on the PayPal return route, and on the Find and Skip actions; Rose's link on Sam's page; an empty link and a made-up link
- A02:2025 Security Misconfiguration — .env.example, ci.yml, next.config.ts; the preview routes return 404 in production; the demo login on Rose's screen is a separate sandbox buyer, shown by design (D59, D62)
- A03:2025 Software Supply Chain Failures — no change to package.json or pnpm-lock.yaml in the range
- A05:2025 Injection — SQL in requests.ts, all parameterised; static SQL in migrations 0009 and 0010; the photo prompt to Haiku, which has no tools and answers in a fixed JSON shape; no shell, eval, file write or path from input
- A06:2025 Insecure Design — Skip copies household 1's saved PayPal, as a new household did before the range; the forwarded host changes only the requester's own PayPal return address
- A08:2025 Software or Data Integrity Failures — ci.yml adds two env values, with no untrusted trigger
- A09:2025 Security Logging and Alerting Failures — the PayPal link failure log moved to paypalLink.ts and was not lost
- A10:2025 Mishandling of Exceptional Conditions — the Link PayPal, return route and Find error paths all fail closed

## Not assessed

- A01:2025 Broken Access Control — Sam's link on Sam's answer to household 1's ask, and on POST /r/<token>/link, were not sent live: the first would change household 1's ask, and the second would call PayPal's vault. The code checks the household and the person first
- A04:2025 Cryptographic Failures — the range changed no link, hash or crypto code
- A07:2025 Authentication Failures — the app has no login, logout, password or reset flow
