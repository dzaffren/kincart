# Pentest v1.1.0

**Result:** pass
**Mode:** live · 127.0.0.1:3100
**Range:** v1.0.0..e0ae4d2 (2 commits)
**Date:** 2026-10-15

The live target was a production build of e0ae4d2 on a local Postgres. Household 1 held one open ask, with a note and a photo, that the run created and then deleted.

## Findings

| ID | Severity | Category | Where | Description |
| -- | -------- | -------- | ----- | ----------- |

## Assessed

- A01:2025 Broken Access Control — Rose's link on Sam's page and Sam's link on Rose's page; a new household's Sam page while household 1 had an open ask; no new data route in the range
- A02:2025 Security Misconfiguration — no config, manifest or CI file changed in the range; the new preview route returns 404 in production
- A03:2025 Software Supply Chain Failures — no change to package.json or pnpm-lock.yaml in the range
- A05:2025 Injection — the ask's insert with the new note and photo values; the note and photo as rendered on Sam's page; no shell or eval in shipped code
- A06:2025 Insecure Design — the note and photo come from the server's saved search, never from the form
- A07:2025 Authentication Failures — a made-up link on Sam's page and on Rose's page

## Not assessed

- A04:2025 Cryptographic Failures — the range changed no link, hash or crypto code
- A08:2025 Software or Data Integrity Failures — no deserialisation of untrusted data, update path or CI change in the range
- A09:2025 Security Logging and Alerting Failures — no auth or security log line changed in the range
- A10:2025 Mishandling of Exceptional Conditions — the range added no error handling
