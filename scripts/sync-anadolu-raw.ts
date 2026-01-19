import fs from 'fs';

import path from 'path';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { areTextsSimilar, cleanHtml, isGarbage, toPlainText } from './utils/clean-html.ts';

// Configurations
const NUM_WORKERS = 4; // Stable count
const MCP_ROOT = path.resolve('../acik-ogretim-mcp');
const PORTAL_ROOT = process.cwd();

const RAW_ANADOLU_DIR = path.join(MCP_ROOT, 'data/raw/anadolu-aof');
const TARGET_ANADOLU_DIR = path.join(PORTAL_ROOT, 'data/questions/anadolu-aof');
const DEBUG = process.env.DEBUG === '1';

// Ensure target directory exists (Main thread only)
if (isMainThread && !fs.existsSync(TARGET_ANADOLU_DIR)) {
    console.log(`Creating directory: ${TARGET_ANADOLU_DIR}`);
    fs.mkdirSync(TARGET_ANADOLU_DIR, { recursive: true });
}

interface RawAnadoluQuestion {
    QuestionId: number;
    UniteNo: number;
    PageNumber?: number;
    AnswerExplanation?: string;
    Title?: string;
    Text: string;
    A: string;
    B: string;
    C: string;
    D: string;
    E?: string;
    CorrectAnswer: string;
}

interface RawAnadoluExamQuestion {
    id: number;
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
    exam_question_number: number;
    source: string;
    material_id: string;
}

interface PreProcessedExamQuestion {
    id: string;
    unitNumber: number;
    text: string;
    options: { [key: string]: string };
    correctAnswer: string;
    explanation?: string;
    sources?: string[];
    is_duplicate?: boolean;
    duplicate_of?: string;
}

interface AppQuestion {
    id: string;
    unitNumber: number;
    text: string;
    options: { [key: string]: string };
    correctAnswer: string;
    explanation?: string;
}

type ExamInput = RawAnadoluExamQuestion | PreProcessedExamQuestion;


/**
 * Maps a single raw question to the app format.
 */
