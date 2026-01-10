import { expect, test } from '@playwright/test';

test.describe('Quiz Etkileşim Testleri', () => {

    test.describe('Cevap Kontrolü', () => {
        test('Doğru seçenek tıklandığında işaretlenmeli', async ({ page }) => {
            await page.goto('/test-uni/test-dept-active/course-active-1');

            const firstQuestion = page.getByTestId('question-card').first();
            await expect(firstQuestion).toBeAttached();

            const optionA = firstQuestion.getByTestId('option-A');
            await optionA.click();

            await expect(optionA).toHaveClass(/is-correct|was-revealed/);
        });

        test('Yanlış seçenek tıklandığında işaretlenmeli ve doğru gösterilmeli', async ({ page }) => {
            await page.goto('/test-uni/test-dept-active/course-active-1');

            const firstQuestion = page.getByTestId('question-card').first();

            const optionB = firstQuestion.getByTestId('option-B');
            await optionB.click();

            await expect(optionB).toHaveClass(/is-wrong/);

            const optionA = firstQuestion.getByTestId('option-A');
            await expect(optionA).toHaveClass(/was-revealed/);
        });
    });

    test.describe('Açıklama Gösterimi', () => {
        test('Cevap sonrası açıklama kutusu görünmeli', async ({ page }) => {
            await page.goto('/test-uni/test-dept-active/course-active-1');

            const firstQuestion = page.getByTestId('question-card').first();

            await firstQuestion.getByTestId('option-A').click();

            const explanation = firstQuestion.locator('.explanation-box');
            await expect(explanation).toHaveClass(/reveal/);
        });
    });

    test.describe('İstatistikler', () => {
        test('Doğru cevap sayacı artmalı', async ({ page }) => {
            await page.goto('/test-uni/test-dept-active/course-active-1');

            const correctCount = page.locator('#correct-count');
            const wrongCount = page.locator('#wrong-count');

            await expect(correctCount).toHaveText('0');
            await expect(wrongCount).toHaveText('0');

            const firstQuestion = page.getByTestId('question-card').first();
            await firstQuestion.getByTestId('option-A').click();

            await expect(correctCount).toHaveText('1');
        });
    });

    test.describe('Soru Kartı Yapısı', () => {
        test('Soru kartı 5 seçenek butonu içermeli', async ({ page }) => {
            await page.goto('/test-uni/test-dept-active/course-active-1');

            const firstQuestion = page.getByTestId('question-card').first();

            await expect(firstQuestion.getByTestId('option-A')).toBeAttached();
            await expect(firstQuestion.getByTestId('option-B')).toBeAttached();
            await expect(firstQuestion.getByTestId('option-C')).toBeAttached();
            await expect(firstQuestion.getByTestId('option-D')).toBeAttached();
            await expect(firstQuestion.getByTestId('option-E')).toBeAttached();
        });
    });

});
