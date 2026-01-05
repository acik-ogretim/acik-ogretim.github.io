
import fs from 'fs';
import path from 'path';
import { cleanHtml } from './utils/clean-html.js';

// Configurations
const MCP_ROOT = path.resolve('../acik-ogretim-mcp');
const PORTAL_ROOT = process.cwd();

const RAW_ANADOLU_DIR = path.join(MCP_ROOT, 'data/raw/anadolu-aof');
const TARGET_ANADOLU_DIR = path.join(PORTAL_ROOT, 'data/questions/anadolu-aof');

// Ensure target directory exists
if (!fs.existsSync(TARGET_ANADOLU_DIR)) {
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
    explanation?: string; // Sometimes present in exams if enriched?
    exam_question_number: number;
    source: string;
    material_id: string;
}

interface AppQuestion {
    id: string;
    unitNumber: number;
    text: string;
    options: { [key: string]: string };
    correctAnswer: string;
    explanation?: string;
}

function mapRawToApp(raw: RawAnadoluQuestion): AppQuestion {
    const q: AppQuestion = {
        id: String(raw.QuestionId),
        unitNumber: raw.UniteNo || 0,
        text: cleanHtml(raw.Text),
        correctAnswer: (raw.CorrectAnswer || "").trim().toUpperCase(),
        options: {}
    };

    // Explanation logic from Python:
    // If Title exists and is not in Explanation, concat?
    // For now simple cleaning. Python `map_to_old_format` does complex merge.
    // Let's adopt a robust check:
    let expl = "";
    if (raw.AnswerExplanation) expl = cleanHtml(raw.AnswerExplanation);

    // Python shared.py logic merges Title?
    // "if title and explanation... if t_norm in e_norm pass... else concat"
    // We'll stick to basic explanation usage unless Title is commonly significant in standard exercises.
    // Assuming AnswerExplanation is the main source.
    if (expl && expl !== "") {
        q.explanation = expl;
    }

    if (raw.A) q.options['A'] = cleanHtml(raw.A);
    if (raw.B) q.options['B'] = cleanHtml(raw.B);
    if (raw.C) q.options['C'] = cleanHtml(raw.C);
    if (raw.D) q.options['D'] = cleanHtml(raw.D);
    if (raw.E) q.options['E'] = cleanHtml(raw.E);

    return q;
}

function mapExamToApp(raw: RawAnadoluExamQuestion): AppQuestion {
    const q: AppQuestion = {
        id: `exam-${raw.material_id}-${raw.id}`,
        unitNumber: 0,
        text: cleanHtml(raw.question),
        correctAnswer: ["A", "B", "C", "D", "E"][raw.correctIndex] || "",
        options: {}
    };

    // Append source info?
    // text += ` <br><small>(${raw.source})</small>`;

    if (raw.options && Array.isArray(raw.options)) {
        raw.options.forEach((opt, idx) => {
            const key = ["A", "B", "C", "D", "E"][idx];
            if (key) {
                q.options[key] = cleanHtml(opt);
            }
        });
    }

    // If exam has explanation (from enrichment or raw field)
    if (raw.explanation) {
        const e = cleanHtml(raw.explanation);
        if (e) q.explanation = e;
    }

    return q;
}

function processCourse(slug: string) {
    const courseRawDir = path.join(RAW_ANADOLU_DIR, slug);
    const destFilePath = path.join(TARGET_ANADOLU_DIR, `${slug}.json`);

    const questions: AppQuestion[] = [];
    const ids = new Set<string>();

    // 1. Process Alistirma Sorulari
    const alistirmaPath = path.join(courseRawDir, 'alistirma-sorulari.json');
    if (fs.existsSync(alistirmaPath)) {
        try {
            const content = fs.readFileSync(alistirmaPath, 'utf-8');
            const rawData: RawAnadoluQuestion[] = JSON.parse(content);
            if (Array.isArray(rawData)) {
                rawData.forEach(r => {
                    const mapped = mapRawToApp(r);
                    if (!ids.has(mapped.id)) {
                        questions.push(mapped);
                        ids.add(mapped.id);
                    }
                });
            }
        } catch (e) {
            console.warn(`Error parsing alistirma-sorulari for ${slug}:`, e);
        }
    }

    // 2. Process Cikmis Sorular
    const cikmisPath = path.join(courseRawDir, 'cikmis-sorular.json');
    if (fs.existsSync(cikmisPath)) {
        try {
            const content = fs.readFileSync(cikmisPath, 'utf-8');
            const rawData = JSON.parse(content);
            const rawList: RawAnadoluExamQuestion[] = Array.isArray(rawData) ? rawData : (rawData.questions || []);

            if (Array.isArray(rawList)) {
                rawList.forEach(r => {
                    const mapped = mapExamToApp(r);
                    if (!ids.has(mapped.id)) {
                        questions.push(mapped);
                        ids.add(mapped.id);
                    }
                });
            }
        } catch (e) {
            console.warn(`Error parsing cikmis-sorular for ${slug}:`, e);
        }
    }

    if (questions.length > 0) {
        fs.writeFileSync(destFilePath, JSON.stringify(questions, null, 2));
        console.log(`✅ Synced ${slug} (${questions.length} questions)`);
    } else {
        // console.log(`⚠️  No questions found for ${slug}`);
    }
}

function start() {
    if (!fs.existsSync(RAW_ANADOLU_DIR)) {
        console.error(`Cannot find raw directory: ${RAW_ANADOLU_DIR}`);
        return;
    }

    const items = fs.readdirSync(RAW_ANADOLU_DIR);
    console.log(`Scanning ${items.length} folders in ${RAW_ANADOLU_DIR}...`);

    items.forEach(item => {
        if (item === '.DS_Store') return;
        const fullPath = path.join(RAW_ANADOLU_DIR, item);
        if (fs.statSync(fullPath).isDirectory()) {
            processCourse(item);
        }
    });

    console.log("Sync complete.");
}

start();
