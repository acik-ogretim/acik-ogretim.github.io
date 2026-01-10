
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data/questions/ataturk-aof/paket-programlar-i.json');

if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf-8');
const data = JSON.parse(content);

// Function to find weird chars
function checkString(str: string, id: string, context: string) {
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        // Standard ASCII
        if (code < 128) continue;

        // Turkish
        if ("ğüşıöçĞÜŞİÖÇ".includes(str[i])) continue;

        // Common punctuation
        if ("’‘“”–—…".includes(str[i])) continue;

        // Html entities often leave these
        if (code === 160) continue; // nbsp

        // If we represent it as hex
        const hex = code.toString(16).toUpperCase().padStart(4, '0');

        // If it is FFFD
        if (code === 0xFFFD) {
            console.log(`[FOUND FFFD] in Question ${id} (${context}): ...${str.substring(Math.max(0, i - 10), Math.min(str.length, i + 10))}...`);
        } else {
            console.log(`[OTHER CHAR] U+${hex} (${str[i]}) in Question ${id} (${context}): ...${str.substring(Math.max(0, i - 10), Math.min(str.length, i + 10))}...`);
        }
    }
}

data.forEach((q: any) => {
    checkString(q.text, q.id, 'text');
    if (q.explanation) checkString(q.explanation, q.id, 'explanation');
    for (const key in q.options) {
        checkString(q.options[key], q.id, `option ${key}`);
    }
});
