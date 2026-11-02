# Give each e2e page its own virtual authenticator for passkeys

**Learned:** 2026-10-26 · **From:** /build confirm-ok

Playwright's Chromium has no passkey device of its own. `WebAuthn.enable` and `WebAuthn.addVirtualAuthenticator` over a CDP session give one page a device that matches a face or fingerprint at once (`isUserVerified: true`, `automaticPresenceSimulation: true`). The device belongs to that page only, so a new page in the same context has none.

Wrong: expecting a second page to share Sam's passkey.

Right: add the device to each page that asks for a passkey. A device with no passkey saved stands in for a laptop with only Sam's link, and it refuses at once.
