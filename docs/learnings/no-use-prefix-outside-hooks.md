# Don't start a non-hook function's name with "use"

**Learned:** 2026-10-19 · **From:** /build find-limits

The repo's ESLint runs `react-hooks/rules-of-hooks`, which reads any function named `use...` as a React hook. A storage function called `useAddress()` from a server action failed lint with `React Hook "useAddress" is called in function "find" that is neither a React function component nor a custom React Hook function`.

Wrong: `export async function useAddress(kind, address, most)` in `lib/shop/requests.ts`.

Right: a name without the prefix, such as `takeUse()`.
