# Drive PayPal's sandbox approval page by role, with the labels it really shows

**Learned:** 2026-10-15 · **From:** /poc link-paypal-onboarding

The vault approval page's last button is "Save and Continue", not "Agree and Continue". PayPal picks the page language from the IP, not the browser locale: from Malaysia, Chromium got Malay ("Seterusnya", "Simpan dan Teruskan") even with `locale: "en-US"`. Firefox got the newer email-first sign-in at `/pay`, and a value set with `fill()` on its password field was lost.

Wrong: wait for "Agree and Continue", or use `#btnNext` and `#btnLogin`.

Right: match buttons by role with both languages, `/^(next|seterusnya)$/i`. Type the password with `pressSequentially()` after the field shows, and submit it with Enter.
