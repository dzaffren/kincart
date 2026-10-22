# Save the demo buyer's PayPal to see a charge in its activity

**Learned:** 2026-10-22 · **From:** /build itemized-receipt

`PAYPAL_E2E_VAULT_ID` belongs to another sandbox personal account, not the one in `PAYPAL_DEMO_EMAIL`. So the e2e's charges never show in the demo buyer's activity, and nobody has that account's password. PayPal names the sandbox business account "Test Store" in a payer's activity.

Wrong: run the e2e, then sign in as the demo buyer to look at the payment.

Right: in a throwaway script, make a setup token, approve it in Playwright as the demo buyer ("Save and Continue"), turn it into a payment token, and charge that. Then sign in again at `/signin`, because the approval session doesn't carry over, and open `/myaccount/activities/`.
