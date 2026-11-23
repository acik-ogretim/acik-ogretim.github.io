// Live study room check: the published site shows each sample course with a timed video transcript and written topic
// explanations (Zeki, 23 Nov 2026: "gerekli derslerin konu anlatımları ve videoları sisteme entegre edilmemiş").
// Runs on demand against CANLI_URL, never against the dev server:
//   CANLI_URL=https://acik-ogretim.github.io npx playwright test -c playwright.canli.config.ts
// Screenshots go to E2E_EKRAN (default <tmp>/acik-ogretim-e2e/canli); they are evidence, not baselines, and live in Drive.
import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CANLI = (process.env.CANLI_URL ?? '').replace(/\/$/, '');
const EKRAN = process.env.E2E_EKRAN ?? path.join(os.tmpdir(), 'acik-ogretim-e2e', 'canli');
const DERSLER = [
  { ad: 'psikoloji', yol: '/ataturk-aof/cocuk-gelisimi-lisans/psikoloji/calisma/' },
  { ad: 'genel-sanat-tarihi', yol: '/ataturk-aof/grafik-sanatlar/genel-sanat-tarihi/calisma/' },
  { ad: 'hareketli-grafik-tasarimi', yol: '/anadolu-aof/gorsel-iletisim/hareketli-grafik-tasarimi/calisma/' },
];

test.skip(!CANLI, 'live check runs on demand with CANLI_URL (playwright.canli.config.ts)');

for (const d of DERSLER) {
  test(`çalışma odası canlı: ${d.ad}`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('tur-goruldu', '1');
      localStorage.setItem('uyari-kapali', '1');
    });
    await page.goto(CANLI + d.yol, { waitUntil: 'domcontentloaded' });
    // the bundle is fetched after load; the transcript is rendered from it
    await expect(page.locator('#co-dokum .co-satir').first()).toBeAttached({ timeout: 30000 });
    expect(await page.locator('#co-dokum .co-satir').count()).toBeGreaterThan(50);
    const veri = await page.evaluate(async (yol) => {
      const [, uni, , ders] = yol.split('/');
      const p = await (await fetch(`/calisma-veri/${uni}/${ders}/paket.json`)).json();
      return { konu: p.konular.length, anlatim: p.konular.filter((k: { anlatim?: string }) => k.anlatim).length };
    }, d.yol);
    expect(veri.anlatim).toBeGreaterThan(veri.konu / 2);
    fs.mkdirSync(EKRAN, { recursive: true });
    await page.screenshot({ path: path.join(EKRAN, `${d.ad}-${test.info().project.name}.png`) });
  });
}
