
import fs from "fs";
import path from "path";

// Paths
const PORTAL_ROOT = process.cwd();
const MCP_ROOT = path.resolve(PORTAL_ROOT, "../acik-ogretim-mcp");
const PORTAL_QUESTIONS_DIR = path.join(PORTAL_ROOT, "data/questions/ataturk-aof");
const MCP_RAW_DIR = path.join(MCP_ROOT, "data/raw/ataturk-aof");

// Type definitions based on observed data
interface RawQuestion {
    SoruID?: number;
    SoruMetni?: string;
    Aciklama?: string;
    CevapSecenekleri?: any;
    DogruCevap?: string;
    Unite?: number;
    DersId?: number;
    OBSDersId?: number;
    // Add others if needed
    [key: string]: any;
}

interface AppQuestion {
    id: string;
    unitNumber: number;
    text: string;
    options: Record<string, string>;
    correctAnswer: string;
    explanation?: string;
    // Keep legacy or other fields if useful?
    source?: string;
}

import he from "he";

import { cleanHtml, repairText } from './utils/clean-html.js';

function cleanText(text: string, options: { encode?: boolean, markdown?: boolean, isTechnical?: boolean } = {}): string {
    if (!text) return "";

    let cleaned: string;

    if (options.encode) {
        // HTML Teaching Mode: Treat content as literal text to be displayed as code
        // 1. Basic string repair (entities, normalization) without DOM parsing/stripping
        // We do NOT use cleanHtml here because it strips tags like <input> which are "empty"
        cleaned = repairText(text, { stripLoneBr: false });

        // Fix: repairText might introduce entities (like &sim; for ~).
        // Since we are about to he.escape EVERYTHING, we must first decode these entities back to chars
        // so that logic/math symbols render as symbols (~) and not as entity code (&sim;).
        cleaned = he.decode(cleaned);

        // 2. Escape ALL chars to ensure they display as code
        cleaned = he.escape(cleaned);

        // RESTORE punctuation that he.escape over-encodes for Turkish (e.g., HTML'de)
        cleaned = cleaned.replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

        // 3. Restore whitelist tags - REMOVED for HTML teaching courses
        // We generally want "Code" to look like Code (e.g. <b> should show as <b>, not bold text)
        // If there was legitimate formatting in options, it's a tradeoff we accept to allow <b> tags to be visible as answers.
    } else {
        // Standard Mode: Clean and format HTML
        cleaned = cleanHtml(text, { isTechnical: options.isTechnical });
    }

    // ... post processing handled by cleanHtml or implicitly done
    // But wait, cleanHtml already returns trimmed string.

    // 4. Markdown Bold to HTML (Apply to all unless specifically disabled)
    // Note: cleanHtml already does some markdown support, but we keep this for encode path too


    // 5. Normalize and trim (Most already done by repairText/cleanHtml)
    let result = cleaned
        .replace(/<br\s+type="_moz"\s*\/?>/gi, "<br />")
        .trim();

    // 6. Remove <br> tags around list elements
    result = result.replace(/(?:<br\s*\/?>\s*)+(<(?:ul|ol|li)[^>]*>)/gi, "$1");
    result = result.replace(/(<\/(?:ul|ol|li)>)(?:\s*<br\s*\/?>)+/gi, "$1");
    result = result.replace(/^(?:<br\s*\/?>\s*)+/i, "");
    result = result.replace(/(?:<br\s*\/?>\s*)+$/i, "");

    // 7. Fallback: If cleaning resulted in empty string but input had content, use full escape
    if (result === "" && text.trim() !== "") {
        // Fallback to fully escaped version of the repaired text
        const fallback = he.escape(he.decode(repairText(text, { stripLoneBr: false })));
        return fallback.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').trim();
    }

    // 7. Escape '<' that are NOT part of known HTML tags for STANDARD mode
    if (!options.encode) {
        // Known tags whitelist...
        let knownTags = "b|i|u|br|p|ul|ol|li|dl|dt|dd|sub|sup|strong|em|s|strike|del|ins|small|big|tt|table|thead|tbody|tfoot|tr|td|th|img|blockquote|code|pre|kbd|samp|var";

        // If NOT a technical course, also allow common structural/media tags to be rendered
        if (!options.isTechnical) {
            knownTags += "|span|div|a|font|o:p";
        }

        result = result.replace(new RegExp(`<(?!\\/?(?:${knownTags})[\\s>\\/]|!--)`, 'gi'), "&lt;");
    }

    return result.trim();
}

function mapRawToApp(raw: RawQuestion, slug: string): AppQuestion {
    // Courses that teach HTML/Programming - options should show HTML as text

    const isTechnical = htmlTeachingCourses.includes(slug);
    const shouldEncodeOptions = isTechnical;

    const q: AppQuestion = {
        id: String(raw.SoruID || raw.id),
        unitNumber: raw.Unite || raw.unitNumber || 0,
        // Text/Explanation context matches the course type
        text: cleanText(raw.SoruMetni || raw.text || "", { encode: false, isTechnical }),
        correctAnswer: (raw.DogruCevap || raw.correctAnswer || "").trim(),
        options: {}
    };

    if (raw.Aciklama) {
        q.explanation = cleanText(raw.Aciklama, { encode: false, isTechnical });
    }

    // Map options A, B, C, D, E
    // For HTML teaching courses, options get full encoding to show HTML as text (isTechnical=true)
    // For other courses, formatting is preserved (isTechnical=false)
    ['A', 'B', 'C', 'D', 'E'].forEach(optKey => {
        const optVal = raw[optKey as keyof RawQuestion];
        if (optVal) {
            q.options[optKey] = cleanText(String(optVal), { encode: shouldEncodeOptions, isTechnical });
        }
    });

    return q;
}

