import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'off',
    // Hosted demo behind the password gate: set E2E_GATE_USER / E2E_GATE_PASSWORD.
    httpCredentials: process.env.E2E_GATE_PASSWORD ? { username: process.env.E2E_GATE_USER || 'nexcust', password: process.env.E2E_GATE_PASSWORD } : undefined,
    // Optional: point at a pre-installed Chromium (CI images / sandboxes) instead of `playwright install`.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
});
