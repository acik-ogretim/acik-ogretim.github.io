
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

function cleanText(text: string): string {
    if (!text) return "";
    return text
        .replace(/<br\s+type="_moz"\s*\/?>/gi, "<br />") // Convert Firefox br to normal br
        .replace(/\r\n/g, "") // Remove Windows newlines (often clutter in HTML content)
        .trim()
        .replace(/(<br\s*\/?>)+$/i, ""); // Remove trailing <br> tags
}

function mapRawToApp(raw: RawQuestion): AppQuestion {
    const q: AppQuestion = {
        id: String(raw.SoruID || raw.id), // Fallback if id exists
        unitNumber: raw.Unite || raw.unitNumber || 0,
        text: cleanText(raw.SoruMetni || raw.text),
        correctAnswer: (raw.DogruCevap || raw.correctAnswer || "").trim(),
        options: {}
    };

    if (raw.Aciklama) {
        q.explanation = cleanText(raw.Aciklama);
    } else if (raw.explanation) {
        q.explanation = cleanText(raw.explanation);
    }

    // Map options
    // Raw might have A, B, C, D, E directly OR CevapSecenekleri
    if (raw.A || raw.B) {
        if (raw.A) q.options['A'] = cleanText(raw.A);
        if (raw.B) q.options['B'] = cleanText(raw.B);
        if (raw.C) q.options['C'] = cleanText(raw.C);
        if (raw.D) q.options['D'] = cleanText(raw.D);
        if (raw.E) q.options['E'] = cleanText(raw.E);
    } else if (raw.CevapSecenekleri) {
        // Need to parse if it's an object or something else
        // Usually raw file from fetcher flattens A,B,C... or keeps them?
        // Let's assume A, B, C... properties exist on the raw object from observations
    }

    // If raw object has A, B... as properties (which ata.py seems to do)
    // check for those.
    ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
        if (raw[opt] && typeof raw[opt] === 'string') {
            q.options[opt] = cleanText(raw[opt]);
        }
    });

    return q;
}

function start() {
    console.log("🚀 Syncing Questions from MCP Raw Data...");

    if (!fs.existsSync(MCP_RAW_DIR)) {
        console.error(`❌ MCP Raw directory not found: ${MCP_RAW_DIR}`);
        return;
    }

    if (!fs.existsSync(PORTAL_QUESTIONS_DIR)) {
        console.error(`❌ Portal Questions directory not found: ${PORTAL_QUESTIONS_DIR}`);
        return;
    }

    const courseDirs = fs.readdirSync(MCP_RAW_DIR);
    let syncedCount = 0;

    for (const slug of courseDirs) {
        const rawFilePath = path.join(MCP_RAW_DIR, slug, "alistirma-sorulari.json");
        const destFilePath = path.join(PORTAL_QUESTIONS_DIR, `${slug}.json`);

        if (!fs.existsSync(rawFilePath)) continue;

        try {
            const rawContent = fs.readFileSync(rawFilePath, "utf-8");
            const rawData: RawQuestion[] = JSON.parse(rawContent);

            if (!Array.isArray(rawData)) {
                console.warn(`⚠️  Skipping ${slug}: Raw data is not an array`);
                continue;
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
                    console.warn(`⚠️  Could not read existing file ${destFilePath}, creating new.`);
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
                        explData.forEach((item: any) => {
                            if (item.SoruID && item.Aciklama) {
                                extraExplanationsMap.set(String(item.SoruID), cleanText(item.Aciklama));
                            }
                        });
                        console.log(`INFO: Found ${extraExplanationsMap.size} extra explanations for ${slug}`);
                    }
                } catch (e) {
                    console.warn(`WARN: Failed to parse explanations file for ${slug}`);
                }
            }

            const appData = rawData.map(raw => {
                const q = mapRawToApp(raw);
                const existing = existingMap.get(q.id);

                // Priority for explanation:
                // 1. Raw object itself (if present)
                // 2. Extra explanations file
                // 3. Existing local file (preservation)

                if (extraExplanationsMap.has(q.id)) {
                    q.explanation = extraExplanationsMap.get(q.id);
                }

                // Preserve explanation if missing in raw/extra but present in existing
                if (!q.explanation && existing?.explanation) {
                    q.explanation = existing.explanation;
                }

                // You might also want to preserve other manual fields?
                // For now, explanation is the critical one mentioned by user.

                return q;
            });

            fs.writeFileSync(destFilePath, JSON.stringify(appData, null, 2));
            console.log(`✅ Synced ${slug} (${appData.length} questions) [Merged]`);
            syncedCount++;

        } catch (e) {
            console.error(`❌ Error syncing ${slug}:`, e);
        }
    }

    console.log(`\n✨ Sync complete. Updated ${syncedCount} course files.`);
}

start();
