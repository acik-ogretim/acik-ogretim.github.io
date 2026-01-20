
import { execSync } from 'child_process';
import fs from 'fs';
// If chalk isn't in package.json, we'll stick to plain text or simple ANSI codes.

const QUESTIONS_DIR = 'data/questions/anadolu-aof';

// Helper to get file content from HEAD
function getGitFileContent(filePath: string): string {
    try {
        // git show HEAD:path/to/file
        return execSync(`git show HEAD:${filePath}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    } catch (e) {
        return ""; // File might be new
    }
}

// Simple color helper
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

function main() {
    // 1. Get list of changed files
    const diffOutput = execSync(`git diff --name-only ${QUESTIONS_DIR}`, { encoding: 'utf-8' });
    const files = diffOutput.split('\n').filter(f => f.trim()).map(f => f.trim());

    if (files.length === 0) {
        console.log("No files changed.");
        return;
    }

    console.log(`Found ${files.length} changed files. Analyzing diffs...\n`);

    for (const file of files) {
        console.log(bold(`File: ${file}`));

        let oldContentStr = getGitFileContent(file);
        const newContentStr = fs.readFileSync(file, 'utf-8');

        if (!oldContentStr) {
            console.log(green("  [NEW FILE]"));
            continue;
        }

        let oldData: any[], newData: any[];
        try {
            oldData = JSON.parse(oldContentStr);
            newData = JSON.parse(newContentStr);
        } catch (e) {
            console.log(red("  [ERROR] Failed to parse JSON"));
            continue;
        }

        const oldMap = new Map(oldData.map(q => [q.id, q]));
        const newMap = new Map(newData.map(q => [q.id, q]));

        let changeCount = 0;

        for (const [id, newItem] of newMap.entries()) {
            const oldItem = oldMap.get(id);
            if (!oldItem) {
                // New question added?
                continue;
            }

            const diffs: string[] = [];

            // Compare basic text fields
            ['text', 'explanation', 'correctAnswer'].forEach(field => {
                if (oldItem[field] !== newItem[field]) {
                    diffs.push(field);
                }
            });

            // Compare Options
            if (JSON.stringify(oldItem.options) !== JSON.stringify(newItem.options)) {
                diffs.push('options');
            }

            if (diffs.length > 0) {
                changeCount++;
                console.log(yellow(`  Question ID: ${id}`));

                diffs.forEach(field => {
                    console.log(`    Field: ${bold(field)}`);
                    if (field === 'options') {
                        console.log(red(`      OLD: ${JSON.stringify(oldItem.options)}`));
                        console.log(green(`      NEW: ${JSON.stringify(newItem.options)}`));
                    } else {
                        console.log(red(`      OLD: ${JSON.stringify(oldItem[field])}`));
                        console.log(green(`      NEW: ${JSON.stringify(newItem[field])}`));
                    }
                });
                // Attempt to load raw file if possible to show original
                const rawFileBase = file.replace('data/questions/anadolu-aof/', '').replace('.json', '');
                const rawFilePath = `/Users/wildgenie/Projects/acik-ogretim-mcp/data/raw/anadolu-aof/${rawFileBase}/alistirma-sorulari.json`;

                try {
                    if (fs.existsSync(rawFilePath)) {
                        const rawData = JSON.parse(fs.readFileSync(rawFilePath, 'utf-8'));
                        const rawItem = rawData.find((q: any) => String(q.QuestionId) === id);
                        if (rawItem) {
                            console.log(`    ${bold("RAW INPUT:")}`);
                            console.log(`      Text: ${JSON.stringify(rawItem.Text)}`);
                            ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
                                if (rawItem[opt]) console.log(`      ${opt}: ${JSON.stringify(rawItem[opt])}`);
                            });
                        }
                    }
                } catch (e) { }

                console.log(""); // Empty line

                if (changeCount === 0) {
                    console.log("  No content changes found (maybe just formatting?).");
                }
            }
        }
    }
}
main();
