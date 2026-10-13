# Shop-together design system

Tokens and foundation pages for Shop-together: an older shopper asks, a relative approves from their own phone. Every value is traced to a reason in [system-brief.md](../system-brief.md); D15 in `DECISIONS.md` records the direction.

- Atkinson Hyperlegible Next. Body text is 18px; nothing is smaller than 16px.
- One violet accent for the next step. Green only for "Paid". Red only for real failures; a helper's "no" is grey.
- Every text pair is 7:1 or better in light and dark; every control edge is 3:1 or better.
- 56px buttons and inputs, 48px smallest tap target, a 4px spacing scale.
- Only `transform` and `opacity` animate. Under reduced motion nothing moves.

Load `styles.css`; it imports everything in `tokens/`. The pages in `guidelines/` show each foundation.
