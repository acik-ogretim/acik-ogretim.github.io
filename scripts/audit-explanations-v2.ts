import fs from "fs";
import path from "path";

const QUESTIONS_DIR = "data/questions/ataturk-aof";

function audit(file: string) {
    const filePath = path.join(QUESTIONS_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);

    data.forEach((q: any, index: number) => {
        const exp = q.explanation || "";

        // 1. Check for # (headers)
        if (exp.includes("#")) {
            console.log(`[HEADER?] ${file} (Soru ${index + 1}): ${exp}`);
        }

        // 2. Check for - (lists at start or after period)
        if (/- /.test(exp)) {
            console.log(`[LIST?] ${file} (Soru ${index + 1}): ${exp}`);
        }

        // 3. Check for leftover backticks
        if (exp.includes("`")) {
            console.log(`[BACKTICK] ${file} (Soru ${index + 1}): ${exp}`);
        }

        // 4. Check for double encoding
        if (exp.includes("&amp;")) {
            console.log(`[AMP] ${file} (Soru ${index + 1}): ${exp}`);
        }
    });
}

const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith(".json"));
files.forEach(audit);
