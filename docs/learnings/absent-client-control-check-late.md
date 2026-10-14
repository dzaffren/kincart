# Check a client-only control is absent only after it would have shown

**Learned:** 2026-10-15 · **From:** /build demo-home

`NotifyControl` renders nothing until its effect resolves. So `expect(...getByText("Notifications")).toHaveCount(0)` right after the page loads passes even when the control is about to show.

Wrong: check for the missing control as soon as the heading shows.

Right: check after the page has been open for some seconds, such as after the receipt. The check then fails when the control is there.
