
import fs from 'fs';
import path from 'path';
import { cleanHtml } from './utils/clean-html.js';
import type { AppQuestion } from './utils/sync-core.js';
import { normalizeTextForMap, saveQuestions, slugify } from './utils/sync-core.js';

// Configurations
const PORTAL_ROOT = process.cwd();
const DENEMELER_ROOT = path.resolve(PORTAL_ROOT, '../ataaof-denemeler');
const SOURCE_JSON_DIR = path.join(DENEMELER_ROOT, 'output/Anadolu/json');
const TARGET_DIR = path.join(PORTAL_ROOT, 'data/questions/anadolu-aof');

function processExerciseList(list: any[]): AppQuestion[] {
    const out: AppQuestion[] = [];
    list.forEach(q => {
        if (!q.SoruMetni && !q.Text) return; // Basic validation

        const mapped: AppQuestion = {
            id: String(q.SoruID || q.QuestionId),
            unitNumber: q.Unite || q.UniteNo || 0,
            text: cleanHtml(q.SoruMetni || q.Text),
            correctAnswer: (q.DogruCevap || q.CorrectAnswer || "").trim().toUpperCase(),
            options: {}
        };

        ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
            if (q[opt]) mapped.options[opt] = cleanHtml(q[opt]);
        });

        const rawExpl = q.Aciklama || q.AnswerExplanation || "";
        const rawTitle = q.Title || "";
        let finalExpl = rawExpl;

        if (rawTitle) {
            if (rawExpl) {
                const tNorm = cleanHtml(rawTitle).replace(/\s+/g, ' ').trim().toLowerCase();
                const eNorm = cleanHtml(rawExpl).replace(/\s+/g, ' ').trim().toLowerCase();

                if (eNorm.includes(tNorm)) {
                    // Explanation covers title
                    finalExpl = rawExpl;
                } else if (tNorm.includes(eNorm)) {
                    // Title covers explanation
                    finalExpl = rawTitle;
                } else {
                    // Concatenate
                    finalExpl = `${rawTitle}<br/>${rawExpl}`;
                }
            } else {
                finalExpl = rawTitle;
            }
        }

        if (finalExpl && finalExpl.length > 5) {
            mapped.explanation = cleanHtml(finalExpl);
        }

        out.push(mapped);
    });
    return out;
}

function processExamList(list: any[]): AppQuestion[] {
    const out: AppQuestion[] = [];
    list.forEach(q => {
        const qId = q.id;
        const matId = q.material_id || "unknown";
        const uniqueId = `exam-${matId}-${qId}`;

        let uNo = 0;
        if (typeof q.unitNumber === 'number') uNo = q.unitNumber;
        else if (typeof q.UniteNo === 'number') uNo = q.UniteNo;
        else if (typeof q.Unite === 'number') uNo = q.Unite;

        const txt = q.question || q.text || "";

        const mapped: AppQuestion = {
            id: uniqueId,
            unitNumber: uNo,
            text: cleanHtml(txt),
            correctAnswer: ["A", "B", "C", "D", "E"][q.correctIndex] || "",
            options: {}
        };

        if (q.options && Array.isArray(q.options)) {
            q.options.forEach((opt: string, idx: number) => {
                const key = ["A", "B", "C", "D", "E"][idx];
                if (key) mapped.options[key] = cleanHtml(opt);
            });
        }

        if (q.explanation && q.explanation.length > 5) {
            mapped.explanation = cleanHtml(q.explanation);
        }

        out.push(mapped);
    });
    return out;
}


function processAll() {
    if (!fs.existsSync(SOURCE_JSON_DIR)) {
        console.error(`Source directory not found: ${SOURCE_JSON_DIR}`);
        return;
    }

    const courseFiles: { [slug: string]: { exercises: string[], exams: string[] } } = {};
    const terms = fs.readdirSync(SOURCE_JSON_DIR);

    terms.forEach(term => {
        if (term === '.DS_Store') return;
        const termPath = path.join(SOURCE_JSON_DIR, term);
        try { if (!fs.statSync(termPath).isDirectory()) return; } catch { return; }

        const files = fs.readdirSync(termPath);
        files.forEach(f => {
            if (!f.endsWith('.json')) return;
            const parts = f.replace('.json', '').split(' - ');
            if (parts.length < 4) return;

            const courseName = parts[2];
            const type = parts[3];
            const suffix = parts[4] || "";

            if (suffix === 'Raw') return;
            if (type !== 'Alıştırma Soruları' && type !== 'Çıkmış Sorular') return;
            if (type === 'Çıkmış Sorular' && suffix !== 'Enriched') return;

            const slug = slugify(courseName);
            if (!courseFiles[slug]) courseFiles[slug] = { exercises: [], exams: [] };

            const fullPath = path.join(termPath, f);

            if (type === 'Alıştırma Soruları') {
                courseFiles[slug].exercises.push(fullPath);
            } else if (type === 'Çıkmış Sorular') {
                courseFiles[slug].exams.push(fullPath);
            }
        });
    });

    console.log(`Found ${Object.keys(courseFiles).length} courses in Enriched source.`);

    for (const slug of Object.keys(courseFiles)) {
        const fileSet = courseFiles[slug];
        let allQuestions: AppQuestion[] = [];
        const seenIds = new Set<string>();

        const textToUnitMap = new Map<string, number>();

        const collect = (list: AppQuestion[]) => {
            list.forEach(q => {
                if (!seenIds.has(q.id)) {
                    allQuestions.push(q);
                    seenIds.add(q.id);
                    if (q.unitNumber > 0) {
                        textToUnitMap.set(normalizeTextForMap(q.text), q.unitNumber);
                    }
                }
            });
        };

        fileSet.exercises.forEach(fp => {
            try {
                const rawContent = fs.readFileSync(fp, 'utf-8');
                // Aggressive Clean: Replace ALL control chars (including \n \r \t) with space.
                // This fixes literal newlines in strings, and makes the whole JSON single-line (valid).
                const cleanedRaw = rawContent.replace(/[\u2028\u2029]/g, ' ').replace(/[\x00-\x1F]/g, ' ');
                const raw = JSON.parse(cleanedRaw);
                const questions = processExerciseList(Array.isArray(raw) ? raw : []);
                collect(questions);
            } catch (e: any) { console.warn(`Error processing exercise ${fp}:`, e.message); }
        });

        fileSet.exams.forEach(fp => {
            try {
                const rawContent = fs.readFileSync(fp, 'utf-8');
                const cleanedRaw = rawContent.replace(/[\u2028\u2029]/g, ' ').replace(/[\x00-\x1F]/g, ' ');
                const raw = JSON.parse(cleanedRaw);
                const list = Array.isArray(raw) ? raw : (raw.questions || []);
                const questions = processExamList(list);
                collect(questions);
            } catch (e: any) { console.warn(`Error processing exam ${fp}:`, e.message); }
        });

        let backfilledCount = 0;
        allQuestions.forEach(q => {
            if (q.unitNumber === 0) {
                const known = textToUnitMap.get(normalizeTextForMap(q.text));
                if (known && known > 0) {
                    q.unitNumber = known;
                    backfilledCount++;
                }
            }
        });

        const extraLog = backfilledCount > 0 ? `[Backfilled: ${backfilledCount}]` : '';
        saveQuestions(slug, allQuestions, TARGET_DIR, extraLog);
    }

    console.log("Sync Enriched Complete.");
}

processAll();
