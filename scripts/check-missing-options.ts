
import fs from 'fs';
import path from 'path';

const ANADOLU_DIR = path.resolve(process.cwd(), 'data/questions/anadolu-aof');
const AUZEF_DIR = path.resolve(process.cwd(), 'data/questions/auzef');

const EXPECTED_KEYS = new Set(['A', 'B', 'C', 'D', 'E']);

function checkDirectory(dir: string, sourceName: string) {
    if (!fs.existsSync(dir)) {
        console.log(`Directory not found: ${dir}`);
        return;
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    console.log(`Checking ${files.length} files in ${sourceName}...`);

    let totalQuestions = 0;
    let problematicQuestions = 0;
    let problematicCourses = new Set<string>();

    for (const file of files) {
        const filePath = path.join(dir, file);
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const questions = JSON.parse(content);

            if (!Array.isArray(questions)) continue;

            let fileHasIssues = false;

            for (const q of questions) {
                totalQuestions++;
                if (!q.options) {
                    // console.log(`[${file}] Question ${q.id} has NO options.`);
                    problematicQuestions++;
                    fileHasIssues = true;
                    continue;
                }

                const keys = Object.keys(q.options);
                const missingKeys = [...EXPECTED_KEYS].filter(k => !keys.includes(k));

                if (missingKeys.length > 0) {
                    // Start logging detail about missing keys but limit output if it's too huge
                    if (problematicQuestions < 20) {
                        console.log(`[${sourceName}/${file}] Question ${q.id} missing keys: ${missingKeys.join(', ')}`);
                    }
                    problematicQuestions++;
                    fileHasIssues = true;
                }
            }

            if (fileHasIssues) {
                problematicCourses.add(file);
            }

        } catch (e) {
            console.error(`Error processing ${file}:`, e.message);
        }
    }

    console.log(`\n--- ${sourceName} Summary ---`);
    console.log(`Total Questions Scanned: ${totalQuestions}`);
    console.log(`Questions with missing options (incomplete A-E): ${problematicQuestions}`);
    console.log(`Courses with at least one incomplete question: ${problematicCourses.size}`);

    if (problematicCourses.size > 0) {
        console.log(`\nSample of problematic courses:`);
        Array.from(problematicCourses).slice(0, 10).forEach(c => console.log(`- ${c}`));
    }
}

console.log("Starting missing options check...");
checkDirectory(ANADOLU_DIR, "Anadolu AOF");
// checkDirectory(AUZEF_DIR, "AUZEF"); // Optional, check Anadolu first as user is looking at it
