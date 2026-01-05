
import fs from 'fs';
import path from 'path';
import { cleanHtml } from './utils/clean-html.js';

// Configurations
const PORTAL_ROOT = process.cwd();
const DENEMELER_ROOT = path.resolve(PORTAL_ROOT, '../ataaof-denemeler');
const SOURCE_JSON_DIR = path.join(DENEMELER_ROOT, 'output/Auzef/json');
const TARGET_DIR = path.join(PORTAL_ROOT, 'data/questions/auzef');

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

interface SourceQuestion {
    SoruID: string | number;
    SoruMetni: string;
    A?: string;
    B?: string;
    C?: string;
    D?: string;
    E?: string;
    DogruCevap: string;
    Unite?: number;
    Aciklama?: string;
}

function processList(list: any[]): AppQuestion[] {
    const out: AppQuestion[] = [];
    list.forEach(q => {
        if (!q.SoruMetni) return;

        const mapped: AppQuestion = {
            id: String(q.SoruID),
            unitNumber: q.Unite || 0,
            text: cleanHtml(q.SoruMetni),
            correctAnswer: (q.DogruCevap || "").trim().toUpperCase(),
            options: {}
        };

        ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
            if (q[opt]) mapped.options[opt] = cleanHtml(q[opt]);
        });

        if (q.Aciklama && q.Aciklama.length > 5) {
            mapped.explanation = cleanHtml(q.Aciklama);
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

    const courseFiles: { [slug: string]: string[] } = {};

    // 1. Gather files
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
            // Name format: Auzef - Dönem X - Course Name - Type [ - Raw].json
            // We want to avoid Raw files
            if (f.endsWith(' - Raw.json')) return;

            // Pattern: Auzef - Dönem X - [Course Name] - [Type] ...
            const parts = f.replace('.json', '').split(' - ');
            if (parts.length < 4) return;

            // parts[0] = Auzef
            // parts[1] = Dönem X
            // parts[2] = Course Name
            // parts[3] = Type (Alıştırma Soruları, Sorular, etc.)

            const courseName = parts[2];
            const slug = slugify(courseName);

            if (!courseFiles[slug]) courseFiles[slug] = [];
            courseFiles[slug].push(path.join(termPath, f));
        });
    });

    console.log(`Found ${Object.keys(courseFiles).length} courses in AUZEF source.`);

    // 2. Process
    for (const slug of Object.keys(courseFiles)) {
        const filePaths = courseFiles[slug];
        let allQuestions: AppQuestion[] = [];
        const seenIds = new Set<string>();

        filePaths.forEach(fp => {
            try {
                const rawContent = fs.readFileSync(fp, 'utf-8');
                // Clean problematic control chars before parse
                const cleanedRaw = rawContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
                const raw = JSON.parse(cleanedRaw);
                const list = Array.isArray(raw) ? raw : (raw.questions || []);
                const questions = processList(list);

                questions.forEach(q => {
                    // Unique check. Some IDs might collide if they come from different sources but refer to same object?
                    // Or duplicates across files.
                    if (!seenIds.has(q.id)) {
                        allQuestions.push(q);
                        seenIds.add(q.id);
                    }
                });
            } catch (e: any) {
                console.warn(`Error processing ${fp}:`, e.message);
            }
        });

        if (allQuestions.length > 0) {
            const dest = path.join(TARGET_DIR, `${slug}.json`);
            fs.writeFileSync(dest, JSON.stringify(allQuestions, null, 2));
            console.log(`✅ Synced ${slug} (${allQuestions.length} questions)`);
        }
    }
}

processAll();
