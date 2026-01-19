import fs from 'fs';
import path from 'path';
import { areTextsSimilar, cleanHtml, toPlainText } from './utils/clean-html.ts';
import type { AppQuestion } from './utils/sync-core.ts';
import { saveQuestions } from './utils/sync-core.ts';

// Configurations
const PORTAL_ROOT = process.cwd();
const MCP_ROOT = path.resolve(PORTAL_ROOT, '../acik-ogretim-mcp');
const SOURCE_DIR = path.join(MCP_ROOT, 'data/raw/auzef');
const TARGET_DIR = path.join(PORTAL_ROOT, 'data/questions/auzef');

interface RawMcpQuestion {
    // Standard IDs
    QuestionId?: string | number;
    SoruID?: string | number;
    id?: string | number;

    // Standard Fields (Anadolu/AUZEF Alıştırma)
    UniteNo?: number;
    unite_id?: number;
    Unite?: number;
    AnswerExplanation?: string;
    Title?: string;
    Text?: string;
    A?: string;
    B?: string;
    C?: string;
    D?: string;
    E?: string;
    CorrectAnswer?: string;

    // Alternative Fields (Sorular.json / Atatürk Style)
    SoruMetni?: string;
    Aciklama?: string;
    DogruCevap?: string;
    DogruYanit?: string;

    [key: string]: any;
}

