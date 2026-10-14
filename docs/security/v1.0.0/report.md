# Pentest v1.0.0

**Result:** pass
**Mode:** live · 127.0.0.1:3100
**Range:** whole tree at 333919c (12 commits, 225 tracked files; no earlier tag)
**Date:** 2026-10-15

The live target was a production build of 333919c on a local Postgres, with the PayPal sandbox keys.

## Findings

| ID | Severity | Category | Where | Description |
| -- | -------- | -------- | ----- | ----------- |

## Assessed

- A01:2025 Broken Access Control — Rose's link on Sam's page and Sam's link on Rose's page; a cookie that mixes two households; Rose's link bound into Sam's total-limit action; one household's Sam declining another household's request; a server action posted from a null origin
- A02:2025 Security Misconfiguration — next.config.ts, .env.example, the CI workflow and its secrets, the preview routes
- A03:2025 Software Supply Chain Failures — pnpm-lock.yaml: 480 resolved packages, all from the npm registry; CI installs with --frozen-lockfile
- A04:2025 Cryptographic Failures — link generation, SHA-256 storage of links, constant-time comparison of household 1's links
- A05:2025 Injection — every SQL statement, the migration runner, and the two Claude Haiku calls
- A06:2025 Insecure Design — server-side prices, the total-limit check, basket line selection, one open ask per household
- A07:2025 Authentication Failures — empty, array and object links in action arguments; a link with one character changed; an unknown manifest link
- A08:2025 Software or Data Integrity Failures — JSON parsing of stored data, CI triggers
- A09:2025 Security Logging and Alerting Failures — all 16 log lines outside tests; none writes a link, key or personal data
- A10:2025 Mishandling of Exceptional Conditions — payment, PayPal linking, Find and Try KinCart error paths; malformed link arguments fail without a write

## Not assessed

- A01:2025 Broken Access Control — an Origin naming another host: the target guard allows no other host name, so only a null origin was sent
- A01:2025 Broken Access Control — a cross-household OK, because it would charge the PayPal sandbox
- A03:2025 Software Supply Chain Failures — advisory lookup for the 480 packages, which needs the network
- A06:2025 Insecure Design — every new household gets a copy of household 1's saved sandbox PayPal (D48, by design); proving a charge needs the network
- A07:2025 Authentication Failures — session after logout and reset-token reuse: there is no login, logout or reset flow
