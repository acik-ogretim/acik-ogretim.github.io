// Offline scenarios on a built preview (playwright.cevrimdisi.config.ts): shell navigation, course download,
// solving offline, the offline page, deleting, "Güncelleme var", the new version band and a slow network.
// Screenshots go to E2E_EKRAN; open them, a green run is not enough.
import { expect, test, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DIST = process.env.CEVRIMDISI_DIST ?? 'dist';
const EKRAN = process.env.E2E_EKRAN ?? path.join(os.tmpdir(), 'acik-ogretim-e2e');

// The two smallest downloadable courses of the preview build, read from its version manifest
const manifest = JSON.parse(fs.readFileSync(path.join(DIST, 'cevrimdisi-surum', 'auzef.json'), 'utf8')) as { dersler: Record<string, [string, string, number]> };
const [A, B] = Object.entries(manifest.dersler)
  .sort((x, y) => x[1][2] - y[1][2])
  .map(([ders, [yol]]) => ({ ders, yol }));
if (!A || !B) throw new Error('Önizleme derlemesinde en az iki ders olmalı');
const BOLUM = A.yol.split('/').slice(0, 3).join('/') + '/';

async function hazirla(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-hazir')) return;
    sessionStorage.setItem('e2e-hazir', '1');
    localStorage.setItem('tur-goruldu', '1');
    localStorage.setItem('uyari-kapali', '1');
    localStorage.setItem('quiz-settings', JSON.stringify({ autoAdvance: false }));
    // Downloads run in the page so the test can follow them (Background Fetch shows a browser notification)
    localStorage.setItem('cevrimdisi-on-plan', '1');
  });
}

async function ekran(page: Page, info: TestInfo, ad: string) {
  fs.mkdirSync(EKRAN, { recursive: true });
  await page.screenshot({ path: path.join(EKRAN, `${info.project.name}-${ad}.png`) });
}

/** First visit: the worker installs the shell and takes control of the page. */
async function calisanHazir(page: Page) {
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60000 });
}

const onbellekSayisi = (page: Page, ad: string) => page.evaluate(async (a) => (await (await caches.open(a)).keys()).length, ad);

async function cevrimdisi(context: BrowserContext, acik: boolean) {
  await context.setOffline(acik);
}

const test_ = (adres: string) => fetch(`http://localhost:${process.env.CEVRIMDISI_PORT ?? 4340}/__test/${adres}`);

test.beforeEach(async ({ page }) => {
  await test_('sifirla');
  await hazirla(page);
});

async function indir(page: Page, yol: string) {
  await page.goto(yol);
  await calisanHazir(page);
  const dugme = page.locator('#cevrimdisi-indir');
  await expect(dugme).toBeVisible();
  await expect(dugme).toHaveAttribute('data-durum', 'yok');
  await dugme.click();
  await expect(dugme).toHaveAttribute('data-durum', 'hazir', { timeout: 60000 });
}

test('1. kabuk: ana sayfa, üniversite, bölüm ve sekme sayfaları çevrimdışı açılır', async ({ page, context }, info) => {
  await page.goto('/');
  await calisanHazir(page);
  // Department pages arrive in the background after the first visit
  await expect.poll(() => onbellekSayisi(page, 'ao-bolum-v1'), { timeout: 30000 }).toBeGreaterThan(0);
  await cevrimdisi(context, true);
  for (const [yol, metin] of [
    ['/', 'Bugün'],
    ['/auzef', 'İstanbul'],
    ['/auzef/', 'İstanbul'],
    [BOLUM, 'Çocuk'],
    [BOLUM.slice(0, -1), 'Çocuk'],
    ['/derslerim/', 'Derslerim'],
    ['/ara/', 'Ara'],
    ['/ilerleme/', 'İlerleme'],
    ['/ayarlar/', 'Ayarlar'],
    ['/yedek/', 'taşı'],
    ['/rehber/', 'Rehber'],
    ['/gizlilik/', 'Gizlilik'],
    ['/kullanim-kosullari/', 'Koşul'],
    ['/cevrimdisi/', 'Çevrimdışı'],
  ] as const) {
    const r = await page.goto(yol);
    expect(r?.ok(), yol).toBe(true);
    await expect(page.locator('h1').first(), yol).toContainText(metin, { ignoreCase: true });
  }
  await page.goto(BOLUM);
  await expect(page.locator('html')).toHaveAttribute('data-cevrimdisi', '');
  await expect(page.locator('.cevrimdisi-simge').first()).toBeVisible();
  // Courses that were not downloaded are dimmed
  await expect.poll(() => page.locator('a[data-cevrimdisi-yok]').count()).toBeGreaterThan(0);
  await ekran(page, info, '1-bolum-cevrimdisi');
  // A page that was never stored gets the offline page in place
  await page.goto('/istatistik/');
  await expect(page.getByRole('heading', { name: 'Bu sayfa bağlantı gelince açılır' })).toBeVisible();
});

