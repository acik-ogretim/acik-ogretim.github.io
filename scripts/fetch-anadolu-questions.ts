
import { existsSync, mkdirSync } from 'node:fs';
import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Helper for ESM directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from sibling project
const mcpDir = path.resolve(__dirname, '../../acik-ogretim-mcp');
const mcpEnvPath = path.join(mcpDir, '.env');
dotenv.config({ path: mcpEnvPath });

const AUTH_TOKEN = process.env.ANADOLU_AUTH_TOKEN;

if (!AUTH_TOKEN) {
    console.error("❌ ANADOLU_AUTH_TOKEN not found in environment variables.");
    process.exit(1);
}

// Configuration
const MAX_UNITS = 14;

// COURSES reside in Portal (this project)
const PORTAL_DATA_DIR = path.resolve(process.cwd(), 'data');
const COURSES_DIR = path.join(PORTAL_DATA_DIR, 'courses', 'anadolu-aof');

// RAW OUTPUT resides in MCP (sibling project) as requested by user
const RAW_OUTPUT_DIR = path.join(mcpDir, 'data', 'raw', 'anadolu-aof');

if (!existsSync(COURSES_DIR)) {
    console.error(`❌ Courses directory not found: ${COURSES_DIR}`);
    process.exit(1);
}

console.log(`📂 Using Courses Directory: ${COURSES_DIR}`);
console.log(`📂 Using Raw Output Directory: ${RAW_OUTPUT_DIR}`);

function fetchJson(urlPath: string): Promise<any> {
    return new Promise((resolve) => {
        const options = {
            hostname: "ets-ws.anadolu.edu.tr",
            path: `/v2filikaapi${urlPath}`,
            method: "GET",
            headers: {
                "accept": "*/*",
                "accept-language": "tr,en-US;q=0.9,en;q=0.8",
                "authorization": AUTH_TOKEN,
                "cache-control": "no-cache",
                "pragma": "no-cache",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-site",
                "Referer": "https://lmsstuff.anadolu.edu.tr/",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)"
            }
        };

        const req = https.request(options, (res) => {
            res.setEncoding('utf8');
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (e) {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            });
        });

        req.on('error', (e) => {
            console.error(`[ERROR] Request failed for ${urlPath}:`, e.message);
            resolve(null);
        });
        req.end();
    });
}

function cleanQuestion(q: any) {
    if (!q) return;
    delete q.UserAnswer;
    delete q.QuestionNumber;
}

async function fetchQuestionsForUnit(code: string, unit: number): Promise<any[]> {
    const url = `/examservice/create/20/${encodeURIComponent(code)}/${unit}`;
    const json = await fetchJson(url);

    if (!json) return [];

    let rawQs: any[] = [];
    if (Array.isArray(json)) rawQs = json;
    else if (Array.isArray(json.Questions)) rawQs = json.Questions;
    else if (Array.isArray(json.questions)) rawQs = json.questions;
    else if (Array.isArray(json.Sorular)) rawQs = json.Sorular;

    return rawQs.map(q => {
        if (!q.UniteNo) q.UniteNo = unit;
        cleanQuestion(q);
        return q;
    });
}

// Map<CourseCode, { info: Course, slugs: Set<string> }>
interface CourseMapItem {
    info: any;
    slugs: Set<string>;
}

async function runQueue(items: any[], limit: number, worker: (item: any) => Promise<void>) {
    let index = 0;
    const active: Promise<void>[] = [];
    while (index < items.length || active.length > 0) {
        while (active.length < limit && index < items.length) {
            const item = items[index++];
            const p = worker(item).then(() => {
                active.splice(active.indexOf(p), 1);
            });
            active.push(p);
        }
        if (active.length > 0) await Promise.race(active);
    }
}

