import fs from 'fs';
import os from 'os';
import path from 'path';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { cleanHtml } from './utils/clean-html.ts';

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

    let expl = "";
    if (raw.AnswerExplanation) {
        expl = cleanHtml(raw.AnswerExplanation, { isTechnical, isExplanation: true, disableChoiceCleanup: true, debug: process.env.DEBUG === 'true' });
    }

    // Smart Merge Logic: Title + Explanation
    if (raw.Title) {
        const title = cleanHtml(raw.Title, { isTechnical });
        if (title) {
            if (expl) {
                const stripTags = (h: string) => h.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
                const tNorm = stripTags(title);
                const eNorm = stripTags(expl);

                // If one contains the other (ignoring tags), keep the longer one
                if (eNorm.includes(tNorm) || tNorm.includes(eNorm)) {
                    if (tNorm.length > eNorm.length) {
                        expl = title;
                    }
                    // Else: expl already has it, keep expl
                } else {
                    // Distinct, concatenate
                    expl = `${title} ${expl}`;
                }
            } else {
                expl = title;
            }
        }
    }

    if (expl && expl.trim() !== "") {
        q.explanation = expl.trim();
    }

    if (raw.A) q.options['A'] = cleanHtml(raw.A, { isTechnical });
    if (raw.B) q.options['B'] = cleanHtml(raw.B, { isTechnical });
    if (raw.C) q.options['C'] = cleanHtml(raw.C, { isTechnical });
    if (raw.D) q.options['D'] = cleanHtml(raw.D, { isTechnical });
    if (raw.E) q.options['E'] = cleanHtml(raw.E, { isTechnical });

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
    const destFilePath = path.join(TARGET_ANADOLU_DIR, `${slug}.json`);

    const technicalKeywords = ['programlama', 'algoritma', 'kodlama', 'web', 'veritabani', 'internet-prog', 'yazilim-müh', 'yazilim-gelistirme'];
    let isTechnical = technicalKeywords.some(kw => slug.toLowerCase().includes(kw));

    if (slug === 'algoritmalar-ve-programlama' || slug === 'programlama-ii') {
        isTechnical = false;
    }

    const questions: AppQuestion[] = [];
    const ids = new Set<string>();

    const alistirmaPath = path.join(courseRawDir, 'alistirma-sorulari.json');
    if (fs.existsSync(alistirmaPath)) {
        try {
            const content = fs.readFileSync(alistirmaPath, 'utf-8');
            const rawData: RawAnadoluQuestion[] = JSON.parse(content);
            if (Array.isArray(rawData)) {
                rawData.forEach(r => {
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
            const rawData = JSON.parse(content);
            const rawList: ExamInput[] = Array.isArray(rawData) ? rawData : (rawData.questions || []);

            if (Array.isArray(rawList)) {
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
        fs.writeFileSync(destFilePath, JSON.stringify(validQuestions, null, 2));
        if (isMainThread) {
            console.log(`✅ Synced ${slug} (${validQuestions.length} questions)`);
        } else {
            parentPort?.postMessage(`✅ Synced ${slug} (${validQuestions.length} questions)`);
        }
    }
}

// MAIN LOGIC
if (isMainThread) {
    if (!fs.existsSync(RAW_ANADOLU_DIR)) {
        console.error(`Cannot find raw directory: ${RAW_ANADOLU_DIR}`);
        process.exit(1);
    }

    const allItems = fs.readdirSync(RAW_ANADOLU_DIR).filter(item => {
        if (item === '.DS_Store') return false;
        try {
            return fs.statSync(path.join(RAW_ANADOLU_DIR, item)).isDirectory();
        } catch { return false; }
    });

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
            workerData: chunk
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
    slugs.forEach(processCourse);
}
