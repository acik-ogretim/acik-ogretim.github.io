
import fs from 'fs';
import path from 'path';

const dir = 'data/questions/ataturk-aof';

if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
}

const files = fs.readdirSync(dir);

console.log('Scanning for explanations without HTML tags...\n');

let count = 0;

files.forEach(file => {
    if (!file.endsWith('.json')) return;
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    try {
        const questions = JSON.parse(content);
        if (!Array.isArray(questions)) return;

        questions.forEach(q => {
            if (q.explanation && typeof q.explanation === 'string') {
                // Check if explanation has NO HTML tags
                // We assume HTML tags imply containing '<' and '>'
                if (!q.explanation.includes('<') && !q.explanation.includes('>')) {
                    console.log(`File: ${file}`);
                    console.log(`ID: ${q.id}`);
                    console.log(`Explanation: ${q.explanation}`);
                    console.log('---');
                    count++;
                }
            }
        });
    } catch(e) {
        console.error(`Error parsing ${file}: ${e.message}`);
    }
});

console.log(`\nFound ${count} explanations without HTML tags.`);