function processCourse(slug: string) {
    const courseDir = path.join(SOURCE_DIR, slug);
    if (!fs.existsSync(courseDir)) return;

    try {
        const jsonFiles = fs.readdirSync(courseDir).filter(f =>
            f.endsWith('.json') && !f.includes('-aciklamalar')
        );

        if (jsonFiles.length === 0) return;

        const allRawQuestions: RawMcpQuestion[] = [];

        for (const file of jsonFiles) {
            try {
                const content = fs.readFileSync(path.join(courseDir, file), 'utf-8');
                const data = JSON.parse(content);
                const questions = Array.isArray(data) ? data : (data.questions || data.Sorular || data.data || []);
                allRawQuestions.push(...questions);
            } catch (err) {
                console.warn(`⚠️  Failed to parse ${file} in ${slug}`);
            }
        }

        const technicalKeywords = ['programlama', 'algoritma', 'kodlama', 'web', 'veritabanı', 'internet-prog', 'yazılım-müh', 'yazılım-gelistirme', 'veri-yapilari', 'veri-madenciligi', 'tasarim', 'modelleme'];
        const isTechnical = technicalKeywords.some(kw => slug.toLowerCase().includes(kw));

        const processedIds = new Set<string>();
        const appQuestions: AppQuestion[] = [];

        for (const raw of allRawQuestions) {
            // Map ID
            const rawId = String(raw.QuestionId || raw.SoruID || raw.id || '');
            if (!rawId && !raw.Text && !raw.SoruMetni) continue;

            const qId = rawId || toPlainText(raw.Text || raw.SoruMetni || '').substring(0, 50);
            if (processedIds.has(qId)) continue;
            processedIds.add(qId);

            // Normalize Fields
            let rawTitle = (raw.Title || "").trim();
            let rawExpl = (raw.AnswerExplanation || raw.Aciklama || raw.SoruA || "").trim();
            const text = (raw.Text || raw.SoruMetni || "").trim();
            const correctAnswer = (raw.CorrectAnswer || raw.DogruCevap || raw.DogruYanit || "").trim().toUpperCase();

            // 1. Clean Garbage Logic inside process loop
            const isGarbage = (s: string) => {
                if (s.includes('<img')) return false;
                const plain = s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().toLowerCase();
                if (plain.length < 2) return true;
                if (plain.length < 5 && /^[a-e0-9\W]+$/.test(plain)) return true;
                if (/^(?:doğru\s*)?(?:yanıt|cevap|şık|seçenek)\s*:?\s*[a-e](?:'|’)?(?:dır|dir|dur|dür|tır|tur|tir|tür)?(?:\s+(?:şık|seçenek|cevap|yanıt)(?:ı|i|u|ü)?(?:dır|dir|dur|dür|tır|tur|tir|tür)?)?\.?$/.test(plain)) return true;
                if (/^(?:şık|seçenek|cevap|yanıt)(?:ı|i|u|ü)?(?:dır|dir|dur|dür|tır|tur|tir|tür)\.?$/.test(plain)) return true;
                if (plain === 'hatırlatma' || plain === 'hatırlatma sorusu' || plain === 'soru') return true;
                return false;
            };

            if (isGarbage(rawTitle)) rawTitle = "";
            if (isGarbage(rawExpl)) rawExpl = "";

            // Swap Logic (Title vs Explanation)
            if (rawTitle.length > 200 && rawExpl.length < 100) {
                const temp = rawTitle;
                rawTitle = rawExpl;
                rawExpl = temp;
            }

            const cTitle = cleanHtml(rawTitle);
            const cExpl = cleanHtml(rawExpl, { isTechnical, isExplanation: true, disableChoiceCleanup: true });

            let finalExpl = "";
            if (rawExpl && rawTitle) {
                if (areTextsSimilar(toPlainText(rawTitle), toPlainText(rawExpl))) {
                    finalExpl = (cExpl.length >= cTitle.length) ? cExpl : cTitle;
                } else {
                    finalExpl = cTitle + "<br/>" + cExpl;
                }
            } else {
                finalExpl = cExpl || cTitle;
            }

            // Build options object, only including non-empty options
            const options: Record<string, string> = {};
            ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
                const val = cleanHtml(raw[opt] || '', { isTechnical });
                if (val) options[opt] = val;
            });

            const q: AppQuestion = {
                id: qId,
                unitNumber: raw.UniteNo || raw.unite_id || raw.Unite || 0,
                text: cleanHtml(text, { isTechnical }),
                correctAnswer,
                options
            };

            if (finalExpl.trim()) {
                // Formatting cleanups for explanation
                let expl = cleanHtml(finalExpl, { isTechnical, isExplanation: true, disableChoiceCleanup: true });

                // Trimming answer markers from explanation
                if (!expl.includes('<img') && !expl.includes('<table')) {
                    let lines = expl.split(/<br\s*\/?>/i);
                    const optVal = options[correctAnswer] ? toPlainText(options[correctAnswer]).trim().toLowerCase() : "";

                    if (lines.length > 0) {
                        const firstPlain = toPlainText(lines[0]).trim().toLowerCase();
                        if (isGarbage(lines[0]) || (optVal && areTextsSimilar(firstPlain, optVal))) {
                            lines.shift();
                        }
                    }
                    if (lines.length > 0 && isGarbage(lines[lines.length - 1])) {
                        lines.pop();
                    }
                    expl = lines.join('<br/>').trim();
                    if (toPlainText(expl).length < 2) expl = "";
                }

                if (expl) q.explanation = expl;
            }

            if (q.text && Object.keys(q.options).length > 0) {
                appQuestions.push(q);
            }
        }

        saveQuestions(slug, appQuestions, TARGET_DIR);
        console.log(`✅ Synced AUZEF: ${slug} (${appQuestions.length} questions from ${jsonFiles.length} files)`);

    } catch (e: any) {
        console.warn(`Error processing ${slug}:`, e.message);
    }
}

function syncAll() {
    if (!fs.existsSync(SOURCE_DIR)) {
        console.error(`Source directory not found: ${SOURCE_DIR}`);
        return;
    }

    if (!fs.existsSync(TARGET_DIR)) {
        fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    const slugs = fs.readdirSync(SOURCE_DIR).filter(f => {
        return fs.statSync(path.join(SOURCE_DIR, f)).isDirectory();
    });

    console.log(`Found ${slugs.length} AUZEF courses.`);
    for (const slug of slugs) {
        processCourse(slug);
    }
}

syncAll();
