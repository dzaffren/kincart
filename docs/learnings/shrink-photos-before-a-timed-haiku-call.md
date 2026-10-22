# Shrink listing photos before a Haiku call with a timeout

**Learned:** 2026-10-22 · **From:** /build picks-that-match

Channel3's photos run up to 2048 px, about 1,500 tokens each. Ten of them in the pick call made Haiku think for 1,000 or more tokens, and the call often ran past its 10 s timeout: a live Find of one thing took up to 15.3 s, and five-thing Finds lost groups. The stubbed unit tests and a recorded set run one ask at a time never showed it.

Wrong: plan the speed of a call with photos from one small sample photo.

Right: time live Finds with real photos at Channel3's real sizes. Shrink each photo to 512 px with `sharp` first. Thinking, not the photos, is then most of the call's time.
