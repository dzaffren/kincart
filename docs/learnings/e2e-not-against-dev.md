# Stop pnpm dev before running the e2e

**Learned:** 2026-10-13 · **From:** /spec find-and-explain

`playwright.config.ts` builds and starts the app, but with `reuseExistingServer` it uses whatever already answers on port 3000. A running `pnpm dev` adds Next.js's "Open Next.js Dev Tools" button to every page, so a check like `expect(page.getByRole("button")).toHaveText(["Paying…"])` sees two buttons and fails.

Wrong: `pnpm dev` left running for a preview, then `pnpm test:e2e`.

Right: stop the dev server first, so the e2e runs against its own production build.

To keep `pnpm dev` running, give the e2e its own server on another port. Next 16 builds into `.next` while dev uses `.next/dev`, so both can run. A throwaway config beside `playwright.config.ts`, deleted after the run, does it (/build households):

```ts
import base from "./playwright.config";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  ...base,
  use: { ...base.use, baseURL: "http://localhost:3100" },
  webServer: { ...base.webServer, command: "pnpm build && pnpm start -p 3100", port: 3100, reuseExistingServer: false },
});
```