test('2. dersi indir, çevrimdışı aç, soru çöz, yenile: cevap durur', async ({ page, context }, info) => {
  await indir(page, A.yol);
  await expect(page.locator('#cevrimdisi-bilgi')).toContainText('Bu cihazda');
  await ekran(page, info, '2-indirildi');
  await cevrimdisi(context, true);
  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as { quizPlayer?: { calisma?: unknown } }).quizPlayer?.calisma);
  await page.locator('[data-kip="cozme"]').click();
  await expect(page.locator('body')).toHaveClass(/is-interactive-mode/);
  const kart = page.locator('.question-card').first();
  const anahtar = await kart.getAttribute('data-anahtar');
  await kart.locator('.option-item').first().click();
  await expect(kart.locator('.option-item.is-correct, .option-item.is-wrong').first()).toBeVisible();
  const once = await kart.locator('.option-item').evaluateAll((els) => els.map((e) => e.className));
  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as { quizPlayer?: { calisma?: unknown } }).quizPlayer?.calisma);
  const sonra = await page.locator(`.question-card[data-anahtar="${anahtar}"] .option-item`).evaluateAll((els) => els.map((e) => e.className));
  expect(sonra).toEqual(once);
  // Chat explains instead of failing
  await ekran(page, info, '2-cevrimdisi-cozuldu');
  // Shared course links of another department open the same download
  const baskaBolum = A.yol.replace(/^\/auzef\/[^/]+\//, '/auzef/baska-bolum/');
  const r = await page.goto(baskaBolum);
  expect(r?.ok()).toBe(true);
  await expect(page.locator('#ders-adi')).toBeVisible();
});

test('3. indirilmemiş ders çevrimdışı sayfasını açar, indirilenler listelenir', async ({ page, context }, info) => {
  await indir(page, A.yol);
  const ad = (await page.locator('#ders-adi').textContent())?.trim() ?? '';
  await cevrimdisi(context, true);
  await page.goto(B.yol);
  await expect(page.getByRole('heading', { name: 'Bu sayfa bağlantı gelince açılır' })).toBeVisible();
  const satir = page.locator('#offline-liste .liste-satir');
  await expect(satir).toHaveCount(1);
  await expect(satir).toContainText(ad);
  await ekran(page, info, '3-offline-sayfasi');
  await satir.locator('a').click();
  await expect(page.locator('#ders-adi')).toHaveText(ad);
});

test('4. silinen ders çevrimdışı açılmaz, cevaplar silinmez', async ({ page, context }, info) => {
  await indir(page, A.yol);
  await page.evaluate(() => localStorage.setItem('e2e-cevap-izi', '1'));
  await page.goto('/cevrimdisi/');
  const satir = page.locator('#cd-liste .liste-satir');
  await expect(satir).toHaveCount(1);
  await ekran(page, info, '4-yonetim');
  await satir.locator('[data-eylem="sil"]').click();
  await expect(page.locator('#cd-liste')).toContainText('Henüz indirilen ders yok');
  expect(await page.evaluate(() => localStorage.getItem('e2e-cevap-izi'))).toBe('1');
  await cevrimdisi(context, true);
  await page.goto(A.yol);
  await expect(page.getByRole('heading', { name: 'Bu sayfa bağlantı gelince açılır' })).toBeVisible();
});

test('5. içerik değişince "Güncelleme var", güncelleyince kalkar', async ({ page }, info) => {
  await indir(page, A.yol);
  await test_(`surum?ders=auzef/${A.ders}`);
  await page.reload();
  await expect(page.locator('#cevrimdisi-indir')).toHaveAttribute('data-durum', 'guncelleme');
  await page.goto('/cevrimdisi/');
  const satir = page.locator('#cd-liste .liste-satir');
  await expect(satir).toContainText('Güncelleme var');
  await ekran(page, info, '5-guncelleme-var');
  await satir.getByRole('button', { name: 'Güncelle' }).click();
  await expect(satir).not.toContainText('Güncelleme var', { timeout: 60000 });
  await expect(satir).toHaveAttribute('data-durum', 'hazir');
  await ekran(page, info, '5-guncellendi');
});

test('6. yeni sürüm: "Yeni sürüm hazır" ve Yenile', async ({ page }, info) => {
  await page.goto('/');
  await calisanHazir(page);
  const ilk = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL);
  expect(ilk).toContain('/sw.js');
  await test_('sw');
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
  const bant = page.locator('#surum-bandi');
  await expect(bant).toBeVisible({ timeout: 60000 });
  await expect(bant).toContainText('Yeni sürüm hazır');
  await ekran(page, info, '6-yeni-surum');
  // Nothing changes until the tap
  await page.waitForTimeout(500);
  await expect(bant).toBeVisible();
  await Promise.all([page.waitForEvent('load'), bant.getByRole('button', { name: 'Yenile' }).click()]);
  await expect(page.locator('#surum-bandi')).toHaveCount(0);
  const surum = await page.evaluate(
    () =>
      new Promise<string>((coz) => {
        navigator.serviceWorker.addEventListener('message', (e) => e.data?.tur === 'surum' && coz(e.data.surum));
        navigator.serviceWorker.controller?.postMessage({ tur: 'surum' });
      }),
  );
  expect(surum).toContain('e2e');
  const kabuklar = await page.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith('ao-kabuk-')));
  expect(kabuklar).toHaveLength(1);
});

test('7. yavaş ağ: 3 saniye sonra kayıtlı sayfa açılır', async ({ page }) => {
  await page.goto('/');
  await calisanHazir(page);
  await test_('yavas?ms=9000');
  const t0 = Date.now();
  await page.goto('/rehber/');
  await expect(page.locator('h1').first()).toBeVisible();
  const sure = Date.now() - t0;
  expect(sure).toBeGreaterThan(2500);
  expect(sure).toBeLessThan(7000);
});
