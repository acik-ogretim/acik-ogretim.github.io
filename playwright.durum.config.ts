import { defineConfig, devices } from "@playwright/test";
const port = Number(process.env.E2E_PORT ?? 4332);
const dist = process.env.DURUM_DIST ?? "dist";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "durum.spec.ts",
  workers: 1,
  timeout: 60000,
  outputDir: `${process.env.TMPDIR ?? "/tmp"}/durum-e2e`,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${port}`,
    launchOptions: {
      executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    },
  },
  webServer: {
    command: `npx astro preview --host 127.0.0.1 --port ${port} --outDir ${dist}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
