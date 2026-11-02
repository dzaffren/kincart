# Replay a passkey answer on the same passkey, and run the test on the old code

**Learned:** 2026-11-02 · **From:** /build passkey-one-time-challenge

A Turn on in Chrome's virtual authenticator makes a new passkey each time. An answer recorded before a second Turn on then fails for the wrong key, so a replay test built that way passes on the code it should catch.

Wrong: record Turn off, turn the passkey on again, send the recording, and trust the refusal.

Right: replay an action that keeps the passkey, such as Make new links, sent to Sam's new link with its challenge as the cookie. Then check out the code from before the fix (`git checkout <base> -- <app files>`), run the e2e, and watch it fail, before trusting it on the fix.
