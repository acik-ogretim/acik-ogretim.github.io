// Study state scenarios on the course page: "kaldığın yer", stored answers, clearing with undo, question
// order, mode switch, shared course back link and backups (file and Google Drive, Google mocked).
// Runs on a phone (390x844) and a desktop (1280x800) project, see playwright.config.ts.
// Data: test-uni/course-senaryo and course-senaryo-2 (tests/e2e/fikstur.py writes them).
// Screenshots go to E2E_EKRAN (default: <tmp>/acik-ogretim-e2e); they are for review, not baselines.
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DERS = '/test-uni/test-dept-active/course-senaryo';
const DERS2 = '/test-uni/test-dept-active/course-senaryo-2';
const ORTAK = '/test-uni/test-dept-passive/course-senaryo';
const EKRAN = process.env.E2E_EKRAN ?? path.join(os.tmpdir(), 'acik-ogretim-e2e');
const TEMALAR = ['dark', 'light', 'sepia'] as const;

type Hazirlik = { tema?: (typeof TEMALAR)[number]; otomatikIlerle?: boolean };

/** Fresh learner: onboarding seen, warning closed, auto advance off (so the list stays put while testing). */
async function hazirla(page: Page, h: Hazirlik = {}) {
  await page.addInitScript(({ tema, otomatikIlerle }) => {
    if (sessionStorage.getItem('e2e-hazir')) return;
    sessionStorage.setItem('e2e-hazir', '1');
    localStorage.setItem('tur-goruldu', '1');
    localStorage.setItem('uyari-kapali', '1');
    localStorage.setItem('theme', tema);
    localStorage.setItem('quiz-settings', JSON.stringify({ autoAdvance: otomatikIlerle }));
  }, { tema: h.tema ?? 'dark', otomatikIlerle: h.otomatikIlerle ?? false });
  // Astro's dev toolbar sits over the player bar in dev mode
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.textContent = 'astro-dev-toolbar{display:none!important}';
      document.head.append(s);
    });
  });
}

async function ekran(page: Page, info: TestInfo, ad: string) {
  fs.mkdirSync(EKRAN, { recursive: true });
  const dosya = path.join(EKRAN, `${info.project.name}-${ad}.png`);
  await page.screenshot({ path: dosya });
  return dosya;
}

async function dersAc(page: Page, yol = DERS) {
  await page.goto(yol);
  await bekle(page);
}

async function bekle(page: Page) {
  await page.waitForFunction(() => !!(window as unknown as { quizPlayer?: { calisma?: unknown } }).quizPlayer?.calisma);
}

const kart = (page: Page, anahtar: string): Locator => page.locator(`.question-card[data-anahtar="${anahtar}"]`);

/** A real gesture first (recording starts only after the learner interacts), then the card at the top. */
async function soruyaGel(page: Page, anahtar: string) {
  await page.keyboard.press('Shift');
  await kart(page, anahtar).evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await expect.poll(() => simdiki(page)).toBe(anahtar);
}

const simdiki = (page: Page) =>
  page.evaluate(() => {
    const p = (window as unknown as { quizPlayer: { questions: { id: string }[]; currentIndex: number } }).quizPlayer;
    return p.questions[p.currentIndex]?.id;
  });

const kayit = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('kaldigin-yer') ?? 'null') as { dersler: Record<string, { soru: string; kip: string; bolum?: string }> } | null);

async function kayitBekle(page: Page, ders: string, soru: string) {
  await expect.poll(async () => (await kayit(page))?.dersler[ders]?.soru, { timeout: 5000 }).toBe(soru);
}

async function cozmeyeGec(page: Page) {
  await page.locator('[data-kip="cozme"]').click();
  await expect(page.locator('body')).toHaveClass(/is-interactive-mode/);
}

/**
 * Islands hydrate when the browser is idle: retry until the sheet is there. The menu opens from the
 * player bar button like on a phone (the M shortcut has no trigger to return focus to).
 */
