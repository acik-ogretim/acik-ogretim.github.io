import { expect, test } from '@playwright/test';

test.describe('Materyal Sayfası Testleri', () => {

    test('Materyal sayfası yüklenmeli', async ({ page }) => {
        // Test verisindeki ders için materyal sayfasına git
        const response = await page.goto('/test-uni/test-dept-active/course-active-1/materyaller');

        // Sayfa başarıyla yüklenmeli (404 olmamalı)
        expect(response?.status()).toBe(200);

        // Başlık elementi var olmalı
        const heading = page.locator('h1');
        await expect(heading).toBeAttached();
    });

    test('Derse geri dön linki çalışmalı', async ({ page }) => {
        await page.goto('/test-uni/test-dept-active/course-active-1/materyaller');

        // "Derse Dön" veya benzer bir link olmalı
        const backLink = page.locator('a[href="/test-uni/test-dept-active/course-active-1"]');
        await expect(backLink.first()).toBeAttached();
    });

    test('Gerçek üniversite materyalleri yüklenmeli (Atatürk AÖF)', async ({ page }) => {
        // Gerçek veri ile test - Atatürk AÖF'de materyal içeriği var
        await page.goto('/ataturk-aof/acil-durum-ve-afet-yonetimi/acil-durum-ve-afet-yonetimine-giris/materyaller');

        // Sayfa yüklenmeli
        const heading = page.locator('h1');
        await expect(heading).toBeAttached();

        // Materyaller bölümünde en az bir içerik olmalı (accordion/summary veya material-btn)
        const materialContent = page.locator('summary, .material-btn, details');
        const count = await materialContent.count();
        expect(count).toBeGreaterThan(0);
    });

});
