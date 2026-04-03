import { describe, expect, it } from 'vitest';
import { cleanHtml } from '../utils/clean-html';

describe('Turkish Character Normalization & Decoding', () => {

    describe('Hex & Decimal Entity Decoding', () => {
        it('should decode common Turkish hex entities identified in raw Anadolu data', () => {
            const input = 'A&#xf6;f; g&#xfc;ncel, &#x15f;effaf, geli&#x15f;mi&#x15f; ve &#xe7;&#xf6;z&#xfc;m odakli.';
            const output = cleanHtml(input);
            expect(output).toBe('Aöf; güncel, şeffaf, gelişmiş ve çözüm odakli.');
        });

        it('should decode Turkish decimal entities', () => {
            const input = 'A&#246;f; g&#252;ncel, &#351;effaf, geli&#351;mi&#351; ve &#231;&#246;z&#252;m odakli.';
            const output = cleanHtml(input);
            expect(output).toBe('Aöf; güncel, şeffaf, gelişmiş ve çözüm odakli.');
        });

        it('should decode mixed hex/decimal and uppercase entities', () => {
            const input = '&#xD6;&#x130;RENME - &#214;&#304;RENME';
            const output = cleanHtml(input);
            expect(output).toBe('ÖİRENME - ÖİRENME');
        });
    });

    describe('OCR & Raw Byte Repairs (text-repair)', () => {
        it('should repair raw bytecode artifacts (\\x16, \\x12, \\x14) common in OCR outputs', () => {
            // These characters are replaced in repairText (\x16 -> ü, \x12 -> ş, \x14 -> ğ)
            const input = "\x16retim ve da\x14\u0131t\u0131m a\x14\u0131 (Hizmet \x12emas\u0131)";
            const output = cleanHtml(input);
            expect(output).toBe('üretim ve dağıtım ağı (Hizmet şeması)');
        });

        it('should fix specific common AÖF OCR typos based on dictionary patterns', () => {
            const inputs = [
                { raw: 'düşnür', expected: 'düşünür' },
                { raw: 'doymanş', expected: 'doymamış' },
                { raw: 'öğrencilern', expected: 'öğrencilerin' },
                { raw: 'acilmüdahale', expected: 'acil müdahale' }
            ];

            inputs.forEach(({ raw, expected }) => {
                expect(cleanHtml(raw)).toContain(expected);
            });
        });
    });

    describe('Unicode Normalization (NFD to NFC)', () => {
        it('should normalize decomposed Turkish characters (NFD) to composed forms (NFC)', () => {
            // "O" + "¨" (U+0308 Combining Diaeresis) -> "Ö" (NFC)
            // "g" + "˘" (U+0306 Combining Breve) -> "ğ" (NFC)
            const nfd = 'O\u0308g\u0306renme'; 
            const output = cleanHtml(nfd);
            expect(output).toBe('Öğrenme');
            expect(output.normalize('NFC')).toBe(output); // Ensuring it IS NFC
        });
    });

    describe('Smart Punctuation & Quotes', () => {
        it('should decode smart quote entities', () => {
            const input = '&#x201c;Al\u0131nt\u0131&#x201d; ve &#x2018;tekli&#x2019; t\u0131rnak.';
            const output = cleanHtml(input);
            expect(output).toBe('“Alıntı” ve ‘tekli’ tırnak.');
        });
    });

    describe('Artifact Stripping around Turkish Words', () => {
        it('should remove mid-word footnote markers from Turkish words', () => {
            const input = 'Ege[1]menliğin ve hürr[5]iyetin temeli[91].';
            const output = cleanHtml(input);
            expect(output).toBe('Egemenliğin ve hürriyetin temeli.');
        });

        it('should strip obsolete font/span wrappers often found in raw Anadolu files', () => {
            const input = 'Durum<span style="font-family: monospace;">ı</span> hakk<span style="font-family: monospace;">ı</span>enda.';
            const output = cleanHtml(input);
            expect(output).toBe('Durumı hakkıenda.');
        });
    });
});
