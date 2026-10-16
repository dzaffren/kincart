# Check that a server action's redirect already clears a client control before writing reset code

**Learned:** 2026-10-16 · **From:** /build photo-ask-several

After Find's server action redirects back to `/r/<token>`, Rose's whole form mounts again: the `textarea` and the photo `input` came back as new DOM nodes, so `PhotoPicker`'s tiles were gone with no code to clear them. The plan had a `useFormStatus().pending` effect for it, which would have been dead code.

Wrong: building a reset effect because the plan says the state "would stay", then writing a test that passes without it.

Right: run the e2e step on the old code first. To see a remount, mark a node with `dataset.mark` in `page.evaluate()` before the action, and check the mark after it.
