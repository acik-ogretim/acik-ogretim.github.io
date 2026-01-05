import fs from "fs";
import path from "path";

const QUESTIONS_DIR = "data/questions/ataturk-aof";

function audit(file: string) {
    const filePath = path.join(QUESTIONS_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);

    data.forEach((q: any, index: number) => {
        const exp = q.explanation || "";

        // 1. Check for backticks
        if (exp.includes("`")) {
            console.log(`[BACKTICK] ${file} (Soru ${index + 1}): ${exp}`);
        }

        // 2. Check for markdown bold/italic
        if (/\*\*|__|(?<!<)_(?!>)/.test(exp)) {
            // Avoid matching tag underscores like </u>
            if (!/<\/?[iub]>/i.test(exp)) {
                console.log(`[MARKDOWN] ${file} (Soru ${index + 1}): ${exp}`);
            }
        }

        // 3. Check for markdown links
        if (/\[.*\]\(.*\)/.test(exp)) {
            console.log(`[LINK] ${file} (Soru ${index + 1}): ${exp}`);
        }

        // 4. Check for double encoding
        if (/&amp;[a-z]+;/i.test(exp) || /&lt;[a-z]+&gt;/i.test(exp)) {
            // &lt;tag&gt; is okay if it's inside <code>, but let's check for weird ones
            if (exp.includes("&amp;lt;") || exp.includes("&amp;gt;")) {
                console.log(`[DOUBLE_ENCODE] ${file} (Soru ${index + 1}): ${exp}`);
            }
        }
    });
}

const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith(".json"));
files.forEach(audit);
