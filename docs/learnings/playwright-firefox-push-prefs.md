# Turn both push prefs back on in Playwright's Firefox

**Learned:** 2026-10-14 · **From:** /build ping-helper

Playwright's Firefox ships a `playwright.cfg` that turns its push service off twice: `dom.push.serverURL` is empty and `dom.push.connection.enabled` is false. Setting only the server URL, as the O5 spike's answer said, still fails `pushManager.subscribe` with "Error retrieving push subscription", even in a persistent profile.

Wrong: `firefoxUserPrefs: { "dom.push.serverURL": "wss://push.services.mozilla.com/" }`

Right: `firefoxUserPrefs: { "dom.push.serverURL": "wss://push.services.mozilla.com/", "dom.push.connection.enabled": true }` on `firefox.launchPersistentContext`.
