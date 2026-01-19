import fs from 'fs';
import os from 'os';
import path from 'path';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { cleanHtml, toPlainText } from './utils/clean-html.ts';

// Configurations
const NUM_WORKERS = Math.max(1, os.cpus().length - 1);
const MCP_ROOT = path.resolve('../acik-ogretim-mcp');
const PORTAL_ROOT = process.cwd();

const RAW_ANADOLU_DIR = path.join(MCP_ROOT, 'data/raw/anadolu-aof');
const TARGET_ANADOLU_DIR = path.join(PORTAL_ROOT, 'data/questions/anadolu-aof');

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

// Union type for input
type ExamInput = RawAnadoluExamQuestion | PreProcessedExamQuestion;

function mapRawToApp(raw: RawAnadoluQuestion, isTechnical: boolean = false): AppQuestion {
    const q: AppQuestion = {
        id: String(raw.QuestionId),
        unitNumber: raw.UniteNo || 0,
        text: cleanHtml(raw.Text, { isTechnical }),
        correctAnswer: (raw.CorrectAnswer || "").trim().toUpperCase(),
        options: {}
    };

    // Smart Merge Logic: Title + Explanation
    // User insisted: The explanation is a distinct field. Clean them separately.
    let combinedExpl = "";

    const rawTitle = (raw.Title || "").trim();
    const rawExpl = (raw.AnswerExplanation || "").trim();

    if (rawTitle && rawExpl) {
        // Clean independently
        const cTitle = cleanHtml(rawTitle, { isTechnical });
        const cExpl = cleanHtml(rawExpl, { isTechnical, isExplanation: true, disableChoiceCleanup: true });

        const tNorm = toPlainText(rawTitle);
        const eNorm = toPlainText(rawExpl);

        // If content is duplicated, prefer the version that is "fuller" (has more HTML/content)
        if (eNorm.includes(tNorm) || tNorm.includes(eNorm)) {
            // Compare cleaned HTML lengths for the tie-break to preserve images/formatting
            combinedExpl = (cExpl.length >= cTitle.length) ? cExpl : cTitle;
        } else {
            // Distinct content: Independent Clean & Merge
            // Merging cleaned strings ensures that unclosed tags in Title don't swallow Explanation content
            combinedExpl = cTitle + "<br/>" + cExpl;
        }
    } else if (rawTitle) {
        combinedExpl = cleanHtml(rawTitle, { isTechnical, isExplanation: true, disableChoiceCleanup: true });
    } else if (rawExpl) {
        combinedExpl = cleanHtml(rawExpl, { isTechnical, isExplanation: true, disableChoiceCleanup: true });
    }

    if (combinedExpl && combinedExpl.trim() !== "") {
        // Run cleanHtml one last time on the combined string to trigger self-deduplication
        q.explanation = cleanHtml(combinedExpl.trim(), { isTechnical, isExplanation: true, disableChoiceCleanup: true });
    }

    if (raw.A !== undefined) q.options['A'] = cleanHtml(raw.A || "", { isTechnical });
    if (raw.B !== undefined) q.options['B'] = cleanHtml(raw.B || "", { isTechnical });
    if (raw.C !== undefined) q.options['C'] = cleanHtml(raw.C || "", { isTechnical });
    if (raw.D !== undefined) q.options['D'] = cleanHtml(raw.D || "", { isTechnical });
    if (raw.E !== undefined) q.options['E'] = cleanHtml(raw.E || "", { isTechnical });

    return q;
}

