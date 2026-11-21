import { defineConfig, devices } from '@playwright/test';

// Offline scenarios run against a built preview (the service worker exists only in builds), served by
// tests/e2e/cevrimdisi-sunucu.mjs like GitHub Pages. Build first, for example:
//   ONIZLEME_BOLUMLERI="auzef/cocuk-gelisimi" npx astro build --outDir /tmp/dist-cd
//   CEVRIMDISI_DIST=/tmp/dist-cd npx playwright test -c playwright.cevrimdisi.config.ts
const port = Number(process.env.CEVRIMDISI_PORT ?? 4340);
const dist = process.env.CEVRIMDISI_DIST ?? 'dist';
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /cevrimdisi\.spec\.ts/,
  outputDir: process.env.E2E_CIKTI ?? `${process.env.TMPDIR ?? '/tmp'}/acik-ogretim-e2e-sonuc`,
  // One server with shared test hooks (/__test/*): scenarios run one after another
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  timeout: 120000,
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    serviceWorkers: 'allow',
    launchOptions: { executablePath },
  },
  projects: [
    { name: 'cevrimdisi-telefon', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, launchOptions: { executablePath } } },
    { name: 'cevrimdisi-masaustu', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, launchOptions: { executablePath } } },
  ],
  webServer: {
    command: `node tests/e2e/cevrimdisi-sunucu.mjs ${dist} ${port}`,
    url: `http://localhost:${port}/`,
    reuseExistingServer: false,
    timeout: 30000,
  },
});
