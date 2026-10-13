# Make PayPal-Request-Id unique across databases, not just within one

**Learned:** 2026-10-13 · **From:** /review approve-and-pay

PayPal remembers a `PayPal-Request-Id` for hours and answers a repeat with the first order, even when the body is different. CI's fresh Postgres, the local one after a migrate down and up, and Neon all start request IDs at 1, and they share one sandbox app. So `purchase-4` on a fake saved PayPal came back `COMPLETED` with an $18.99 order made 70 minutes earlier, and the $12.50 request was recorded paid.

Wrong: `"PayPal-Request-Id": \`purchase-${request.id}\``

Right: `"PayPal-Request-Id": \`purchase-${request.id}-${request.askedAt.getTime()}\``, which is the same on every retry of one request and different for a new request that reuses the number.