async function main() {
    console.log("🚀 Starting Optimized Anadolu Fetch (Target: MCP Raw Tools)...");

    // 1. Scan all departments and build unique course map
    const files = (await fs.readdir(COURSES_DIR)).filter(f => f.endsWith('.json'));
    const courseMap = new Map<string, CourseMapItem>();

    console.log(`Scanning ${files.length} departments for courses...`);

    for (const file of files) {
        const content = await fs.readFile(path.join(COURSES_DIR, file), 'utf-8');
        try {
            const courses = JSON.parse(content);
            for (const c of courses) {
                if (!c.code) continue;
                const code = c.code.trim();

                if (!courseMap.has(code)) {
                    courseMap.set(code, { info: c, slugs: new Set() });
                }
                const item = courseMap.get(code)!;
                if (c.id) item.slugs.add(c.id);
            }
        } catch (e) {
            console.error(`Error parsing ${file}:`, e);
        }
    }

    const uniqueCourses = Array.from(courseMap.values());
    console.log(`Found ${uniqueCourses.length} unique courses across all departments.`);

    // 2. Process unique courses in parallel
    const CONCURRENCY_COURSES = 30; // Increased for speed

    await runQueue(uniqueCourses, CONCURRENCY_COURSES, async (item) => {
        const { info, slugs } = item;
        const code = info.code;

        // Greedy Fetching: Continue iterating as long as new questions are appearing
        const allQuestionsMap = new Map<string, any>();
        let iteration = 0;
        let consecutiveNoNew = 0;
        const MAX_ITER = 30; // Reasonable safety limit
        const NO_NEW_LIMIT = 5; // Stop if 5 consecutive passes find nothing new

        while (iteration < MAX_ITER && consecutiveNoNew < NO_NEW_LIMIT) {
            iteration++;
            let newThisPass = 0;
            const units = Array.from({ length: MAX_UNITS }, (_, i) => i + 1);

            // Parallel unit fetching for this pass
            const unitResults = await Promise.all(units.map(u => fetchQuestionsForUnit(code, u)));

            for (const batch of unitResults) {
                for (const q of batch) {
                    const qId = String(q.QuestionId);
                    if (!allQuestionsMap.has(qId)) {
                        allQuestionsMap.set(qId, q);
                        newThisPass++;
                    }
                }
            }

            if (newThisPass === 0) {
                consecutiveNoNew++;
                if (iteration === 1) break; // If first pass is empty, likely course is empty
            } else {
                consecutiveNoNew = 0;
            }
        }

        // If no questions found, skip writing
        if (allQuestionsMap.size === 0) return;

        const sortedNewQuestions = Array.from(allQuestionsMap.values()).sort((a, b) => {
            return (a.UniteNo - b.UniteNo) || String(a.QuestionId).localeCompare(String(b.QuestionId));
        });

        // 3. Write to ALL associated slugs/folders in MCP
        for (const slug of slugs) {
            const courseDir = path.join(RAW_OUTPUT_DIR, slug);
            const outFile = path.join(courseDir, "alistirma-sorulari.json");

            if (!existsSync(courseDir)) {
                mkdirSync(courseDir, { recursive: true });
            }

            // Load existing from THIS slug to merge with history
            let finalMap = new Map<string, any>();
            if (existsSync(outFile)) {
                try {
                    const content = await fs.readFile(outFile, 'utf-8');
                    const ex = JSON.parse(content);
                    if (Array.isArray(ex)) {
                        ex.forEach((q: any) => {
                            // SKIP corrupted entries from history
                            if (JSON.stringify(q).includes('\uFFFD')) return;

                            cleanQuestion(q); // Clean historical data
                            finalMap.set(String(q.QuestionId), q);
                        });
                    }
                } catch { }
            }

            const beforeCount = finalMap.size;

            // OVERWRITE & ADD Logic:
            sortedNewQuestions.forEach(q => {
                // Ensure we don't add new corruption
                if (!JSON.stringify(q).includes('\uFFFD')) {
                    finalMap.set(String(q.QuestionId), q);
                }
            });

            const afterCount = finalMap.size;

            const finalSorted = Array.from(finalMap.values()).sort((a, b) => {
                return (a.UniteNo - b.UniteNo) || String(a.QuestionId).localeCompare(String(b.QuestionId));
            });

            // Write updates
            await fs.writeFile(outFile, JSON.stringify(finalSorted, null, 4));

            if (afterCount > beforeCount) {
                console.log(`   [${slug}] ${code}: +${afterCount - beforeCount} new (Total: ${afterCount})`);
            }
        }
    });

    console.log("\nAll unique courses processed.");
}

main();
