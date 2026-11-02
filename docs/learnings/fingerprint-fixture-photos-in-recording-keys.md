# Fingerprint fixture photos in a recording's key

**Rule:** When a fake server matches recorded calls by their text, keep a fingerprint of any photo the test itself sends from a fixed file. Leave out only photos that come from outside.

**Why:** Two photo Finds with no words send the same text once photo bytes are removed. The blank-wall test replayed the written-list test's reply and showed 4 things. Found on 2026-11-02 at /build ci-without-channel3.

**How to apply:** In `scripts/fake-apis.mjs`, an image after a `Photo n:` label keeps a SHA-256 of its bytes. A new kind of photo call needs the same check.
