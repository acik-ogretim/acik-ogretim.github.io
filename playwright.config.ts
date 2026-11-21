import { defineConfig, devices } from '@playwright/test';

// E2E_PORT lets a second dev server run beside the usual 4321 (another session may own it).
// PW_CHROMIUM_PATH points at a local Chromium when the bundled one for this Playwright version is missing.
const port = Number(process.env.E2E_PORT ?? 4321);
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;
const CALISMA = /calisma-durumu\.spec\.ts/;

export default defineConfig({
  testDir: './tests/e2e',
  // Traces and failure pages stay out of the repository
  outputDir: process.env.E2E_CIKTI ?? `${process.env.TMPDIR ?? '/tmp'}/acik-ogretim-e2e-sonuc`,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // html reports with traces grow quickly; locally a list is enough
  reporter: process.env.CI ? 'html' : 'list',
  timeout: 60000, // Increased timeout to 60 seconds
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
    launchOptions: { executablePath },
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: CALISMA,
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } },
    },
    // Study state scenarios (resume, answers, clearing, order): phone and desktop
    {
      name: 'calisma-telefon',
      testMatch: CALISMA,
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, launchOptions: { executablePath } },
    },
    {
      name: 'calisma-masaustu',
      testMatch: CALISMA,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, launchOptions: { executablePath } },
    },
  ],
  webServer: {
    command: `npx astro dev --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // Shows the Google sync section so scenario 9 can drive it against a mocked Google
    env: { PUBLIC_GOOGLE_CLIENT_ID: process.env.PUBLIC_GOOGLE_CLIENT_ID ?? 'e2e-sahte-istemci' },
  },
});
