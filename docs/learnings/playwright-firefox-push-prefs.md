# Set three prefs for push in Playwright's Firefox

**Learned:** 2026-10-14 · **From:** /build ping-helper

Playwright's Firefox ships a `playwright.cfg` that turns its push service off twice: `dom.push.serverURL` is empty and `dom.push.connection.enabled` is false. Setting only the server URL, as the O5 spike's answer said, still fails `pushManager.subscribe` with "Error retrieving push subscription", even in a persistent profile.

Wrong: `firefoxUserPrefs: { "dom.push.serverURL": "wss://push.services.mozilla.com/" }`

On a machine with no desktop session bus, like a GitHub runner, the push then arrives but never shows: Firefox hands notifications to the desktop's notification service, finds none, and `getNotifications()` stays empty. The server logs `sent=1` while the test times out. It passes on a workstation, so reproduce it with `env -u DISPLAY -u DBUS_SESSION_BUS_ADDRESS -u XDG_RUNTIME_DIR`. `alerts.useSystemBackend: false` makes Firefox show them itself.

Right: `firefoxUserPrefs: { "dom.push.serverURL": "wss://push.services.mozilla.com/", "dom.push.connection.enabled": true, "alerts.useSystemBackend": false }` on `firefox.launchPersistentContext`.