function mapRawToApp(raw: RawAnadoluQuestion, isTechnical: boolean = false): AppQuestion {
    const q: AppQuestion = {
        id: String(raw.QuestionId),
        unitNumber: raw.UniteNo || 0,
        text: cleanHtml(raw.Text, { isTechnical, university: 'anadolu' }),
        correctAnswer: (raw.CorrectAnswer || "").trim().toUpperCase(),
        options: {},
        explanation: ""
    };

    // Smart Merge Logic: Title + Explanation
    let combinedExpl = "";
    let rawTitle = (raw.Title || "").trim();
    let rawExpl = (raw.AnswerExplanation || "").trim();


    if (isGarbage(rawTitle)) rawTitle = "";
    if (isGarbage(rawExpl)) rawExpl = "";

    // Swap Logic
    if (rawTitle.length > 200 && rawExpl.length < 100) {
        const temp = rawTitle;
        rawTitle = rawExpl;
        rawExpl = temp;
    }

    if (rawTitle && rawExpl) {
        const cTitle = cleanHtml(rawTitle, { isTechnical, university: 'anadolu' });
        const cExpl = cleanHtml(rawExpl, { isTechnical, isExplanation: true, disableChoiceCleanup: true, university: 'anadolu' });
        const tNorm = toPlainText(rawTitle);
        const eNorm = toPlainText(rawExpl);

        if (areTextsSimilar(tNorm, eNorm)) {
            combinedExpl = (cExpl.length >= cTitle.length) ? cExpl : cTitle;
        } else {
            combinedExpl = cTitle + "<br/>" + cExpl;
        }
    } else if (rawTitle) {
        combinedExpl = cleanHtml(rawTitle, { isTechnical, isExplanation: true, disableChoiceCleanup: true, university: 'anadolu' });
    } else if (rawExpl) {
        combinedExpl = cleanHtml(rawExpl, { isTechnical, isExplanation: true, disableChoiceCleanup: true, university: 'anadolu' });
    }

    // Populate options
    if (raw.A !== undefined) q.options['A'] = cleanHtml(raw.A || "", { isTechnical, university: 'anadolu' });
    if (raw.B !== undefined) q.options['B'] = cleanHtml(raw.B || "", { isTechnical, university: 'anadolu' });
    if (raw.C !== undefined) q.options['C'] = cleanHtml(raw.C || "", { isTechnical, university: 'anadolu' });
    if (raw.D !== undefined) q.options['D'] = cleanHtml(raw.D || "", { isTechnical, university: 'anadolu' });
    if (raw.E !== undefined) q.options['E'] = cleanHtml(raw.E || "", { isTechnical, university: 'anadolu' });

    if (combinedExpl && combinedExpl.trim() !== "") {
        // FIRST: Check if explanation has an image or table BEFORE cleaning
        const hasImage = combinedExpl.includes('<img');
        const hasTable = combinedExpl.includes('<table');

        let finalExpl = cleanHtml(combinedExpl.trim(), { isTechnical, isExplanation: true, disableChoiceCleanup: true });

        if (hasImage || hasTable) {
            // Do nothing - preserve explanation exactly as-is
        } else if (raw.CorrectAnswer && q.options[raw.CorrectAnswer]) {
            const optPlain = toPlainText(q.options[raw.CorrectAnswer] || "").trim().toLowerCase();

            // 1. Line-based Surgical Trimming (Only standalone lines)
            let lines = finalExpl.split(/<br\s*\/?>/i);
            let changed = false;

            if (lines.length > 0) {
                // Check first line
                const first = lines[0];
                const firstPlain = toPlainText(first).trim().toLowerCase();
                if (isGarbage(first) || (optPlain && areTextsSimilar(firstPlain, optPlain))) {
                    lines.shift();
                    changed = true;
                }
            }

            if (lines.length > 0) {
                // Check last line
                const last = lines[lines.length - 1];
                const lastPlain = toPlainText(last).trim().toLowerCase();

                if (isGarbage(last) || (optPlain && areTextsSimilar(lastPlain, optPlain))) {
                    lines.pop();
                    changed = true;
                }
            }

            if (changed) {
                const joined = lines.join('<br/>').trim();
                const joinedPlain = toPlainText(joined).trim();
                if (joinedPlain.length < 15) {
                    finalExpl = ""; // It was all garbage
                } else {
                    finalExpl = joined;
                }
            }

            // 2. Conservative Full Clear Check
            if (finalExpl !== "") {
                // Original logic for non-image explanations
                const plain = toPlainText(finalExpl).trim().toLowerCase();
                const charDiff = Math.abs(plain.length - optPlain.length);
                const lenRatio = Math.min(plain.length, optPlain.length) / (Math.max(plain.length, optPlain.length) || 1);

                if (plain.length < 2 || isGarbage(finalExpl) || (optPlain && areTextsSimilar(plain, optPlain) && (lenRatio > 0.8 || charDiff < 20))) {
                    finalExpl = "";
                }
            }
        }

        q.explanation = finalExpl.trim() === "" ? "" : finalExpl.trim();
    }

    return q;
}

/**
 * Maps raw exam questions to app format.
 */
