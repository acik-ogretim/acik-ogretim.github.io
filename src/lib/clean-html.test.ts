import { describe, it, expect } from 'vitest';
import { cleanHtml } from '../../scripts/utils/clean-html';

describe('cleanHtml', () => {
    it('should preserve structural breaks between paragraphs with a space between them', () => {
        const input = '<p>A.</p> <p>B.</p>';
        const result = cleanHtml(input, { university: 'anadolu' });
        expect(result).toMatch(/A\.<br\s*\/?>\s*B\./);
    });

    it('should preserve structural breaks between V-Stres and the following text', () => {
        const input = '<p>V-Stres her zaman bir hasarın sonucu değildir.</p>Yukarıdakilerden hangisi ya da hangileri stres ile ilgili doğru ifadeler arasında yer almaktadır?';
        const result = cleanHtml(input, { university: 'anadolu' });
        expect(result).toContain('değildir.<br/>Yukarıdakilerden');
    });

    it('should remove redundant wrapping strong tags', () => {
        const input = '<strong>Why you need to know accounting?</strong>';
        const result = cleanHtml(input, { university: 'anadolu' });
        expect(result).toBe('Why you need to know accounting?');
    });

    it('should remove redundant wrapping bold tags in options', () => {
        const input = '<b>Erozyon</b>';
        const result = cleanHtml(input, { university: 'anadolu' });
        expect(result).toBe('Erozyon');
    });

    it('should NOT merge mid-sentence line breaks in Anadolu', () => {
        const input = 'This is a test <br/> that should NOT be merged in Anadolu.';
        const result = cleanHtml(input, { university: 'anadolu' });
        // result will have spaces normalized around <br/>
        expect(result).toMatch(/test\s*<br\s*\/?>\s*that/);
    });

    it('should merge mid-sentence line breaks if NOT anadolu', () => {
        const input = 'this is a sentence <br/> that continues.';
        const result = cleanHtml(input, { university: 'ataturk' });
        // Ataturk/Global should merge mid-sentence breaks
        expect(result).toBe('this is a sentence that continues.');
    });

    it('should NOT merge mid-sentence line breaks if the next part starts with uppercase', () => {
        const input = 'This is a test. <br/> This should stay separate.';
        const result = cleanHtml(input, { university: 'anadolu' });
        expect(result).toContain('test.<br/>This');
    });
});