async function katmanAc(page: Page, tus: string, ad: string, dugme?: string): Promise<Locator> {
  const katman = page.getByRole('dialog', { name: ad });
  await expect(async () => {
    if (!(await katman.isVisible())) {
      if (dugme && (await page.locator(dugme).isVisible())) await page.locator(dugme).click();
      else await page.keyboard.press(tus);
    }
    await expect(katman).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
  return katman;
}

const suzgecAc = (page: Page) => katmanAc(page, 'f', 'Süzgeç');

async function menudenCalistir(page: Page, etiket: string) {
  const menu = await katmanAc(page, 'm', 'Tüm menü', '#btn-mobil-menu');
  const dugme = menu.getByRole('button', { name: etiket, exact: true });
  await expect(dugme).toBeEnabled();
  await dugme.click();
}

/** Classes drawn on a card's options: "B:is-correct", "E:was-revealed"... */
const isaretler = (k: Locator) =>
  k.locator('.option-item').evaluateAll((els) =>
    els.flatMap((e) =>
      ['is-correct', 'is-wrong', 'was-revealed'].filter((c) => e.classList.contains(c)).map((c) => `${(e as HTMLElement).dataset.key}:${c}`),
    ),
  );

async function sayac(page: Page) {
  return {
    dogru: await page.locator('#correct-count').textContent(),
    yanlis: await page.locator('#wrong-count').textContent(),
    yuzde: await page.locator('#success-rate').textContent(),
  };
}

/** The card is below the floating top bar and its top is what the learner sees first. */
async function ekrandaVeAcik(page: Page, anahtar: string) {
  const sonuc = await kart(page, anahtar).evaluate((el) => {
    const r = el.getBoundingClientRect();
    const ust = document.querySelector('.mobil-ustcubuk')?.getBoundingClientRect().bottom ?? 0;
    const x = r.left + Math.min(40, r.width / 2);
    const nokta = document.elementFromPoint(x, Math.max(r.top, ust) + 12);
    return { top: r.top, ust, h: innerHeight, ustte: !!nokta && el.contains(nokta) };
  });
  expect(sonuc.top, 'kart kapsülün altında başlar').toBeGreaterThanOrEqual(sonuc.ust - 2);
  expect(sonuc.top, 'kart ekranın üst yarısında').toBeLessThan(sonuc.h * 0.5);
  expect(sonuc.ustte, 'kartın üstünü başka bir katman örtmüyor').toBe(true);
}

/** Order of the cards of one unit as drawn. */
const uniteSirasi = (page: Page, unite: number) =>
  page.locator(`.unit-separator[data-unit="${unite}"] > .question-card`).evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.anahtar));

async function sirala(page: Page, etiket: string) {
  const sayfa = await suzgecAc(page);
  await sayfa.getByRole('button', { name: etiket, exact: true }).click();
  await sayfa.getByRole('button', { name: 'Uygula' }).click();
  await expect(sayfa).toBeHidden();
}

