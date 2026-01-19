import fs from 'fs';
import path from 'path';
import { cleanHtml } from './utils/clean-html.ts';

const MCP_ROOT = path.resolve('../acik-ogretim-mcp');
const PORTAL_ROOT = process.cwd();
const RAW_ANADOLU_DIR = path.join(MCP_ROOT, 'data/raw/anadolu-aof');
const TARGET_ANADOLU_DIR = path.join(PORTAL_ROOT, 'data/questions/anadolu-aof');

// Teknik anahtar kelimeler
const technicalKeywords = [
    'programlama', 'algoritma', 'kodlama', 'web', 'veritaban',
    'internet', 'yazilim', 'veri', 'tasarim', 'modelleme',
    'bilgisayar', 'grafik'
];

interface AppQuestion {
    id: string;
    unitNumber: number;
    text: string;
    correctAnswer: string;
    options: Record<string, string>;
    explanation?: string;
}

function processCourse(slug: string): number {
    const courseRawDir = path.join(RAW_ANADOLU_DIR, slug);
    const destFilePath = path.join(TARGET_ANADOLU_DIR, slug + '.json');

    const isTechnical = technicalKeywords.some(kw => slug.toLowerCase().includes(kw));

    const questions: AppQuestion[] = [];
    const ids = new Set<string>();

    // Process alistirma-sorulari.json
    const alistirmaPath = path.join(courseRawDir, 'alistirma-sorulari.json');
    if (fs.existsSync(alistirmaPath)) {
        try {
            const content = fs.readFileSync(alistirmaPath, 'utf-8');
            const rawData = JSON.parse(content);
            const rawList = Array.isArray(rawData) ? rawData : (rawData.questions || rawData.data || rawData.Sorular || []);

            rawList.forEach((raw: any) => {
                const mapped: AppQuestion = {
                    id: String(raw.QuestionId || raw.id || raw.ID),
                    unitNumber: Number(raw.UniteNo || raw.unitNumber || 0),
                    text: cleanHtml(raw.Text || raw.question || raw.text || '', { isTechnical }),
                    correctAnswer: (raw.CorrectAnswer || raw.correctAnswer || '').trim().toUpperCase(),
                    options: {},
                    explanation: raw.AnswerExplanation ? cleanHtml(raw.AnswerExplanation, { isTechnical }) : undefined
                };

                ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
                    if (raw[opt] !== undefined) {
                        mapped.options[opt] = cleanHtml(raw[opt] || '', { isTechnical });
                    }
                });

                if (!ids.has(mapped.id)) {
                    questions.push(mapped);
                    ids.add(mapped.id);
                }
            });
        } catch (e) {
            // Skip malformed files
        }
    }

    // Process cikmis-sorular.json
    const cikmisPath = path.join(courseRawDir, 'cikmis-sorular.json');
    if (fs.existsSync(cikmisPath)) {
        try {
            const content = fs.readFileSync(cikmisPath, 'utf-8');
            const rawData = JSON.parse(content);
            const rawList = Array.isArray(rawData) ? rawData : (rawData.questions || rawData.data || rawData.Sorular || []);

            rawList.forEach((raw: any) => {
                // Handle exam question format
                let mapped: AppQuestion;

                if (raw.options && Array.isArray(raw.options)) {
                    // Exam format
                    const optionsObj: Record<string, string> = {};
                    const optLabels = ['A', 'B', 'C', 'D', 'E'];
                    raw.options.forEach((opt: string, idx: number) => {
                        if (idx < 5) {
                            optionsObj[optLabels[idx]] = cleanHtml(opt || '', { isTechnical });
                        }
                    });

                    mapped = {
                        id: String(raw.id || raw.QuestionId || raw.ID),
                        unitNumber: Number(raw.exam_question_number || raw.UniteNo || 0),
                        text: cleanHtml(raw.question || raw.Text || '', { isTechnical }),
                        correctAnswer: optLabels[raw.correctIndex] || '',
                        options: optionsObj,
                        explanation: raw.explanation ? cleanHtml(raw.explanation, { isTechnical }) : undefined
                    };
                } else {
                    // Standard format
                    mapped = {
                        id: String(raw.QuestionId || raw.id || raw.ID),
                        unitNumber: Number(raw.UniteNo || raw.unitNumber || 0),
                        text: cleanHtml(raw.Text || raw.question || raw.text || '', { isTechnical }),
                        correctAnswer: (raw.CorrectAnswer || raw.correctAnswer || '').trim().toUpperCase(),
                        options: {},
                        explanation: raw.AnswerExplanation ? cleanHtml(raw.AnswerExplanation, { isTechnical }) : undefined
                    };

                    ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
                        if (raw[opt] !== undefined) {
                            mapped.options[opt] = cleanHtml(raw[opt] || '', { isTechnical });
                        }
                    });
                }

                if (!ids.has(mapped.id)) {
                    questions.push(mapped);
                    ids.add(mapped.id);
                }
            });
        } catch (e) {
            // Skip malformed files
        }
    }

    const validQuestions = questions.filter(q => {
        const hasCorrectAnswer = q.correctAnswer && q.correctAnswer.trim() !== '';
        const hasOptions = q.options && Object.keys(q.options).length > 0;
        return hasCorrectAnswer && hasOptions;
    });

    if (validQuestions.length > 0) {
        fs.writeFileSync(destFilePath, JSON.stringify(validQuestions, null, 2));
    }

    return validQuestions.length;
}

// Main
console.log('🔍 Teknik dersleri tespit ediliyor...\n');

const allCourses = fs.readdirSync(RAW_ANADOLU_DIR).filter(item => {
    if (item === '.DS_Store') return false;
    try {
        return fs.statSync(path.join(RAW_ANADOLU_DIR, item)).isDirectory();
    } catch { return false; }
});

const technicalCourses = allCourses.filter(slug => {
    const lowerSlug = slug.toLowerCase();
    return technicalKeywords.some(kw => lowerSlug.includes(kw));
});

console.log(`📚 Toplam ders: ${allCourses.length}`);
console.log(`💻 Teknik ders: ${technicalCourses.length}\n`);
console.log('🚀 Sync başlıyor...\n');

let totalQuestions = 0;
let successCount = 0;

technicalCourses.forEach((slug, idx) => {
    const count = processCourse(slug);
    if (count > 0) {
        console.log(`✅ [${idx + 1}/${technicalCourses.length}] ${slug}: ${count} soru`);
        totalQuestions += count;
        successCount++;
    } else {
        console.log(`⚠️  [${idx + 1}/${technicalCourses.length}] ${slug}: Soru bulunamadı`);
    }
});

console.log(`\n✅ Tamamlandı! ${successCount} ders, ${totalQuestions} soru işlendi.`);
