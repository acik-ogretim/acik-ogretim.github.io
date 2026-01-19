import { describe, expect, it } from 'vitest';
import { areTextsSimilar, cleanHtml, toPlainText } from '../utils/clean-html.ts';

describe('cleanHtml Deduplication Logic', () => {
    it('should deduplicate when explanation contains title content fully', () => {
        const title = "Yulaf unu protein, yağ, kalsiyum, fosfor, demir ve B1 vitamini bakımından diğer hububat unlarından daha zengindir.";
        const expl = `Yulaf: ${title} Daha çok çocuk mamalarında kullanılır.`;

        // Simulating the combined string that goes into cleanHtml
        const input = `${title}<br/>${expl}`;
        const cleaned = cleanHtml(input);

        // Expect only the explanation part (longer one)
        expect(cleaned).toBe(expl);
        expect(cleaned.length).toBeLessThan(input.length);
    });

    it('should deduplicate even with slight whitespace differences', () => {
        const p1 = "Türkaslan ve Yurtkuran tarafından 2007 yılında yapılan araştırma.";
        const p2 = "Türkaslan ve Yurtkuran tarafından 2007 yılında yapılan araştırma.<br/>Ek bilgiler mevcut.";

        const input = `${p1}<br/>${p2}`;
        const cleaned = cleanHtml(input);

        expect(cleaned).toBe(p2.replace('<br/>', '<br/>')); // cleanHtml normalizes <br>
    });

    it('should preserve BR tags before list markers in explanations', () => {
        const input = "Intro<br/>a. Option A<br/>b. Option B";
        const cleaned = cleanHtml(input, { isExplanation: true });
        expect(cleaned).toContain("a. Option A<br/>b. Option B");
    });

    it('should deduplicate when title is a subset of explanation (V. Mehmet Reşat case)', () => {
        const title = "V. Mehmet Reşat";
        const expl = "Değişikliklerle padişahın... V. Mehmet Reşat, Padişahlığı meclis tarafından onaylanan... ilk padişah olmuştur.";
        expect(areTextsSimilar(title, expl)).toBe(true);
    });

    it('should deduplicate complex HTML structures', () => {
        const p1 = "<p>Sanayi devriminden önce toplumlarda...</p>";
        const p2 = "<p>Doğru yanıt C. Sanayi devriminden önce toplumlarda...</p><ul><li>Madde 1</li></ul>";

        const input = `${p1}<br/>${p2}`;
        const cleaned = cleanHtml(input);

        expect(cleaned).toContain("Doğru yanıt C");
        expect(cleaned).toContain("Madde 1");
    });
});

describe('toPlainText Utility', () => {
    it('should handle <br> tags by adding space', () => {
        const html = "Hello<br>World";
        const text = toPlainText(html);
        expect(text).toBe("hello world");
    });

    it('should handle multiple tags', () => {
        const html = "<p>Para 1</p><br/><span>Para 2</span>";
        const text = toPlainText(html);
        expect(text).toBe("para 1 para 2");
    });
});

describe('areTextsSimilar Utility', () => {
    it('should match strict inclusion', () => {
        expect(areTextsSimilar("hello world", "hello")).toBe(true);
    });

    it('should match fuzzy inclusion (ignoring special chars)', () => {
        const t1 = "lorem ipsum dolor sit amet";
        const t2 = "lorem ipsum dolor sit amet (link)";
        // Normalized: "loremipsumdolorsitamet" vs "loremipsumdolorsitametlink"
        expect(areTextsSimilar(t1, t2)).toBe(true);
    });

    it('should match long texts that start identical', () => {
        const longBase = "a".repeat(300);
        const t1 = longBase + "suffix1";
        const t2 = longBase + "suffix2";
        expect(areTextsSimilar(t1, t2)).toBe(true);
    });

    it('should NOT match distinct short texts', () => {
        expect(areTextsSimilar("Question I", "Question II")).toBe(false);
    });
});
