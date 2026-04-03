import fs from 'fs';
import path from 'path';
import { areTextsSimilar, cleanHtml, isGarbage, toPlainText } from './utils/clean-html.ts';
import type { AppQuestion } from './utils/sync-core.ts';
import { normalizeTextForMap, saveQuestions, slugify } from './utils/sync-core.ts';

// Configurations
const PORTAL_ROOT = process.cwd();
const DENEMELER_ROOT = path.resolve(PORTAL_ROOT, '../ataaof-denemeler');
const MCP_ROOT = path.resolve(PORTAL_ROOT, '../acik-ogretim-mcp');

const TARGET_DIR = path.join(PORTAL_ROOT, 'data/questions/anadolu-aof');

function processExerciseList(list: any[]): AppQuestion[] {
    const out: AppQuestion[] = [];
    list.forEach(q => {
        if (!q.SoruMetni && !q.Text) return;

        const mapped: AppQuestion = {
            id: String(q.SoruID || q.QuestionId),
            unitNumber: q.Unite || q.UniteNo || 0,
            text: cleanHtml(q.SoruMetni || q.Text, { university: 'anadolu' }),
            correctAnswer: (q.DogruCevap || q.CorrectAnswer || "").trim().toUpperCase(),
            options: {},
            explanation: ""
        };

        ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
            if (q[opt]) mapped.options[opt] = cleanHtml(q[opt], { university: 'anadolu' });
        });

        let rawExpl = q.Aciklama || q.AnswerExplanation || "";
        let rawTitle = q.Title || "";

        if (isGarbage(rawTitle)) rawTitle = "";
        if (isGarbage(rawExpl)) rawExpl = "";

        if (rawTitle.length > 200 && rawExpl.length < 100) {
            const temp = rawTitle;
            rawTitle = rawExpl;
            rawExpl = temp;
        }

        let finalExpl = rawExpl;
        if (rawTitle) {
            if (rawExpl) {
                const tNorm = toPlainText(rawTitle);
                const eNorm = toPlainText(rawExpl);
                const cTitle = cleanHtml(rawTitle, { university: 'anadolu' });
                const cExpl = cleanHtml(rawExpl, { university: 'anadolu' });
                if (eNorm.includes(tNorm) || tNorm.includes(eNorm)) {
                    finalExpl = (cExpl.length >= cTitle.length) ? cExpl : cTitle;
                } else {
                    finalExpl = `${cTitle}<br/>${cExpl}`;
                }
            } else {
                finalExpl = cleanHtml(rawTitle, { university: 'anadolu' });
            }
        } else if (rawExpl) {
            finalExpl = cleanHtml(rawExpl, { university: 'anadolu' });
        }

        if (finalExpl && finalExpl.length > 5) {
            const hasImage = finalExpl.includes('<img');
            const hasTable = finalExpl.includes('<table');
            let cleanedExpl = cleanHtml(finalExpl, { isExplanation: true, disableChoiceCleanup: true, university: 'anadolu' });

            if (!hasImage && !hasTable) {
                const correctOptKey = mapped.correctAnswer.trim().toUpperCase();
                const optPlain = mapped.options[correctOptKey] ? toPlainText(mapped.options[correctOptKey]).trim().toLowerCase() : "";
                let explLines = cleanedExpl.split(/<br\s*\/?>/i);
                let explChanged = false;

                if (explLines.length > 0) {
                    const first = explLines[0];
                    const firstPlain = toPlainText(first).trim().toLowerCase();
                    if (isGarbage(first) || (optPlain && areTextsSimilar(firstPlain, optPlain))) {
                        explLines.shift();
                        explChanged = true;
                    }
                }
                if (explLines.length > 0) {
                    const last = explLines[explLines.length - 1];
                    if (isGarbage(last)) {
                        explLines.pop();
                        explChanged = true;
                    }
                }
                if (explChanged) {
                    const joined = explLines.join('<br/>').trim();
                    cleanedExpl = toPlainText(joined).trim().length < 15 ? "" : joined;
                }
                const plain = toPlainText(cleanedExpl).trim().toLowerCase();
                const charDiff = plain.length - optPlain.length;
                const lenRatio = Math.min(plain.length, optPlain.length) / (Math.max(plain.length, optPlain.length) || 1);
                if (plain.length < 2 || isGarbage(cleanedExpl) || (optPlain && areTextsSimilar(plain, optPlain) && (lenRatio > 0.8 || charDiff < 20))) {
                    cleanedExpl = "";
                }
            }
            mapped.explanation = cleanedExpl.trim();
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
        let uNo = q.unitNumber ?? q.UniteNo ?? q.Unite ?? 0;

        const txt = q.question || q.text || "";
        const mapped: AppQuestion = {
            id: uniqueId,
            unitNumber: uNo,
            text: cleanHtml(txt, { university: 'anadolu' }),
            correctAnswer: ["A", "B", "C", "D", "E"][q.correctIndex] || "",
            options: {},
            explanation: ""
        };

        if (q.options && Array.isArray(q.options)) {
            q.options.forEach((opt: string, idx: number) => {
                const key = ["A", "B", "C", "D", "E"][idx];
                if (key) mapped.options[key] = cleanHtml(opt, { university: 'anadolu' });
            });
        }

        if (q.explanation) {
            const hasImage = q.explanation.includes('<img');
            const hasTable = q.explanation.includes('<table');
            let cleanedExpl = cleanHtml(q.explanation, { isExplanation: true, disableChoiceCleanup: true, university: 'anadolu' });

            if (!hasImage && !hasTable) {
                const correctOptKey = mapped.correctAnswer.trim().toUpperCase();
                const optPlain = mapped.options[correctOptKey] ? toPlainText(mapped.options[correctOptKey]).trim().toLowerCase() : "";
                let explLines = cleanedExpl.split(/<br\s*\/?>/i);
                let explChanged = false;
                if (explLines.length > 0) {
                    const first = explLines[0];
                    if (isGarbage(first) || (optPlain && areTextsSimilar(toPlainText(first).trim().toLowerCase(), optPlain))) {
                        explLines.shift();
                        explChanged = true;
                    }
                }
                if (explLines.length > 0) {
                    const last = explLines[explLines.length - 1];
                    if (isGarbage(last)) {
                        explLines.pop();
                        explChanged = true;
                    }
                }
                if (explChanged) {
                    const joined = explLines.join('<br/>').trim();
                    cleanedExpl = toPlainText(joined).trim().length < 15 ? "" : joined;
                }
                const plain = toPlainText(cleanedExpl).trim().toLowerCase();
                const charDiff = plain.length - optPlain.length;
                const lenRatio = Math.min(plain.length, optPlain.length) / (Math.max(plain.length, optPlain.length) || 1);
                if (plain.length < 2 || isGarbage(cleanedExpl) || (optPlain && areTextsSimilar(plain, optPlain) && (lenRatio > 0.8 || charDiff < 20))) {
                    cleanedExpl = "";
                }
            }
            mapped.explanation = cleanedExpl.trim();
        }
        out.push(mapped);
    });
    return out;
}

