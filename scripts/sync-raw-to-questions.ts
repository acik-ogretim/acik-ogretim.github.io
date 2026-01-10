
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

function cleanText(text: string, options: { encode?: boolean, markdown?: boolean } = {}): string {
    if (!text) return "";

    // 1. Always decode first to handle existing entities consistently and restore UTF-8 (e.g. &gbreve; -> ğ)
    let cleaned = he.decode(text);
    const useMarkdown = options.markdown !== false;

    if (options.encode) {
        // 2. Escape ONLY critical HTML symbols for safety if requested, keeping Turkish characters as UTF-8
        cleaned = he.escape(cleaned);

        // RESTORE punctuation that he.escape over-encodes for Turkish (e.g., HTML'de)
        cleaned = cleaned.replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

        // 3. Restore whitelist tags that are allowed for formatting
        // Narrowed to ONLY formatting tags. Elements like ul, ol, li are removed so they show up as text code snippets.
        const whitelist = ['b', 'strong', 'i', 'em', 'u', 'br', 'span'];

        whitelist.forEach(tag => {
            // Handle he.escape output (which escapes & to &amp;)
            const openRegex = new RegExp(`&amp;lt;${tag}(.*?)&amp;gt;`, 'gi');
            // We need to capture attributes for span
            cleaned = cleaned.replace(openRegex, (match, attrs) => {
                return `<${tag}${attrs ? attrs.replace(/&amp;quot;/g, '"') : ''}>`;
            });

            const closeRegex = new RegExp(`&amp;lt;\\/${tag}\\s*&amp;gt;`, 'gi');
            cleaned = cleaned.replace(closeRegex, `</${tag}>`);

            // Handle direct &lt; cases for general safety (redundant but safe)
            const openRegex2 = new RegExp(`&lt;${tag}(.*?)&gt;`, 'gi');
            cleaned = cleaned.replace(openRegex2, (match, attrs) => {
                return `<${tag}${attrs ? attrs.replace(/&quot;/g, '"') : ''}>`;
            });

            const closeRegex2 = new RegExp(`&lt;\\/${tag}\\s*&gt;`, 'gi');
            cleaned = cleaned.replace(closeRegex2, `</${tag}>`);
        });
    }

    // 4. Markdown Bold to HTML (Apply to all unless specifically disabled)
    if (useMarkdown) {
        cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
        cleaned = cleaned.replace(/`(.*?)`/g, "<code>$1</code>");
    }

    // 5. Normalize and trim
    let result = cleaned
        .replace(/[\u00A0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/g, " ")
        .replace(/<br\s+type="_moz"\s*\/?>/gi, "<br />")
        // .replace(/<\/?span[^>]*>/gi, "") // KEEP SPANS as requested (e.g. math-tex)
        .replace(/\r\n/g, "")
        // Map to HTML Entities for better consistency and rendering
        .replace(//g, "&sim;")
        .replace(/∼/g, "&sim;") // U+223C
        .replace(/~/g, "&sim;") // ASCII tilde to &sim; (Logic context preference)
        .replace(//g, "&rArr;")
        .replace(/⇒/g, "&rArr;") // U+21D2
        .replace(//g, "&hArr;")
        .replace(/⇔/g, "&hArr;") // U+21D4
        .replace(//g, "&or;")
        .replace(/∨/g, "&or;") // U+2228
        .replace(//g, "&and;")
        .replace(/∧/g, "&and;") // U+2227
        .replace(//g, "&there4;")
        .replace(/∴/g, "&there4;") // U+2234
        .replace(//g, "&equiv;")
        .replace(/≡/g, "&equiv;") // U+2261
        .replace(//g, "&exist;") // U+F024
        .replace(/∃/g, "&exist;") // U+2203
        .replace(//g, "&forall;") // U+F022
        .replace(/∀/g, "&forall;") // U+2200
        .replace(//g, "&empty;") // U+F0C6 - Empty Set
        .replace(//g, "&rarr;") // U+F0E0 - Right Arrow
        .replace(//g, "&bull;") // U+F0B7 - Bullet
        .replace(/\uF020/g, " ") // U+F020 - Symbol Font Space
        // Pre-strip fixes with support for artifacts (U+FFFD)
        .replace(/<<</g, "") // Remove artifact '<<<', keep the text after it
        .replace(/yang[\uFFFD]+nın/g, "yangının")
        .replace(/çal[\uFFFD]+şma/g, "çalışma")
        .replace(/([Yy])ar[\uFFFD]+m/g, "$1arım") // Fix Yarım/yarım (safe with +)
        .replace(/sıras[\uFFFD]+yla/g, "sırasıyla") // Fix sırasıyla
        .replace(/bağıms[\uFFFD]+zlık/g, "bağımsızlık") // Fix bağımsızlık
        .replace(/\uFFFD/g, "") // Remove replacement characters
        .replace(/\u007F/g, "") // Remove DELETE characters
        .replace(//g, "{")
        .replace(//g, "}")
        .trim();

    // 6. Remove <br> tags around list elements to prevent excessive spacing
    result = result.replace(/(?:<br\s*\/?>\s*)+(<(?:ul|ol|li)[^>]*>)/gi, "$1"); // remove br BEFORE list
    result = result.replace(/(<\/(?:ul|ol|li)>)(?:\s*<br\s*\/?>)+/gi, "$1"); // remove br AFTER list
    result = result.replace(/^(?:<br\s*\/?>\s*)+/i, ""); // remove br AT START
    result = result.replace(/(?:<br\s*\/?>\s*)+$/i, ""); // remove br AT END

    return result.trim();
}

function mapRawToApp(raw: RawQuestion, slug: string): AppQuestion {
    const shouldEncode = slug === 'web-tasariminin-temelleri';

    const q: AppQuestion = {
        id: String(raw.SoruID || raw.id),
        unitNumber: raw.Unite || raw.unitNumber || 0,
        text: cleanText(raw.SoruMetni || raw.text, { encode: shouldEncode }),
        correctAnswer: (raw.DogruCevap || raw.correctAnswer || "").trim(),
        options: {}
    };

    if (raw.Aciklama) {
        q.explanation = cleanText(raw.Aciklama, { encode: shouldEncode });
    }

    // Map options A, B, C, D, E
    ['A', 'B', 'C', 'D', 'E'].forEach(optKey => {
        if (raw[optKey as keyof RawQuestion]) {
            q.options[optKey] = cleanText(String(raw[optKey as keyof RawQuestion]), { encode: shouldEncode });
        }
    });

    return q;
}

async function syncRawToQuestions() {
    console.log("🚀 Syncing Questions from MCP Raw Data...");

    // Ensure output directory exists
    if (!fs.existsSync(PORTAL_QUESTIONS_DIR)) {
        fs.mkdirSync(PORTAL_QUESTIONS_DIR, { recursive: true });
    }

    // Parse command line arguments for filtering
    const args = process.argv.slice(2);
    const filterArg = args.find(arg => arg.startsWith('--filter='));
    const filter = filterArg ? filterArg.split('=')[1] : null;

    if (filter) {
        console.log(`🔍 Filtering for courses containing: "${filter}"`);
    }

    // Get all course slugs from the raw directory
    const courseDirs = fs.readdirSync(MCP_RAW_DIR).filter(file => {
        const isDir = fs.statSync(path.join(MCP_RAW_DIR, file)).isDirectory();
        if (!isDir) return false;
        if (filter && !file.includes(filter)) return false;
        return true;
    });

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
                        const shouldEncode = (slug as string) === 'web-tasariminin-temelleri';
                        explData.forEach((item: any) => {
                            if (item.SoruID && item.Aciklama) {
                                extraExplanationsMap.set(String(item.SoruID), cleanText(item.Aciklama, { encode: shouldEncode }));
                            }
                        });
                        console.log(`INFO: Found ${extraExplanationsMap.size} extra explanations for ${slug}`);
                    }
                } catch (e) {
                    console.warn(`WARN: Failed to parse explanations file for ${slug}`);
                }
            }

            const appData = rawData.map(raw => {
                const q = mapRawToApp(raw, slug);
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

syncRawToQuestions();
