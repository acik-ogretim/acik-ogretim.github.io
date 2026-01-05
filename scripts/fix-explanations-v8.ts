import fs from "fs";
import path from "path";

const QUESTIONS_DIR = "data/questions/ataturk-aof";

function fixHtml(text: string) {
    if (!text) return text;

    let result = text;

    // 1. Double encoding cleanup (Very aggressive)
    // &amp;lt; -> &lt;
    // &amp;amp; -> &
    // Repeat until no &amp; followed by an entity
    let prev;
    do {
        prev = result;
        result = result.replace(/&amp;([a-z0-9#]+;)/gi, '&$1');
    } while (result !== prev);

    // 2. Fix literal HTML entities that got double encoded during crawl
    // Sometimes we see things like &amp;nbsp;
    result = result.replace(/&amp;nbsp;/g, ' ');

    // 3. Markdown Bold residues (just in case)
    result = result.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    result = result.replace(/__(.*?)__/g, '<b>$1</b>');

    // 4. Markdown Italic residues
    // Only if surrounded by spaces or start/end to avoid weird tag issues
    result = result.replace(/(^|\s)_(.*?)_(\s|$)/g, '$1<i>$2</i>$3');

    // 5. Stray Backticks: Convert `text` to <code>text</code>
    // If it looks like a tag inside backticks, it should be encoded
    result = result.replace(/`(.*?)`/g, (match, p1) => {
        if (p1.includes('<') || p1.includes('>')) {
            const clean = p1.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<code>${clean}</code>`;
        }
        return `<code>${p1}</code>`;
    });

    // 6. Markdown Blockquotes
    if (result.startsWith('> ')) {
        result = result.replace(/^> /, '');
    }

    // 7. Markdown Links [text](url) -> often the url is just '#' or something
    // We'll just keep the text
    result = result.replace(/\[(.*?)\]\(.*?\)/g, '$1');

    // 8. Clean up nested or redundant code tags
    result = result.replace(/<code><code>/g, '<code>').replace(/<\/code><\/code>/g, '</code>');
    result = result.replace(/<code>\s*<\/code>/g, '');

    // 9. Balance <b>
    const bOpen = (result.match(/<b>/g) || []).length;
    const bClose = (result.match(/<\/b>/g) || []).length;
    if (bOpen > bClose) result += '</b>'.repeat(bOpen - bClose);

    return result.trim();
}

function start() {
    const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith(".json"));

    for (const file of files) {
        const filePath = path.join(QUESTIONS_DIR, file);
        if (!fs.existsSync(filePath)) continue;

        const content = fs.readFileSync(filePath, "utf-8");
        let data;
        try {
            data = JSON.parse(content);
        } catch (e) {
            console.error(`Error parsing ${file}`);
            continue;
        }

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
            console.log(`✅ Refined explanations in ${file}`);
        }
    }
}

start();