async function processAll() {
    const enrichedSource = path.join(MCP_ROOT, 'data/raw/anadolu-aof');
    const legacySource = path.join(DENEMELER_ROOT, 'output/Anadolu/json');

    const courseFiles: { [slug: string]: { exercises: string[], exams: string[] } } = {};

    if (fs.existsSync(enrichedSource)) {
        console.log(`Using Enriched source: ${enrichedSource}`);
        const slugs = fs.readdirSync(enrichedSource);
        slugs.forEach(slug => {
            if (slug === '.DS_Store') return;
            const coursePath = path.join(enrichedSource, slug);
            if (!fs.statSync(coursePath).isDirectory()) return;
            if (!courseFiles[slug]) courseFiles[slug] = { exercises: [], exams: [] };
            const exPath = path.join(coursePath, 'alistirma-sorulari.json');
            if (fs.existsSync(exPath)) courseFiles[slug].exercises.push(exPath);
            const emPath = path.join(coursePath, 'cikmis-sorular.json');
            if (fs.existsSync(emPath)) courseFiles[slug].exams.push(emPath);
        });
    }

    if (fs.existsSync(legacySource)) {
        console.log(`Checking Legacy source: ${legacySource}`);
        const terms = fs.readdirSync(legacySource);
        terms.forEach(term => {
            if (term === '.DS_Store') return;
            const termPath = path.join(legacySource, term);
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
                if (type === 'Alıştırma Soruları') courseFiles[slug].exercises.push(fullPath);
                else if (type === 'Çıkmış Sorular') courseFiles[slug].exams.push(fullPath);
            });
        });
    }

    console.log(`Processing ${Object.keys(courseFiles).length} courses...`);

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
                }
                if (q.unitNumber > 0) {
                    textToUnitMap.set(normalizeTextForMap(q.text), q.unitNumber);
                }
            });
        };

        fileSet.exercises.forEach(fp => {
            try {
                const raw = JSON.parse(fs.readFileSync(fp, 'utf-8').replace(/[\u2028\u2029]/g, ' ').replace(/[\x00-\x1F]/g, ' '));
                collect(processExerciseList(Array.isArray(raw) ? raw : []));
            } catch (e: any) { console.warn(`Error ${fp}:`, e.message); }
        });

        fileSet.exams.forEach(fp => {
            try {
                const raw = JSON.parse(fs.readFileSync(fp, 'utf-8').replace(/[\u2028\u2029]/g, ' ').replace(/[\x00-\x1F]/g, ' '));
                const list = Array.isArray(raw) ? raw : (raw.questions || []);
                collect(processExamList(list));
            } catch (e: any) { console.warn(`Error ${fp}:`, e.message); }
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

        saveQuestions(slug, allQuestions, TARGET_DIR, backfilledCount > 0 ? `[Backfilled: ${backfilledCount}]` : '');
    }
    console.log("Sync Enriched Complete.");
}

processAll();
