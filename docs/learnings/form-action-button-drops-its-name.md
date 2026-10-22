# Don't name a formAction button to send a value

**Learned:** 2026-10-22 · **From:** /build find-another

When the submit button has its own `formAction`, React builds the form data with `submitter = null` (`react-dom-client.development.js`, the submit handler). The button's `name` and `value` never reach the action. Server rendering also drops the `name`, with the warning "Cannot specify a "name" prop for a button that specifies a function as a formAction". `Button`'s busy check reads its own name from `useFormStatus().data`, so it finds nothing and no button spins.

Wrong: `<Button formAction={findAnother} name="another" value={String(index)}>` inside the Ask Sam form, as pause 2 of find-another drew it.

Right: a plain submit named `another` in the form, with the form's own action handing it on (`askSam()` calls `findAnother()` when `formData.has("another")`). Or bind the value into the action. `renderToStaticMarkup` shows the missing `name` in a unit test.
