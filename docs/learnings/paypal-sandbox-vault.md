# Tick "Save payment methods" on the PayPal sandbox app before calling the vault

**Learned:** 2026-10-13 · **From:** /poc approve-and-pay

The v3 vault answers `NOT_AUTHORIZED` until the app's "Save payment methods" box (Apps & Credentials → the app → Features) is ticked and saved. The access token then carries `vault/payment-tokens/readwrite` in its `scope`. PayPal hands back the same cached token until it expires (a repeat request showed `expires_in` 32195 of 32400), so get a fresh one after changing features.

Approving in a browser already logged in to PayPal sandbox signs the agreement as that account. Use a fresh private window and type the `@personal.example.com` email by hand.

Wrong: switch to Billing Agreements v1 because the vault says `NOT_AUTHORIZED`.

Right:

```
# after ticking the box, end the cached token and check the new one
curl -s -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" -d "token=$OLD&token_type_hint=ACCESS_TOKEN" \
  https://api-m.sandbox.paypal.com/v1/oauth2/token/terminate
curl -s -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" -d grant_type=client_credentials \
  https://api-m.sandbox.paypal.com/v1/oauth2/token   # scope must list vault/payment-tokens
```