function mapExamToApp(raw: ExamInput, isTechnical: boolean = false): AppQuestion {
    if (typeof raw.id === 'string' && raw.id.startsWith('exam-') && !Array.isArray(raw.options)) {
        const p = raw as PreProcessedExamQuestion;
        return {
            id: p.id,
            unitNumber: p.unitNumber,
            text: cleanHtml(p.text, { isTechnical }),
            correctAnswer: p.correctAnswer,
            options: p.options,
            explanation: p.explanation ? cleanHtml(p.explanation, { isTechnical, isExplanation: true, disableChoiceCleanup: true }) : undefined
        };
    }

    const oldRaw = raw as RawAnadoluExamQuestion;
    const q: AppQuestion = {
        id: `exam-${oldRaw.material_id}-${oldRaw.id}`,
        unitNumber: 0,
        text: cleanHtml(oldRaw.question, { isTechnical }),
        correctAnswer: ["A", "B", "C", "D", "E"][oldRaw.correctIndex] || "",
        options: {},
        explanation: ""
    };

    if (oldRaw.options && Array.isArray(oldRaw.options)) {
        oldRaw.options.forEach((opt, idx) => {
            const key = ["A", "B", "C", "D", "E"][idx];
            if (key) q.options[key] = cleanHtml(opt, { isTechnical });
        });
    }

    if (oldRaw.explanation) {
        let e = cleanHtml(oldRaw.explanation, { isTechnical, isExplanation: true, disableChoiceCleanup: true });
        const correctOptKey = q.correctAnswer;
        const optPlain = q.options[correctOptKey] ? toPlainText(q.options[correctOptKey]).trim().toLowerCase() : "";

        const hasImage = e.includes('<img');
        const plain = toPlainText(e).trim().toLowerCase();

        if (!hasImage) {
            const charDiff = plain.length - optPlain.length;
            const lenRatio = optPlain.length / (plain.length || 1);

            if (plain.length < 2 || isGarbage(e) || (optPlain && areTextsSimilar(plain, optPlain) && (lenRatio > 0.8 || charDiff < 25))) {
                e = "";
            }
        }
        q.explanation = e.trim() === "" ? "" : e.trim();
    } else {
        q.explanation = "";
    }

    return q;
}

/**
 * Process a single course folder.
 */
export async function processCourse(slug: string) {
    const courseRawDir = path.join(RAW_ANADOLU_DIR, slug);
    const destFilePath = path.join(TARGET_ANADOLU_DIR, `${slug}.json`);

    const technicalKeywords = ['programlama', 'algoritma', 'kodlama', 'web', 'veritabanı', 'internet-prog', 'yazılım-müh', 'yazılım-gelistirme', 'veri-yapilari', 'veri-madenciligi', 'tasarim', 'modelleme'];
    let isTechnical = technicalKeywords.some(kw => slug.toLowerCase().includes(kw));

    const questions: AppQuestion[] = [];
    const ids = new Set<string>();

    const alistirmaPath = path.join(courseRawDir, 'alistirma-sorulari.json');
    if (fs.existsSync(alistirmaPath)) {
        try {
            const content = fs.readFileSync(alistirmaPath, 'utf-8');
            const rawData: any = JSON.parse(content);
            let rawList: RawAnadoluQuestion[] = [];
            if (Array.isArray(rawData)) {
                rawList = rawData;
            } else if (rawData && typeof rawData === 'object') {
                if (Array.isArray(rawData.questions)) rawList = rawData.questions;
                else if (Array.isArray(rawData.data)) rawList = rawData.data;
                else if (Array.isArray(rawData.Sorular)) rawList = rawData.Sorular;
            }

            if (rawList.length > 0) {
                rawList.forEach(r => {
                    try {
                        const mapped = mapRawToApp(r, isTechnical);
                        if (!ids.has(mapped.id)) {
                            questions.push(mapped);
                            ids.add(mapped.id);
                        }
                    } catch (err) {
                        if (DEBUG) console.error(`Failed to map question ${r.QuestionId}:`, err);
                    }
                });
            }
        } catch (e) { }
    }

    const cikmisPath = path.join(courseRawDir, 'cikmis-sorular.json');
    if (fs.existsSync(cikmisPath)) {
        try {
            const content = fs.readFileSync(cikmisPath, 'utf-8');
            const rawData: any = JSON.parse(content);
            let rawList: ExamInput[] = [];

            if (Array.isArray(rawData)) {
                rawList = rawData;
            } else if (rawData && typeof rawData === 'object') {
                if (Array.isArray(rawData.questions)) rawList = rawData.questions;
                else if (Array.isArray(rawData.data)) rawList = rawData.data;
                else if (Array.isArray(rawData.Sorular)) rawList = rawData.Sorular;
            }

            if (rawList.length > 0) {
                rawList.forEach(r => {
                    try {
                        const mapped = mapExamToApp(r, isTechnical);
                        if (!ids.has(mapped.id)) {
                            questions.push(mapped);
                            ids.add(mapped.id);
                        }
                    } catch (err) {
                        if (DEBUG) console.error(`Failed to map exam question ${r.id}:`, err);
                    }
                });
            }
        } catch (e) { }
    }

    const validQuestions = questions.filter(q => {
        const hasCorrectAnswer = q.correctAnswer && q.correctAnswer.trim() !== "";
        const hasOptions = q.options && Object.keys(q.options).length > 0;
        return hasCorrectAnswer && hasOptions;
    });

    if (validQuestions.length > 0) {
        const newContent = JSON.stringify(validQuestions, null, 2);
        let shouldWrite = true;

        if (fs.existsSync(destFilePath)) {
            const existingContent = fs.readFileSync(destFilePath, 'utf-8');
            if (existingContent === newContent) {
                shouldWrite = false;
            }
        }
        if (shouldWrite) {
            fs.writeFileSync(destFilePath, newContent);
            if (parentPort) {
                parentPort.postMessage(`✅ Synced ${slug} (${validQuestions.length} questions)`);
            } else {
                console.log(`✅ Synced ${slug} (${validQuestions.length} questions)`);
            }
        }
    }
}

