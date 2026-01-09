
import fs from 'fs';
import path from 'path';

const TARGET_FILE = path.resolve('data/questions/anadolu-aof/sosyal-politika.json');

if (!fs.existsSync(TARGET_FILE)) {
    console.error(`File not found: ${TARGET_FILE}`);
    process.exit(1);
}

console.log(`Reading ${TARGET_FILE}...`);
let content = fs.readFileSync(TARGET_FILE, 'utf-8');

// Count occurrences
const lsCount = (content.match(/\u2028/g) || []).length;
const psCount = (content.match(/\u2029/g) || []).length;

console.log(`Found ${lsCount} Line Separators (LS) and ${psCount} Paragraph Separators (PS).`);

if (lsCount > 0 || psCount > 0) {
    // Replace with standard space (or you could use \n if appropriate, but inside JSON strings space is safer)
    content = content.replace(/[\u2028\u2029]/g, ' ');

    // Validate JSON to ensure we didn't break anything (though replacing with space is safe)
    try {
        JSON.parse(content);
        fs.writeFileSync(TARGET_FILE, content, 'utf-8');
        console.log("✅ File sanitized and saved.");
    } catch (e) {
        console.error("❌ Error: Resulting content is not valid JSON.");
    }
} else {
    console.log("No unusual line terminators found.");
}