test.describe('Çalışma durumu', () => {
  test('1. Çözme kipinde cevaplar, renkler ve sayaç yenilemeden sonra aynı', async ({ page }, info) => {
    await hazirla(page);
    await dersAc(page);
    await cozmeyeGec(page);
    await kart(page, 'sen-2').getByTestId('option-B').click(); // right
    await kart(page, 'sen-5').getByTestId('option-A').click(); // wrong (E is right)
    await soruyaGel(page, 'sen-4');
    await menudenCalistir(page, 'Cevabı göster');
    await expect(kart(page, 'sen-4').locator('.explanation-box')).toBeVisible();
    const once = { a: await isaretler(kart(page, 'sen-2')), b: await isaretler(kart(page, 'sen-5')), c: await isaretler(kart(page, 'sen-4')) };
    expect(once).toEqual({ a: ['B:is-correct', 'B:was-revealed'], b: ['A:is-wrong', 'E:was-revealed'], c: ['D:was-revealed'] });
    expect(await sayac(page)).toEqual({ dogru: '1', yanlis: '1', yuzde: '50' });
    await ekran(page, info, '1-once');

    await page.reload();
    await bekle(page);
    await expect(page.locator('body')).toHaveClass(/is-interactive-mode/);
    await expect(page.locator('[data-kip="cozme"]')).toHaveAttribute('aria-pressed', 'true');
    expect({ a: await isaretler(kart(page, 'sen-2')), b: await isaretler(kart(page, 'sen-5')), c: await isaretler(kart(page, 'sen-4')) }).toEqual(once);
    expect(await sayac(page)).toEqual({ dogru: '1', yanlis: '1', yuzde: '50' });
    await expect(kart(page, 'sen-5').locator('.explanation-box')).toBeVisible();
    // An unanswered question still hides its answer
    expect(await isaretler(kart(page, 'sen-1'))).toEqual([]);
    await expect(kart(page, 'sen-1').locator('.explanation-box')).toBeHidden();
    // Reload lands on the question the learner was on
    await ekrandaVeAcik(page, 'sen-4');
    await ekran(page, info, '1-yenileme-sonrasi');
    // An answered question cannot be answered twice
    await kart(page, 'sen-2').getByTestId('option-C').click();
    expect(await isaretler(kart(page, 'sen-2'))).toEqual(['B:is-correct', 'B:was-revealed']);
  });

  test('2. Kaldığın yer kartı doğru dersi ve soruyu gösterir, dokununca soruya iner', async ({ page }, info) => {
    await hazirla(page);
    await dersAc(page);
    await soruyaGel(page, 'sen-9');
    await kayitBekle(page, 'test-uni/course-senaryo', 'sen-9');

    await page.goto('/');
    await expect(page.locator('#bugun')).toBeVisible();
    await expect(page.locator('#ky-ad')).toHaveText('Senaryo Dersi');
    await expect(page.locator('#ky-konum')).toHaveText('Ünite 2 · Soru 4 / 4');
    await ekran(page, info, '2-ana-sayfa');

    await page.locator('#ky-devam').click();
    await page.waitForURL((u) => u.pathname === DERS && u.hash === '');
    await bekle(page);
    await ekrandaVeAcik(page, 'sen-9');
    expect(await simdiki(page)).toBe('sen-9');
    // Still in place once the page has settled
    await page.waitForTimeout(1500);
    await ekrandaVeAcik(page, 'sen-9');
    await ekran(page, info, '2-devam');
  });

  test('3. İki derste kaldığın yerler ayrı tutulur', async ({ page }, info) => {
    await hazirla(page);
    await dersAc(page);
    await soruyaGel(page, 'sen-10');
    await kayitBekle(page, 'test-uni/course-senaryo', 'sen-10');
    await dersAc(page, DERS2);
    await soruyaGel(page, 'iki-104');
    await kayitBekle(page, 'test-uni/course-senaryo-2', 'iki-104');

    const k = await kayit(page);
    expect(k?.dersler['test-uni/course-senaryo'].soru).toBe('sen-10');
    expect(k?.dersler['test-uni/course-senaryo-2'].soru).toBe('iki-104');

    await page.goto('/');
    await expect(page.locator('#ky-ad')).toHaveText('İkinci Senaryo Dersi');

    await page.goto('/derslerim');
    const satir1 = page.locator('a.liste-satir', { hasText: 'Senaryo Dersi' }).filter({ hasNotText: 'İkinci' });
    const satir2 = page.locator('a.liste-satir', { hasText: 'İkinci Senaryo Dersi' });
    await expect(satir1).toContainText('Kaldığın yer: Ünite 3 · Soru 1 / 3');
    await expect(satir2).toContainText('Kaldığın yer: Ünite 2 · Soru 2 / 3');
    await ekran(page, info, '3-derslerim');
    await satir1.click();
    await bekle(page);
    await ekrandaVeAcik(page, 'sen-10');
  });

  test('4. Süzgeçle gizlenen soruya dönünce uyarı ve süzgeci kaldırma seçeneği çıkar', async ({ page }, info) => {
    await hazirla(page);
    await dersAc(page);
    await soruyaGel(page, 'sen-7');
    await kayitBekle(page, 'test-uni/course-senaryo', 'sen-7');
    // The filter is shared by every course: set it on the other course to "Ü 1"
    await dersAc(page, DERS2);
    const suzgec = await suzgecAc(page);
    await suzgec.getByRole('button', { name: 'Ü 1', exact: true }).click();
    await suzgec.getByRole('button', { name: 'Uygula' }).click();

    await page.goto('/derslerim');
    await page.locator('a.liste-satir', { hasText: 'Senaryo Dersi' }).filter({ hasNotText: 'İkinci' }).click();
    await bekle(page);
    const bildirim = page.getByTestId('bildirim');
    await expect(bildirim).toContainText('Kaldığın soru süzgeçte gizli.');
    await expect(kart(page, 'sen-7')).toBeHidden();
    await ekran(page, info, '4-uyari');
    await bildirim.getByRole('button', { name: 'Süzgeci kaldır' }).click();
    await expect(kart(page, 'sen-7')).toBeVisible();
    await ekrandaVeAcik(page, 'sen-7');
    await ekran(page, info, '4-suzgec-kalkti');
  });

  test('5. Ünite ve ders temizleme, geri al', async ({ page }, info) => {
    await hazirla(page);
    await dersAc(page);
    await cozmeyeGec(page);
    await kart(page, 'sen-2').getByTestId('option-B').click();
    await kart(page, 'sen-5').getByTestId('option-A').click();
    await kart(page, 'sen-6').getByTestId('option-A').click();
    await soruyaGel(page, 'sen-5');
    expect(await sayac(page)).toEqual({ dogru: '2', yanlis: '1', yuzde: '67' });

    await menudenCalistir(page, 'Üniteyi temizle');
    const bildirim = page.getByTestId('bildirim');
    await expect(bildirim).toContainText('Ünite 1 temizlendi: 2 cevap silindi.');
    expect(await isaretler(kart(page, 'sen-2'))).toEqual([]);
    expect(await isaretler(kart(page, 'sen-5'))).toEqual([]);
    expect(await isaretler(kart(page, 'sen-6'))).toEqual(['A:is-correct', 'A:was-revealed']);
    expect(await sayac(page)).toEqual({ dogru: '1', yanlis: '0', yuzde: '100' });
    await ekran(page, info, '5-unite-temizlendi');

    await bildirim.getByRole('button', { name: 'Geri al' }).click();
    expect(await isaretler(kart(page, 'sen-2'))).toEqual(['B:is-correct', 'B:was-revealed']);
    expect(await isaretler(kart(page, 'sen-5'))).toEqual(['A:is-wrong', 'E:was-revealed']);
    expect(await sayac(page)).toEqual({ dogru: '2', yanlis: '1', yuzde: '67' });

    await menudenCalistir(page, 'Dersi temizle');
    await expect(bildirim).toContainText('Ders temizlendi: 3 cevap silindi.');
    for (const k of ['sen-2', 'sen-5', 'sen-6']) expect(await isaretler(kart(page, k))).toEqual([]);
    expect(await sayac(page)).toEqual({ dogru: '0', yanlis: '0', yuzde: '0' });
    await ekran(page, info, '5-ders-temizlendi');
    // Cleared for good: a reload keeps it empty
    await page.reload();
    await bekle(page);
    for (const k of ['sen-2', 'sen-5', 'sen-6']) expect(await isaretler(kart(page, k))).toEqual([]);

    // Position reset with undo
    await soruyaGel(page, 'sen-6');
    await kayitBekle(page, 'test-uni/course-senaryo', 'sen-6');
    await menudenCalistir(page, 'Kaldığın yeri sıfırla');
    await expect.poll(async () => (await kayit(page))?.dersler['test-uni/course-senaryo']).toBeUndefined();
    await page.getByTestId('bildirim').getByRole('button', { name: 'Geri al' }).click();
    await kayitBekle(page, 'test-uni/course-senaryo', 'sen-6');
  });

  test('6. Her sıralama beklenen sırayı verir ve yenilemeden sonra kalır', async ({ page }, info) => {
    await hazirla(page);
    await dersAc(page);
    // Book order: 1.2 < 1.7 < 1.7.4 < 1.10 < no topic
    expect(await uniteSirasi(page, 1)).toEqual(['sen-2', 'sen-5', 'sen-4', 'sen-1', 'sen-3']);
    await expect(kart(page, 'sen-2').locator('.q-no')).toHaveText('Soru 1');

    await sirala(page, 'En çok sorulan');
    expect(await uniteSirasi(page, 1)).toEqual(['sen-2', 'sen-4', 'sen-5', 'sen-1', 'sen-3']);
    expect(await uniteSirasi(page, 2)).toEqual(['sen-7', 'sen-6', 'sen-9', 'sen-8']);
    // Numbers belong to the question, not to the place
    await expect(kart(page, 'sen-4').locator('.q-no')).toHaveText('Soru 3');
    await ekran(page, info, '6-en-cok-sorulan');

    await sirala(page, 'En yeni sınav');
    expect(await uniteSirasi(page, 1)).toEqual(['sen-5', 'sen-2', 'sen-1', 'sen-4', 'sen-3']);
    await sirala(page, 'En eski sınav');
    expect(await uniteSirasi(page, 1)).toEqual(['sen-4', 'sen-2', 'sen-1', 'sen-5', 'sen-3']);

    await cozmeyeGec(page);
    await kart(page, 'sen-1').getByTestId('option-B').click(); // wrong
    await kart(page, 'sen-2').getByTestId('option-B').click(); // right
    await sirala(page, 'Yanlışlarım önce');
    expect(await uniteSirasi(page, 1)).toEqual(['sen-1', 'sen-2', 'sen-5', 'sen-4', 'sen-3']);
    await sirala(page, 'Çözmediklerim önce');
    expect(await uniteSirasi(page, 1)).toEqual(['sen-5', 'sen-4', 'sen-3', 'sen-2', 'sen-1']);
    // Next and previous follow the drawn order
    await soruyaGel(page, 'sen-3');
    await menudenCalistir(page, 'Sonraki soru');
    await expect.poll(() => simdiki(page)).toBe('sen-2');

    await sirala(page, 'En çok sorulan');
    await page.reload();
    await bekle(page);
    expect(await uniteSirasi(page, 1)).toEqual(['sen-2', 'sen-4', 'sen-5', 'sen-1', 'sen-3']);
    await expect((await suzgecAc(page)).getByRole('button', { name: 'En çok sorulan', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await ekran(page, info, '6-suzgec-sirala');
    // The other course keeps its own order
    await page.keyboard.press('Escape');
    await dersAc(page, DERS2);
    expect(await uniteSirasi(page, 1)).toEqual(['iki-100', 'iki-101', 'iki-102']);
  });

  for (const tema of TEMALAR) {
    test(`7. Kip geçişinde gizli cevap öteki şıklardan ayırt edilemez (${tema})`, async ({ page }, info) => {
      await hazirla(page, { tema });
      await dersAc(page);
      await soruyaGel(page, 'sen-1');
      const k = kart(page, 'sen-1');
      // Reading mode shows the answer
      const okuma = await k.getByTestId('option-A').evaluate((e) => getComputedStyle(e).backgroundColor);
      const diger = await k.getByTestId('option-B').evaluate((e) => getComputedStyle(e).backgroundColor);
      expect(okuma).not.toBe(diger);
      await ekran(page, info, `7-okuma-${tema}`);

      // Sample frames from the click until well after the switch
      await page.evaluate(() => {
        const w = window as unknown as { kareler: string[][] };
        w.kareler = [];
        const kartEl = document.querySelector('.question-card[data-anahtar="sen-1"]') as HTMLElement;
        const stil = (key: string) => {
          const o = kartEl.querySelector(`.option-item[data-key="${key}"]`) as HTMLElement;
          const s = getComputedStyle(o);
          const h = getComputedStyle(o.querySelector('.option-key') as HTMLElement);
          return [s.backgroundColor, s.borderTopColor, h.backgroundColor, h.color].join('|');
        };
        let n = 0;
        const al = () => {
          w.kareler.push([stil('A'), stil('B')]);
          if (++n < 40) requestAnimationFrame(al);
        };
        document.querySelector('[data-kip="cozme"]')?.addEventListener('click', () => requestAnimationFrame(al), { once: true });
      });
      await cozmeyeGec(page);
      await expect.poll(() => page.evaluate(() => (window as unknown as { kareler: string[][] }).kareler.length), { timeout: 5000 }).toBe(40);
      const kareler = await page.evaluate(() => (window as unknown as { kareler: string[][] }).kareler);
      for (const [a, b] of kareler) expect(a, 'doğru şık her karede öteki şıkla aynı').toBe(b);
      await ekran(page, info, `7-cozme-${tema}`);

      // Back to reading and once more into solving: still no difference
      await page.locator('[data-kip="okuma"]').click();
      await cozmeyeGec(page);
      const [a, b] = await k.locator('.option-item').evaluateAll((els) =>
        els.slice(0, 2).map((o) => {
          const s = getComputedStyle(o);
          const h = getComputedStyle(o.querySelector('.option-key') as HTMLElement);
          return [s.backgroundColor, s.borderTopColor, h.backgroundColor].join('|');
        }),
      );
      expect(a).toBe(b);
    });
  }

  test('8. Ortak derste geri bağlantısı ve devam bağlantısı gelinen bölümü korur', async ({ page }, info) => {
    await hazirla(page);
    await page.goto(ORTAK);
    await page.waitForURL((u) => u.pathname === DERS && u.searchParams.get('bolum') === 'test-dept-passive');
    await bekle(page);
    await expect(page.locator('a[data-geri-bolum]').first()).toHaveAttribute('href', '/test-uni/test-dept-passive');
    await soruyaGel(page, 'sen-6');
    await expect.poll(async () => (await kayit(page))?.dersler['test-uni/course-senaryo']?.bolum).toBe('test-dept-passive');

    await page.goto('/');
    await expect(page.locator('#ky-devam')).toHaveAttribute('href', `${DERS}?bolum=test-dept-passive#kaldigin-yer`);
    await page.locator('#ky-devam').click();
    await bekle(page);
    await expect(page.locator('a[data-geri-bolum]').first()).toHaveAttribute('href', '/test-uni/test-dept-passive');
    await ekrandaVeAcik(page, 'sen-6');
    await ekran(page, info, '8-ortak-ders');
  });

  test('9. Yedek dosyası ve Google eşitlemesi cevapları ve kaldığın yeri korur', async ({ page, context }, info) => {
    await hazirla(page);
    await dersAc(page);
    await cozmeyeGec(page);
    await kart(page, 'sen-2').getByTestId('option-B').click();
    await kart(page, 'sen-5').getByTestId('option-A').click();
    await soruyaGel(page, 'sen-6');
    await kayitBekle(page, 'test-uni/course-senaryo', 'sen-6');

    // File backup: export, wipe the device, import
    await page.goto('/yedek');
    const indirme = page.waitForEvent('download');
    await page.locator('#yedek-al').click();
    const dosya = path.join(EKRAN, `${info.project.name}-yedek.json`);
    fs.mkdirSync(EKRAN, { recursive: true });
    await (await indirme).saveAs(dosya);
    const yedek = JSON.parse(fs.readFileSync(dosya, 'utf8')) as { kayitlar: Record<string, string> };
    expect(Object.keys(yedek.kayitlar)).toEqual(expect.arrayContaining(['kaldigin-yer', 'cevaplar-test-uni-course-senaryo']));
    expect(Object.keys(yedek.kayitlar).some((k) => k.endsWith('-api-key') || k.startsWith('google-esitleme-'))).toBe(false);
    await page.evaluate(() => {
      for (const k of Object.keys(localStorage)) if (k === 'kaldigin-yer' || k.startsWith('cevaplar-') || k.startsWith('quiz-progress-')) localStorage.removeItem(k);
    });
    await page.locator('#yedek-yukle').setInputFiles(dosya);
    await expect(page.locator('#yedek-durum')).toContainText('kayıt bu cihaza eklendi');
    fs.rmSync(dosya, { force: true });

    await page.goto('/');
    await page.locator('#ky-devam').click();
    await bekle(page);
    await ekrandaVeAcik(page, 'sen-6');
    expect(await isaretler(kart(page, 'sen-2'))).toEqual(['B:is-correct', 'B:was-revealed']);
    expect(await isaretler(kart(page, 'sen-5'))).toEqual(['A:is-wrong', 'E:was-revealed']);
    expect(await sayac(page)).toEqual({ dogru: '1', yanlis: '1', yuzde: '50' });
    await ekran(page, info, '9-yedekten-sonra');

    // Google Drive sync with a fake Google Identity Services script and a fake Drive
    let drive: string | null = null;
    let yazilan = 0;
    let girisSonucu: 'kapat' | 'tamam' = 'kapat';
    await context.route('https://accounts.google.com/gsi/client', (r) =>
      r.fulfill({
        contentType: 'text/javascript',
        body: `window.google = { accounts: { oauth2: {
          initTokenClient: (c) => ({ requestAccessToken: () => setTimeout(() => {
            if (window.__girisSonucu === 'kapat') c.error_callback && c.error_callback({ type: 'popup_closed' });
            else c.callback({ access_token: 'sahte-token', expires_in: 3600 });
          }, 50) }),
          revoke: (t, done) => { window.__iptal = t; done && done(); },
        } } };`,
      }),
    );
    await context.route('https://www.googleapis.com/**', async (r) => {
      const u = new URL(r.request().url());
      const m = r.request().method();
      if (u.pathname === '/drive/v3/files' && m === 'GET') return r.fulfill({ json: { files: drive ? [{ id: 'dosya-1' }] : [] } });
      if (u.pathname === '/drive/v3/files/dosya-1') return r.fulfill({ contentType: 'application/json', body: drive ?? '{}' });
      if (u.pathname.startsWith('/upload/drive/v3/files')) {
        const govde = r.request().postData() ?? '';
        drive = m === 'PATCH' ? govde : (govde.split('\r\n').find((s) => s.startsWith('{"surum"')) ?? null);
        yazilan++;
        return r.fulfill({ json: { id: 'dosya-1' } });
      }
      return r.fulfill({ status: 404, body: '' });
    });

    await page.goto('/yedek');
    const gDugme = page.locator('#google-esitle');
    test.skip(!(await gDugme.count()), 'PUBLIC_GOOGLE_CLIENT_ID bu sunucuda tanımlı değil');
    const gDurum = page.locator('#google-durum');

    // Popup closed: a clear message, nothing written, button usable again
    await page.evaluate((s) => ((window as unknown as { __girisSonucu: string }).__girisSonucu = s), girisSonucu);
    await gDugme.click();
    await expect(gDurum).toHaveText('Google penceresi kapatıldı, giriş yapılmadı.');
    await expect(gDugme).toBeEnabled();
    expect(yazilan).toBe(0);

    // Successful sign-in: the device's records go to Drive
    girisSonucu = 'tamam';
    await page.evaluate((s) => ((window as unknown as { __girisSonucu: string }).__girisSonucu = s), girisSonucu);
    await gDugme.click();
    await expect(gDurum).toContainText("Drive'da önceki kayıt yoktu");
    expect(yazilan).toBe(1);
    const driveKayit = JSON.parse(drive ?? '{}') as { kayitlar: Record<string, string> };
    expect(Object.keys(driveKayit.kayitlar)).toEqual(expect.arrayContaining(['kaldigin-yer', 'cevaplar-test-uni-course-senaryo']));
    await expect(gDugme).toHaveText('Şimdi eşitle');
    await ekran(page, info, '9-google-bagli');

    // A new tab: no token in this tab yet, sync is still marked as on for the device
    const sekme = await context.newPage();
    await sekme.goto('/yedek');
    await expect(sekme.locator('#google-esitle')).toHaveText('Yeniden giriş yap ve eşitle');
    await expect(sekme.locator('#google-durum')).toContainText('Google oturumu bu sekmede kapalı.');
    // Wipe this device's answers, then sync from the new tab: Drive brings them back
    await sekme.evaluate(() => {
      for (const k of Object.keys(localStorage)) if (k === 'kaldigin-yer' || k.startsWith('cevaplar-')) localStorage.removeItem(k);
      (window as unknown as { __girisSonucu: string }).__girisSonucu = 'tamam';
    });
    await sekme.locator('#google-esitle').click();
    await expect(sekme.locator('#google-durum')).toContainText("Drive'dan");
    await sekme.goto('/');
    await sekme.locator('#ky-devam').click();
    await bekle(sekme);
    expect(await isaretler(kart(sekme, 'sen-5'))).toEqual(['A:is-wrong', 'E:was-revealed']);
    await ekrandaVeAcik(sekme, 'sen-6');
    await sekme.close();

    // Sign out: the token is revoked, records stay on the device
    await page.locator('#google-cikis').click();
    await expect(gDurum).toContainText('Çıkış yapıldı.');
    await expect(gDugme).toHaveText('Google ile eşitle');
    expect(await page.evaluate(() => (window as unknown as { __iptal?: string }).__iptal)).toBe('sahte-token');
    expect(await page.evaluate(() => localStorage.getItem('cevaplar-test-uni-course-senaryo'))).not.toBeNull();
    const sonYedek = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('google-esitleme-')));
    expect(sonYedek).toEqual([]);
  });

  test('10. Şıkka dokunup başka soruya kaydırınca menü açılıp kapanırken sayfa yerinde kalır', async ({ page }, info) => {
    await hazirla(page);
    await dersAc(page);
    // Reading mode: a tap on an option marks it (and used to leave focus in that card)
    await kart(page, 'sen-5').getByTestId('option-A').click();
    const mobil = (page.viewportSize()?.width ?? 1280) < 768;
    if (mobil) {
      // Two real swipes (touch events, the phone scroll snap moves one question per swipe)
      const cdp = await page.context().newCDPSession(page);
      for (let i = 0; i < 2; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 650 }] });
        for (let k = 1; k <= 10; k++) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 650 - k * 45 }] });
          await page.waitForTimeout(16);
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(700);
      }
    } else {
      await page.mouse.move(640, 500);
      await page.mouse.wheel(0, 900);
    }
    await expect.poll(() => simdiki(page), { timeout: 5000 }).not.toBe('sen-5');
    // Then a jump the page makes itself (unit chip, table of contents, link): focus stays where it was
    await page.evaluate(() => document.querySelector('.question-card[data-anahtar="sen-8"]')?.scrollIntoView({ block: 'start' }));
    await expect.poll(() => simdiki(page), { timeout: 5000 }).toBe('sen-8');
    await page.waitForTimeout(1200);
    const once = { soru: await simdiki(page), y: await page.evaluate(() => Math.round(scrollY)) };
    await ekran(page, info, '10-kaydirdiktan-sonra');

    // Menu from the bar button, closed with its close button
    const menu = await katmanAc(page, 'm', 'Tüm menü', '#btn-mobil-menu');
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => Math.round(scrollY)), 'menü açıkken sayfa kaymaz').toBe(once.y);
    await menu.getByRole('button', { name: 'Kapat' }).click();
    await expect(menu).toBeHidden();
    await page.waitForTimeout(600);
    expect({ soru: await simdiki(page), y: await page.evaluate(() => Math.round(scrollY)) }).toEqual(once);

    // Same with the M shortcut and Escape (no trigger to return focus to)
    await katmanAc(page, 'm', 'Tüm menü');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Tüm menü' })).toBeHidden();
    await page.waitForTimeout(600);
    expect({ soru: await simdiki(page), y: await page.evaluate(() => Math.round(scrollY)) }).toEqual(once);
    // The position record follows the question on screen
    await kayitBekle(page, 'test-uni/course-senaryo', once.soru as string);
    await ekran(page, info, '10-menu-kapandiktan-sonra');
  });
});
