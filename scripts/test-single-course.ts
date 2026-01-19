import fs from 'fs';
import path from 'path';
import { cleanHtml } from './utils/clean-html.ts';

const MCP_ROOT = path.resolve('../acik-ogretim-mcp');
const PORTAL_ROOT = process.cwd();
const RAW_ANADOLU_DIR = path.join(MCP_ROOT, 'data/raw/anadolu-aof');
const TARGET_ANADOLU_DIR = path.join(PORTAL_ROOT, 'data/questions/anadolu-aof');

const slug = 'webde-telif-haklari-ve-etik';
const courseRawDir = path.join(RAW_ANADOLU_DIR, slug);
const destFilePath = path.join(TARGET_ANADOLU_DIR, slug + '.json');

// Technical check
const technicalKeywords = ['programlama', 'algoritma', 'kodlama', 'web', 'veritaban', 'internet-prog', 'yazılım', 'veri-yapilari', 'tasarim', 'modelleme'];
const isTechnical = technicalKeywords.some(kw => slug.toLowerCase().includes(kw));

console.log(`🔧 Processing ${slug} (Technical: ${isTechnical})\n`);

interface AppQuestion {
    id: string;
    unitNumber: number;
    text: string;
    correctAnswer: string;
    options: Record<string, string>;
    explanation?: string;
}

const questions: AppQuestion[] = [];
const ids = new Set<string>();

// Process alistirma-sorulari.json
const alistirmaPath = path.join(courseRawDir, 'alistirma-sorulari.json');
if (fs.existsSync(alistirmaPath)) {
    console.log('📖 Reading alistirma-sorulari.json...');
    const content = fs.readFileSync(alistirmaPath, 'utf-8');
    const rawData = JSON.parse(content);
    const rawList = Array.isArray(rawData) ? rawData : (rawData.questions || rawData.data || rawData.Sorular || []);

    console.log(`   Found ${rawList.length} questions\n`);

    rawList.forEach((raw: any, idx: number) => {
        // Combine Title and AnswerExplanation for richer explanation
        let explanation = '';
        if (raw.Title) {
            explanation = cleanHtml(raw.Title, { isTechnical });
        }
        if (raw.AnswerExplanation) {
            const answerExp = cleanHtml(raw.AnswerExplanation, { isTechnical });
            if (answerExp && answerExp !== explanation) {
                explanation = explanation ? `${explanation}<br/>${answerExp}` : answerExp;
            }
        }

        const mapped: AppQuestion = {
            id: String(raw.QuestionId || raw.id || raw.ID),
            unitNumber: Number(raw.UniteNo || raw.unitNumber || 0),
            text: cleanHtml(raw.Text || raw.question || raw.text || '', { isTechnical }),
            correctAnswer: (raw.CorrectAnswer || raw.correctAnswer || '').trim().toUpperCase(),
            options: {},
            explanation: explanation || undefined
        };

        ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
            if (raw[opt] !== undefined) {
                const cleaned = cleanHtml(raw[opt] || '', { isTechnical });
                mapped.options[opt] = cleaned;

                // Debug: Show first 5 questions with class attributes
                if (idx < 5 && raw[opt] && raw[opt].includes('class=')) {
                    console.log(`   Q${idx + 1} Option ${opt}:`);
                    console.log(`      Before: ${raw[opt].substring(0, 100)}...`);
                    console.log(`      After:  ${cleaned.substring(0, 100)}...`);
                }
            }
        });

        if (!ids.has(mapped.id)) {
            questions.push(mapped);
            ids.add(mapped.id);
        }
    });
}

const validQuestions = questions.filter(q => {
    const hasCorrectAnswer = q.correctAnswer && q.correctAnswer.trim() !== '';
    const hasOptions = q.options && Object.keys(q.options).length > 0;
    return hasCorrectAnswer && hasOptions;
});

if (validQuestions.length > 0) {
    fs.writeFileSync(destFilePath, JSON.stringify(validQuestions, null, 2));
    console.log(`\n✅ Synced ${slug} (${validQuestions.length} questions)`);
    console.log(`   Saved to: ${destFilePath}`);
} else {
    console.log(`\n⚠️  No valid questions found for ${slug}`);
}
