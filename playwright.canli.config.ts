// Live site checks (tests/e2e/*canli.spec.ts): no dev server, the pages come from CANLI_URL.
//   CANLI_URL=https://acik-ogretim.github.io npx playwright test -c playwright.canli.config.ts
// PW_CHROMIUM_PATH points at a local Chrome when the bundled Chromium is not installed.
import { defineConfig, devices } from '@playwright/test';

const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /canli\.spec\.ts/,
  outputDir: process.env.E2E_CIKTI ?? `${process.env.TMPDIR ?? '/tmp'}/acik-ogretim-e2e-canli`,
  reporter: 'list',
  timeout: 60000,
  use: { trace: 'off', launchOptions: { executablePath } },
  projects: [
    { name: 'telefon', use: { ...devices['Pixel 7'], launchOptions: { executablePath } } },
    { name: 'masaustu', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, launchOptions: { executablePath } } },
  ],
});
