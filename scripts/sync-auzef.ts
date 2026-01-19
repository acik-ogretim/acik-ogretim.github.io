import fs from 'fs';
import path from 'path';
import { cleanHtml, toPlainText } from './utils/clean-html.ts';
import type { AppQuestion } from './utils/sync-core.ts';
import { saveQuestions } from './utils/sync-core.ts';

// Configurations
const PORTAL_ROOT = process.cwd();
const MCP_ROOT = path.resolve(PORTAL_ROOT, '../acik-ogretim-mcp');
const SOURCE_DIR = path.join(MCP_ROOT, 'data/raw/auzef');
const TARGET_DIR = path.join(PORTAL_ROOT, 'data/questions/auzef');

interface RawMcpQuestion {
    QuestionId: number;
    UniteNo: number;
    AnswerExplanation?: string;
    Title?: string;
    Text: string;
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
    CorrectAnswer: string;
}

function processCourse(slug: string) {
    const rawFilePath = path.join(SOURCE_DIR, slug, 'alistirma-sorulari.json');
    if (!fs.existsSync(rawFilePath)) return;

    try {
        const rawContent = fs.readFileSync(rawFilePath, 'utf-8');
        const rawData: RawMcpQuestion[] = JSON.parse(rawContent);

        const technicalKeywords = ['programlama', 'algoritma', 'kodlama', 'web', 'veritabanı', 'internet-prog', 'yazılım-müh', 'yazılım-gelistirme', 'veri-yapilari', 'veri-madenciligi', 'tasarim', 'modelleme'];
        const isTechnical = technicalKeywords.some(kw => slug.toLowerCase().includes(kw));

        const appQuestions: AppQuestion[] = rawData.map(raw => {
            const cTitle = cleanHtml(raw.Title || "");
            const cExpl = cleanHtml(raw.AnswerExplanation || "");
            const tNorm = toPlainText(raw.Title || "");
            const eNorm = toPlainText(raw.AnswerExplanation || "");

            let finalExpl = "";
            if (raw.AnswerExplanation && raw.Title) {
                if (eNorm.includes(tNorm) || tNorm.includes(eNorm)) {
                    finalExpl = (cExpl.length >= cTitle.length) ? cExpl : cTitle;
                } else {
                    finalExpl = cTitle + "<br/>" + cExpl;
                }
            } else {
                finalExpl = cExpl || cTitle;
            }

            if (finalExpl) {
                finalExpl = cleanHtml(finalExpl, { isExplanation: true, disableChoiceCleanup: true });
            }

            const q: AppQuestion = {
                id: String(raw.QuestionId),
                unitNumber: raw.UniteNo || 0,
                text: cleanHtml(raw.Text, { isTechnical }),
                correctAnswer: (raw.CorrectAnswer || "").trim().toUpperCase(),
                options: {
                    A: cleanHtml(raw.A, { isTechnical }),
                    B: cleanHtml(raw.B, { isTechnical }),
                    C: cleanHtml(raw.C, { isTechnical }),
                    D: cleanHtml(raw.D, { isTechnical }),
                    E: cleanHtml(raw.E, { isTechnical })
                }
            };

            if (finalExpl && finalExpl.length > 5) {
                q.explanation = cleanHtml(finalExpl, { isTechnical, isExplanation: true, disableChoiceCleanup: true });
            }

            return q;
        });

        saveQuestions(slug, appQuestions, TARGET_DIR);
        console.log(`✅ Synced AUZEF: ${slug} (${appQuestions.length} questions)`);

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

    console.log(`Found ${slugs.length} AUZEF courses in MCP.`);
    slugs.forEach(processCourse);
}

syncAll();
