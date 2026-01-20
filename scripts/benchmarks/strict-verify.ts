
import fs from 'fs';
import { cleanHtml as cleanHtmlFast } from '../utils/clean-html.ts';
import { cleanHtml } from '../utils/clean-html.ts';

const SAMPLE_FILE = '/Users/wildgenie/Projects/acik-ogretim-mcp/data/raw/anadolu-aof/ileri-programlama-i/alistirma-sorulari.json';

async function verify() {
    console.log('--- Strict Equivalence Check ---');
    const content = fs.readFileSync(SAMPLE_FILE, 'utf-8');
    const questions = JSON.parse(content);

    let matchCount = 0;
    let totalCount = 0;
    const itemsToTest = 100;

    for (const q of questions.slice(0, itemsToTest)) {
        totalCount++;
        const original = cleanHtml(q.Text, { isTechnical: true });
        const fast = cleanHtmlFast(q.Text, { isTechnical: true });

        if (original === fast) {
            matchCount++;
        } else {
            console.log(`\nDiff found in item ${totalCount}:`);
            console.log(`ORIG: ${JSON.stringify(original)}`);
            console.log(`FAST: ${JSON.stringify(fast)}`);
        }
    }

    console.log(`\nMatch Rate: ${matchCount}/${totalCount} (${(matchCount / totalCount * 100).toFixed(2)}%)`);
}

verify().catch(console.error);