const htmlTeachingCourses = [
    'web-tasariminin-temelleri',
    'duyarli-web-tasarimi',
    'internet-programciligi-i',
    'internet-programciligi-ii',
    'programlama-temelleri',
    'web-editoru',
    'veri-tabani-yonetim-sistemleri',
    'web-okuryazarligi',
    'ileri-web-programlama'
];

async function processCourse(slug: string) {
    const rawFilePath = path.join(MCP_RAW_DIR, slug, "alistirma-sorulari.json");
    const destFilePath = path.join(PORTAL_QUESTIONS_DIR, `${slug}.json`);

    if (!fs.existsSync(rawFilePath)) return false;

    try {
        const rawContent = fs.readFileSync(rawFilePath, "utf-8");
        const rawData: RawQuestion[] = JSON.parse(rawContent);

        if (!Array.isArray(rawData)) {
            console.warn(`⚠️  Skipping ${slug}: Raw data is not an array`);
            return false;
        }

        // Load existing app data to preserve fields (like explanation)
        const existingMap = new Map<string, AppQuestion>();
        if (fs.existsSync(destFilePath)) {
            try {
                const existingContent = fs.readFileSync(destFilePath, "utf-8");
                const existingData: AppQuestion[] = JSON.parse(existingContent);
                if (Array.isArray(existingData)) {
                    existingData.forEach(q => existingMap.set(q.id, q));
                }
            } catch (e) {
                // Silently skip corrupted existing files
            }
        }

        // Load extra explanations if available
        const extraExplanationsMap = new Map<string, string>();
        const explanationsFilePath = path.join(MCP_RAW_DIR, slug, "alistirma-sorulari-aciklamalar.json");
        if (fs.existsSync(explanationsFilePath)) {
            try {
                const explContent = fs.readFileSync(explanationsFilePath, "utf-8");
                const explData = JSON.parse(explContent);
                if (Array.isArray(explData)) {
                    const isTechnical = htmlTeachingCourses.includes(slug);
                    explData.forEach((item: any) => {
                        if (item.SoruID && item.Aciklama) {
                            extraExplanationsMap.set(String(item.SoruID), cleanText(item.Aciklama, { encode: false, isTechnical }));
                        }
                    });
                }
            } catch (e) {
                console.warn(`WARN: Failed to parse explanations for ${slug}`);
            }
        }

        const appData = rawData.map(raw => {
            const q = mapRawToApp(raw, slug);
            const existing = existingMap.get(q.id);

            if (extraExplanationsMap.has(q.id)) {
                q.explanation = extraExplanationsMap.get(q.id);
            }

            if (!q.explanation && existing?.explanation) {
                q.explanation = existing.explanation;
            }

            return q;
        });

        fs.writeFileSync(destFilePath, JSON.stringify(appData, null, 2));
        console.log(`✅ Synced ${slug} (${appData.length} questions) [Merged]`);
        return true;

    } catch (e) {
        console.error(`❌ Error syncing ${slug}:`, e);
        return false;
    }
}

async function syncRawToQuestions() {
    console.log("🚀 Syncing Questions from MCP Raw Data (True Parallel Mode)...");

    if (!fs.existsSync(PORTAL_QUESTIONS_DIR)) {
        fs.mkdirSync(PORTAL_QUESTIONS_DIR, { recursive: true });
    }

    const args = process.argv.slice(2);
    const filters = args
        .filter(arg => arg.startsWith('--filter='))
        .map(arg => arg.split('=')[1]);

    if (filters.length > 0) {
        console.log(`🔍 Filtering for courses matching: ${JSON.stringify(filters)}`);
    }

    const courseDirs = fs.readdirSync(MCP_RAW_DIR).filter(file => {
        const isDir = fs.statSync(path.join(MCP_RAW_DIR, file)).isDirectory();
        if (!isDir) return false;
        if (filters.length > 0) {
            return filters.some(f => file.includes(f));
        }
        return true;
    });

    const CONCURRENCY_LIMIT = 20;
    let syncedCount = 0;
    const queue = [...courseDirs];
    const activeTasks: Promise<boolean>[] = [];

    while (queue.length > 0 || activeTasks.length > 0) {
        // Fill slots
        while (activeTasks.length < CONCURRENCY_LIMIT && queue.length > 0) {
            const slug = queue.shift()!;
            const task = processCourse(slug).then(res => {
                // Remove self from active tasks
                const index = activeTasks.indexOf(task);
                if (index !== -1) activeTasks.splice(index, 1);
                if (res) syncedCount++;
                return res;
            });
            activeTasks.push(task);
        }

        // Wait for at least one task to complete
        if (activeTasks.length > 0) {
            await Promise.race(activeTasks);
        }
    }

    console.log(`\n✨ Sync complete. Updated ${syncedCount} course files.`);
}

syncRawToQuestions();
