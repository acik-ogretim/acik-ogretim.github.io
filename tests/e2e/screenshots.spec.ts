import { test, expect } from '@playwright/test';
import path from 'path';

// Define the pages to test
const pages = [
  // Home
  { path: '/', name: 'home' },
  // Static Pages
  { path: '/gizlilik', name: 'gizlilik' },
  { path: '/hakkimizda', name: 'hakkimizda' },
  { path: '/iletisim', name: 'iletisim' },
  { path: '/offline', name: 'offline' },
  { path: '/rehber', name: 'rehber' },
  { path: '/telif', name: 'telif' },
  // Anadolu AÖF
  { path: '/anadolu-aof', name: 'anadolu_uni' },
  { path: '/anadolu-aof/gorsel-iletisim', name: 'anadolu_dept' },
  // anadolu_course is known to be very long, causing protocol errors with fullPage: true
  { path: '/anadolu-aof/gorsel-iletisim/gorsel-estetik', name: 'anadolu_course', partial: true },
  { path: '/anadolu-aof/gorsel-iletisim/gorsel-estetik/materyaller', name: 'anadolu_materials' },
  // Atatürk AÖF
  { path: '/ataturk-aof', name: 'ataturk_uni' },
  { path: '/ataturk-aof/acil-durum-ve-afet-yonetimi', name: 'ataturk_dept' },
  { path: '/ataturk-aof/acil-durum-ve-afet-yonetimi/acil-durum-ve-afet-yonetimine-giris', name: 'ataturk_course' },
  { path: '/ataturk-aof/acil-durum-ve-afet-yonetimi/acil-durum-ve-afet-yonetimine-giris/materyaller', name: 'ataturk_materials' },
  // Auzef
  { path: '/auzef', name: 'auzef_uni' },
  { path: '/auzef/cocuk-gelisimi', name: 'auzef_dept' },
  { path: '/auzef/cocuk-gelisimi/anatomi', name: 'auzef_course' },
  { path: '/auzef/cocuk-gelisimi/anatomi/materyaller', name: 'auzef_materials' },
];

const viewports = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'mobile', width: 375, height: 667 }, // iPhone SE
];

for (const pageInfo of pages) {
  for (const viewport of viewports) {
    test(`screenshot ${pageInfo.name} ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`http://localhost:4321${pageInfo.path}`);

      // Wait for network idle to ensure content is loaded
      await page.waitForLoadState('networkidle');

      // Additional check to make sure dynamic content is likely loaded
      if (pageInfo.path.includes('materyaller')) {
         await page.waitForTimeout(2000);
      }

      // Handle very long pages by avoiding fullPage if marked as partial
      // or set a reasonable maximum height for the screenshot if possible (not directly supported by clip without knowing height)
      // We will fallback to viewport screenshot if 'partial' is true

      if (pageInfo.partial) {
          // Attempt to scroll a bit to load lazy content then take viewport screenshot
          await page.evaluate(() => window.scrollTo(0, 500));
          await page.waitForTimeout(500);
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(500);

          await page.screenshot({
            path: path.join('screenshots', `${pageInfo.name}-${viewport.name}.png`),
            fullPage: false,
          });
      } else {
          await page.screenshot({
            path: path.join('screenshots', `${pageInfo.name}-${viewport.name}.png`),
            fullPage: true,
          });
      }
    });
  }
}
