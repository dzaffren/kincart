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
  webServer: {
    command: "pnpm build && pnpm start",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // The server's log lines (push to=…, purchase id=…) show in CI's output when a test fails.
    stdout: "pipe",
  },
});
