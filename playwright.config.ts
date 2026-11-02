import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  // The approve-and-pay and find-and-explain specs reset the same tables, so they can't run side by side.
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
  },
  projects: [
    {
      name: "phone",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: [
    // Channel3 and Claude answer from e2e/recordings/, so a run spends no credits (D127).
    // pnpm test:e2e:record fills in what's missing with real calls.
    {
      command: "node scripts/fake-apis.mjs",
      port: 3999,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm build && pnpm start",
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      // The server's log lines (push to=…, purchase id=…) show in CI's output when a test fails.
      stdout: "pipe",
      env: {
        CHANNEL3_URL: "http://localhost:3999",
        ANTHROPIC_URL: "http://localhost:3999",
        CHANNEL3_API_KEY: "recorded",
        ANTHROPIC_API_KEY: "recorded",
      },
    },
  ],
});