function mapExamToApp(raw: ExamInput, isTechnical: boolean = false): AppQuestion {
    // Check if it's already in the new format (App Schema-like)
    if (typeof raw.id === 'string' && raw.id.startsWith('exam-') && !Array.isArray(raw.options)) {
        const p = raw as PreProcessedExamQuestion;
        return {
            id: p.id,
            unitNumber: p.unitNumber,
            text: cleanHtml(p.text, { isTechnical }),
            correctAnswer: p.correctAnswer,
            options: p.options,
            explanation: p.explanation ? cleanHtml(p.explanation, { isTechnical, isExplanation: true, disableChoiceCleanup: true, debug: process.env.DEBUG === 'true' }) : undefined
        };
    }

    // Fallback: Legacy Mapping Logic
    const oldRaw = raw as RawAnadoluExamQuestion;
    const q: AppQuestion = {
        id: `exam-${oldRaw.material_id}-${oldRaw.id}`,
        unitNumber: 0,
        text: cleanHtml(oldRaw.question, { isTechnical }),
        correctAnswer: ["A", "B", "C", "D", "E"][oldRaw.correctIndex] || "",
        options: {}
    };

    if (oldRaw.options && Array.isArray(oldRaw.options)) {
        oldRaw.options.forEach((opt, idx) => {
            const key = ["A", "B", "C", "D", "E"][idx];
            if (key) {
                q.options[key] = cleanHtml(opt, { isTechnical });
            }
        });
    }

    if (oldRaw.explanation) {
        const e = cleanHtml(oldRaw.explanation, { isTechnical, isExplanation: true, disableChoiceCleanup: true, debug: process.env.DEBUG === 'true' });
        if (e) q.explanation = e;
    }

    return q;
}

function processCourse(slug: string) {
    const courseRawDir = path.join(RAW_ANADOLU_DIR, slug);
    // console.log(`Processing ${slug}...`); // Too noisy for all, but good for debug
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
                    const mapped = mapRawToApp(r, isTechnical);
                    if (!ids.has(mapped.id)) {
                        questions.push(mapped);
                        ids.add(mapped.id);
                    }
                });
            }
        } catch (e) {
            // console.warn(`Error parsing alistirma-sorulari for ${slug}:`, e);
        }
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
                    const mapped = mapExamToApp(r, isTechnical);
                    if (!ids.has(mapped.id)) {
                        questions.push(mapped);
                        ids.add(mapped.id);
                    }
                });
            }
        } catch (e) {
            // console.warn(`Error parsing cikmis-sorular for ${slug}:`, e);
        }
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
            const msg = `✅ Synced ${slug} (${validQuestions.length} questions)`;
            if (isMainThread) console.log(msg);
            else parentPort?.postMessage(msg);
        }
    }
}

// MAIN LOGIC
if (isMainThread) {
    if (!fs.existsSync(RAW_ANADOLU_DIR)) {
        console.error(`Cannot find raw directory: ${RAW_ANADOLU_DIR}`);
        process.exit(1);
    }

    // Parse command line arguments
    const args = process.argv.slice(2);
    const technicalOnly = args.includes('--technical');
    const courseArg = args.find(a => a.startsWith('--course='));
    const singleCourse = courseArg ? courseArg.split('=')[1] : null;

    // Technical keywords for filtering
    const technicalKeywords = [
        'programlama', 'algoritma', 'kodlama', 'web', 'veritaban',
        'internet', 'yazilim', 'veri', 'tasarim', 'modelleme',
        'bilgisayar', 'grafik'
    ];

    let allItems = fs.readdirSync(RAW_ANADOLU_DIR).filter(item => {
        if (item === '.DS_Store') return false;
        try {
            return fs.statSync(path.join(RAW_ANADOLU_DIR, item)).isDirectory();
        } catch { return false; }
    });

    // Filter by single course
    if (singleCourse) {
        allItems = allItems.filter(item => item === singleCourse);
        if (allItems.length === 0) {
            console.error(`Course not found: ${singleCourse}`);
            process.exit(1);
        }
        console.log(`Processing single course: ${singleCourse}`);
    }

    // Filter by technical courses only
    if (technicalOnly) {
        allItems = allItems.filter(slug => {
            const lowerSlug = slug.toLowerCase();
            return technicalKeywords.some(kw => lowerSlug.includes(kw));
        });
        console.log(`Filtering to ${allItems.length} technical courses only...`);
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
        // Use import.meta.url for self-reference in module mode
        const worker = new Worker(new URL(import.meta.url), {
            workerData: chunk,
            execArgv: process.execArgv // Ensure tsx loader is used in workers
        });

        worker.on('message', (msg) => {
            console.log(msg);
        });

        worker.on('error', (err) => {
            console.error(`Worker error:`, err);
        });

        worker.on('exit', (code) => {
            activeWorkers--;
            if (activeWorkers === 0) {
                const duration = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`Sync complete in ${duration}s.`);
            }
        });
    }

} else {
    // Worker Thread
    const slugs: string[] = workerData;
    console.log(`Worker has ${slugs.length} items to process`);
    slugs.forEach(processCourse);
}