// MAIN EXECUTION
if (isMainThread) {
    if (!fs.existsSync(RAW_ANADOLU_DIR)) {
        console.error(`Cannot find raw directory: ${RAW_ANADOLU_DIR}`);
        process.exit(1);
    }

    const args = process.argv.slice(2);
    const technicalOnly = args.includes('--technical');
    const courseArg = args.find(a => a.startsWith('--course='));
    const singleCourse = courseArg ? courseArg.split('=')[1] : null;

    const technicalKeywords = ['programlama', 'algoritma', 'kodlama', 'web', 'veritaban', 'internet', 'yazilim', 'veri', 'tasarim', 'modelleme', 'bilgisayar', 'grafik'];

    let allItems = fs.readdirSync(RAW_ANADOLU_DIR).filter(item => {
        if (item === '.DS_Store') return false;
        try {
            return fs.statSync(path.join(RAW_ANADOLU_DIR, item)).isDirectory();
        } catch { return false; }
    });

    if (singleCourse) {
        allItems = allItems.filter(item => item === singleCourse);
        if (allItems.length === 0) {
            console.error(`Course not found: ${singleCourse}`);
            process.exit(1);
        }
        console.log(`Processing single course: ${singleCourse}`);
    }

    if (technicalOnly) {
        allItems = allItems.filter(slug => technicalKeywords.some(kw => slug.toLowerCase().includes(kw)));
        console.log(`Filtering to ${allItems.length} technical courses...`);
    }

    console.log(`Scanning ${allItems.length} folders in ${RAW_ANADOLU_DIR}...`);
    console.log(`Starting parallel sync with ${NUM_WORKERS} workers...`);

    const chunkCount = NUM_WORKERS;
    const itemsPerChunk = Math.ceil(allItems.length / chunkCount);
    let activeWorkers = 0;
    const startTime = Date.now();

    for (let i = 0; i < chunkCount; i++) {
        const start = i * itemsPerChunk;
        const end = start + itemsPerChunk;
        const chunk = allItems.slice(start, end);

        if (chunk.length === 0) continue;

        activeWorkers++;
        const worker = new Worker(new URL(import.meta.url), {
            workerData: chunk,
            execArgv: process.execArgv
        });

        worker.on('message', (msg) => console.log(msg));
        worker.on('error', (err) => console.error(`Worker error:`, err));
        worker.on('exit', () => {
            activeWorkers--;
            if (activeWorkers === 0) {
                const duration = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`Sync complete in ${duration}s.`);
            }
        });
    }
} else {
    const slugs: string[] = workerData;
    console.log(`Worker has ${slugs.length} items to process`);
    slugs.forEach(s => {
        if (parentPort) parentPort.postMessage(`Processing ${s}...`);
        processCourse(s);
    });
}
