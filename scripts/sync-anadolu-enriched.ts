
import fs from 'fs';
import path from 'path';
import { cleanHtml } from './utils/clean-html.js';

// Configurations
// We assume workspaces are siblings
const PORTAL_ROOT = process.cwd();
const DENEMELER_ROOT = path.resolve(PORTAL_ROOT, '../ataaof-denemeler');
const SOURCE_JSON_DIR = path.join(DENEMELER_ROOT, 'output/Anadolu/json');
const TARGET_DIR = path.join(PORTAL_ROOT, 'data/questions/anadolu-aof');

// Ensure target directory exists
if (!fs.existsSync(TARGET_DIR)) {
    console.log(`Creating directory: ${TARGET_DIR}`);
    fs.mkdirSync(TARGET_DIR, { recursive: true });
}

interface AppQuestion {
    id: string;
    unitNumber: number;
    text: string;
    options: { [key: string]: string };
    correctAnswer: string;
    explanation?: string;
}

// Slugify handling Turkish chars
function slugify(text: string): string {
    const trMap: { [key: string]: string } = {
        'ç': 'c', 'Ç': 'c',
        'ğ': 'g', 'Ğ': 'g',
        'ş': 's', 'Ş': 's',
        'ü': 'u', 'Ü': 'u',
        'ö': 'o', 'Ö': 'o',
        'ı': 'i', 'İ': 'i',
        'â': 'a', 'î': 'i', 'û': 'u'
    };
    return text
        .split('')
        .map(c => trMap[c] || c)
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Interfaces for Source Data (Enriched structure)
interface SourceQuestionExercise {
    SoruID: number | string;
    SoruMetni: string;
    A: string;
    B: string;
    C?: string;
    D?: string;
    E?: string;
    DogruCevap: string;
    Unite: number;
    Aciklama?: string;
    Text?: string;
    QuestionId?: number;
    UniteNo?: number;
    CorrectAnswer?: string;
    AnswerExplanation?: string;
}

interface SourceQuestionExam {
    id: number | string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
    material_id?: string;
    exam_question_number?: number;
    source?: string;
    unitNumber?: number; // Enriched often has this
    UniteNo?: number; // Check for various keys
    topic?: string;
    text?: string;
}

// Validating source types
function isExerciseQuestion(q: any): q is SourceQuestionExercise {
    // Check key fields
    return q && (q.SoruMetni !== undefined || q.SoruID !== undefined || q.Text !== undefined);
}

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

        // Options in Exericse often A, B, C... properties
        ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
            if (q[opt]) mapped.options[opt] = cleanHtml(q[opt]);
        });

        const expl = q.Aciklama || q.AnswerExplanation;
        if (expl && expl.length > 5) {
            mapped.explanation = cleanHtml(expl);
        }

        out.push(mapped);
    });
    return out;
}

function processExamList(list: any[]): AppQuestion[] {
    const out: AppQuestion[] = [];
    list.forEach(q => {
        // Enriched exam usually has 'question' and 'options'[] and 'unitNumber' or 'UniteNo'
        // But the previous analysis said "UniteNo: 1" in Enriched.json

        const qId = q.id;
        const matId = q.material_id || "unknown";
        const uniqueId = `exam-${matId}-${qId}`;

        // Find unit info. Enriched usually puts it in 'unitNumber' or 'UniteNo'
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


// Main Process
function processAll() {
    if (!fs.existsSync(SOURCE_JSON_DIR)) {
        console.error(`Source directory not found: ${SOURCE_JSON_DIR}`);
        return;
    }

    // 1. Gather files per course
    const courseFiles: { [slug: string]: { exercises: string[], exams: string[] } } = {};

    // Directory listing for terms "Donem 1", etc.
    const terms = fs.readdirSync(SOURCE_JSON_DIR);

    terms.forEach(term => {
        if (term === '.DS_Store') return;
        const termPath = path.join(SOURCE_JSON_DIR, term);
        try {
            if (!fs.statSync(termPath).isDirectory()) return;
        } catch { return; }

        const files = fs.readdirSync(termPath);
        files.forEach(f => {
            if (!f.endsWith('.json')) return;
            // Name format: Anadolu - Dönem X - Course Name - Type - Enriched/Raw.json
            const parts = f.replace('.json', '').split(' - ');
            if (parts.length < 4) return;

            const courseName = parts[2];
            const type = parts[3];
            const suffix = parts[4] || "";

            // Prefer Enriched for exams. Exercises usually don't have suffix Enriched but might have Raw.
            // We want the CLEANEST version.
            // Exercises: "Alıştırma Soruları.json" (Standard)
            // Exams: "Çıkmış Sorular - Enriched.json" (Standard for enriched)

            // Skip Raw explicitly
            if (suffix === 'Raw') return;

            if (type !== 'Alıştırma Soruları' && type !== 'Çıkmış Sorular') return;

            if (type === 'Çıkmış Sorular' && suffix !== 'Enriched') return; // Enforce Enriched for exams

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

    // 2. Process each course
    for (const slug of Object.keys(courseFiles)) {
        const fileSet = courseFiles[slug];
        let allQuestions: AppQuestion[] = [];
        const seenIds = new Set<string>();

        // Map to store known unit numbers for questions
        const textToUnitMap = new Map<string, number>();
        const normalizeForMap = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ');

        const collect = (list: AppQuestion[]) => {
            list.forEach(q => {
                if (!seenIds.has(q.id)) {
                    allQuestions.push(q);
                    seenIds.add(q.id);
                    if (q.unitNumber > 0) {
                        textToUnitMap.set(normalizeForMap(q.text), q.unitNumber);
                    }
                }
            });
        };

        // Process Exercises
        fileSet.exercises.forEach(fp => {
            try {
                const rawContent = fs.readFileSync(fp, 'utf-8');
                // Clean problematic control chars before parse (as seen in compare script)
                const cleanedRaw = rawContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
                const raw = JSON.parse(cleanedRaw);
                const questions = processExerciseList(Array.isArray(raw) ? raw : []);
                collect(questions);
            } catch (e: any) { console.warn(`Error processing exercise ${fp}:`, e.message); }
        });

        // Process Exams
        fileSet.exams.forEach(fp => {
            try {
                const rawContent = fs.readFileSync(fp, 'utf-8');
                const cleanedRaw = rawContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
                const raw = JSON.parse(cleanedRaw);
                // Exams Enriched often top level array, or inside 'questions'?
                const list = Array.isArray(raw) ? raw : (raw.questions || []);
                const questions = processExamList(list);
                collect(questions);
            } catch (e: any) { console.warn(`Error processing exam ${fp}:`, e.message); }
        });

        // Backfill missing units
        let backfilledCount = 0;
        allQuestions.forEach(q => {
            if (q.unitNumber === 0) {
                const known = textToUnitMap.get(normalizeForMap(q.text));
                if (known && known > 0) {
                    q.unitNumber = known;
                    backfilledCount++;
                }
            }
        });

        if (allQuestions.length > 0) {
            const dest = path.join(TARGET_DIR, `${slug}.json`);
            fs.writeFileSync(dest, JSON.stringify(allQuestions, null, 2));
            console.log(`✅ Synced ${slug} (${allQuestions.length} questions) [Backfilled: ${backfilledCount}]`);
        }
    }

    console.log("Sync Enriched Complete.");
}

processAll();
