import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
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
    url: "http://localhost:3000/status",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
