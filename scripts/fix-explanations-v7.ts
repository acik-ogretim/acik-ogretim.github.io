import fs from "fs";
import path from "path";

const QUESTIONS_DIR = "data/questions/ataturk-aof";

function fixHtml(text: string) {
    if (!text) return text;

    let result = text;

    // 1. Convert Markdown Bold (**text** or __text__) to <b>text</b>
    // Use a non-greedy regex to catch pairs
    result = result.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    result = result.replace(/__(.*?)__/g, '<b>$1</b>');

    // 2. Handle single asterisks/underscores for italic if they are clearly markdown
    // Usually we prefer <i> for our system
    // result = result.replace(/\*(.*?)\*/g, '<i>$1</i>');

    // 3. Remove backticks and wrap in code if they were intended for code
    // v6 already removed ` but didn't wrap. Let's see if we should wrap.
    // Actually, v6 just stripped them. If we see `tag`, it likely needs <code>&lt;tag&gt;</code>
    // But since v6 already ran, they might be raw tags now or just stripped.

    // 4. Double encoding fix (common after multiple script runs)
    result = result.replace(/&amp;lt;/g, '&lt;').replace(/&amp;gt;/g, '&gt;');
    result = result.replace(/&amp;nbsp;/g, ' ');

    // 5. Normalization (redundant code tags etc, already handled in v6 but good to keep)
    result = result.replace(/<code><code>/g, '<code>').replace(/<\/code><\/code>/g, '</code>');

    // 6. Final balance of <b> tags (important if markdown bold was messy)
    const bOpen = (result.match(/<b>/g) || []).length;
    const bClose = (result.match(/<\/b>/g) || []).length;
    if (bOpen > bClose) result += '</b>'.repeat(bOpen - bClose);

    return result.trim();
}

function start() {
    const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith(".json"));

    for (const file of files) {
        const filePath = path.join(QUESTIONS_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

        let changed = false;
        data.forEach((q: any) => {
            if (q.explanation) {
                const original = q.explanation;
                q.explanation = fixHtml(q.explanation);
                if (q.explanation !== original) {
                    changed = true;
                }
            }
        });

        if (changed) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`✅ Fixed markdown/encoding in ${file}`);
        }
    }
}

start();
