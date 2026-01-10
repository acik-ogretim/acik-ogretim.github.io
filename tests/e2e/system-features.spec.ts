import { expect, test } from '@playwright/test';

test.describe('Portal Core System Features', () => {

    test.describe('Tema Sistemi', () => {
        test('Tema değişikliği çalışmalı', async ({ page }) => {
            await page.goto('/');

            const lightBtn = page.getByTestId('theme-toggle-light');
            const darkBtn = page.getByTestId('theme-toggle-dark');

            await lightBtn.click();
            await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

            await page.reload();
            await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

            await darkBtn.click();
            await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        });

        test('Dark tema kalıcılığı', async ({ page }) => {
            await page.goto('/');

            await page.getByTestId('theme-toggle-dark').click();
            await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

            await page.reload();
            await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        });
    });

    test.describe('Aktif/Pasif Filtreleme', () => {
        test('Aktif bölümler görünmeli, pasifler gizlenmeli', async ({ page }) => {
            await page.goto('/test-uni');

            await expect(page.getByTestId('dept-card-test-dept-active')).toBeAttached();
            await expect(page.getByTestId('dept-card-test-dept-passive')).not.toBeAttached();
        });
    });

    test.describe('Veri Bütünlüğü', () => {
        test('Normal ders sayfası soru kartları içermeli', async ({ page }) => {
            await page.goto('/test-uni/test-dept-active/course-active-1');
            await expect(page.getByTestId('question-card').first()).toBeAttached();
        });

        test('Boş cevaplı sorular sistem çökertmemeli', async ({ page }) => {
            await page.goto('/test-uni/test-dept-active/course-empty-answer');
            await expect(page.getByTestId('question-card')).toBeAttached();
        });
    });

    test.describe('Hata Yönetimi', () => {
        test('Geçersiz URL 404 dönmeli', async ({ page }) => {
            const response = await page.goto('/universite/invalid-12345');
            expect(response?.status()).toBe(404);
        });
    });

    test.describe('Performans', () => {
        test('Ana sayfa 3 saniyeden kısa sürede yüklenmeli', async ({ page }) => {
            const startTime = Date.now();
            await page.goto('/');
            await page.waitForLoadState('domcontentloaded');
            const loadTime = Date.now() - startTime;

            expect(loadTime).toBeLessThan(3000);
        });

        test('Kritik sayfalar 200 status dönmeli', async ({ page }) => {
            const pages = ['/', '/anadolu-aof', '/ataturk-aof', '/auzef', '/test-uni/test-dept-active'];

            for (const path of pages) {
                const response = await page.goto(path);
                expect(response?.status()).toBe(200);
            }
        });
    });

    test.describe('Sayfa Yapısı', () => {
        test('Ana sayfa üniversite kartları içermeli', async ({ page }) => {
            await page.goto('/');

            await expect(page.getByTestId('uni-card-anadolu-aof')).toBeAttached();
            await expect(page.getByTestId('uni-card-ataturk-aof')).toBeAttached();
            await expect(page.getByTestId('uni-card-auzef')).toBeAttached();
        });

        test('Üniversite sayfası bölüm kartları içermeli', async ({ page }) => {
            await page.goto('/anadolu-aof');

            const deptCards = page.locator('[data-testid^="dept-card-"]');
            const count = await deptCards.count();
            expect(count).toBeGreaterThan(0);
        });

        test('Bölüm sayfası ders kartları içermeli', async ({ page }) => {
            await page.goto('/test-uni/test-dept-active');

            await expect(page.getByTestId('course-card-course-active-1')).toBeAttached();
        });
    });

});
