import fs from 'fs';
import path from 'path';
import { cleanHtml as cleanHtmlFast } from '../utils/clean-html.ts';
import { cleanHtml as cleanHtmlOriginal } from '../utils/clean-html.ts';
// @ts-ignore

// Adjust path as needed based on where you run it from
const SAMPLE_FILE = path.resolve('../acik-ogretim-mcp/data/raw/anadolu-aof/internet-tabanli-programlama/alistirma-sorulari.json');

async function runVerification() {
    console.log(`Reading sample file: ${SAMPLE_FILE}`);
    if (!fs.existsSync(SAMPLE_FILE)) {
        console.error("Sample file not found!");
        process.exit(1);
    }

    const content = fs.readFileSync(SAMPLE_FILE, 'utf-8');
    const data = JSON.parse(content);
    const questions = Array.isArray(data) ? data : (data.questions || data.data || []);

    console.log(`Loaded ${questions.length} questions. Verifying...`);

    let diffCount = 0;

    for (const [i, q] of questions.entries()) {
        const fields = ['Text', 'AnswerExplanation', 'A', 'B', 'C', 'D', 'E'];

        for (const field of fields) {
            const raw = q[field] || "";
            if (!raw) continue;

            const opts = { isExplanation: field === 'AnswerExplanation', isTechnical: false };
            const original = cleanHtmlOriginal(raw, opts);
            const fast = cleanHtmlFast(raw, opts);

            if (original !== fast) {
                console.log(`\n[DIFF] Question ${i} Field ${field}`);
                console.log('--- Original ---');
                console.log(original);
                console.log('--- Fast ---');
                console.log(fast);
                console.log('--- Diff ---');
                // Simple char diff output for debugging
                let diffMsg = "";
                for (let k = 0; k < Math.max(original.length, fast.length); k++) {
                    if (original[k] !== fast[k]) {
                        diffMsg += `Mismatch at ${k}: '${original[k]}' vs '${fast[k]}'\n`;
                        if (original.slice(k - 10, k + 10) === fast.slice(k - 10, k + 10)) {
                            // Context
                            diffMsg += `Context: ...${original.slice(k - 5, k + 5)}...\n`;
                        }
                        break; // Just first mismatch
                    }
                }
                console.log(diffMsg);

                diffCount++;
                if (diffCount > 5) {
                    console.error("Too many diffs, stopping.");
                    process.exit(1);
                }
            }
        }
    }

    if (diffCount === 0) {
        console.log("SUCCESS: All outputs match!");
    } else {
        console.log(`FAILED: ${diffCount} differences found.`);
        process.exit(1);
    }
}

runVerification();
