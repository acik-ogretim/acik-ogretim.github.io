import fs from 'fs';
import path from 'path';
import { cleanHtml as cleanHtmlFast } from '../utils/clean-html.ts';
import { cleanHtml as cleanHtmlOriginal } from '../utils/clean-html.ts';

// All unstaged anadolu-aof courses
const COURSES = [
    'bilgisayar-ve-programlamaya-giris',
    'ileri-programlama-i',
    'internet-tabanli-programlama',
    'internet-ve-web-programlama',
    'programlama-ii',
    'programlamada-yeni-egilimler',
    'web-arayuz-programlama',
    'web-okuryazarligi',
    'web-tabanli-kodlama'
];

const BASE_PATH = path.resolve('../acik-ogretim-mcp/data/raw/anadolu-aof');

async function analyzeDiffs() {
    console.log('Analyzing all differences...\n');

    let diffNum = 0;

    for (const course of COURSES) {
        const filePath = path.join(BASE_PATH, course, 'alistirma-sorulari.json');

        if (!fs.existsSync(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        const questions = Array.isArray(data) ? data : (data.questions || data.data || []);

        for (const [i, q] of questions.entries()) {
            const fields = ['Text', 'AnswerExplanation', 'A', 'B', 'C', 'D', 'E'];

            for (const field of fields) {
                const raw = q[field] || "";
                if (!raw) continue;

                const opts = { isExplanation: field === 'AnswerExplanation', isTechnical: true };
                const original = cleanHtmlOriginal(raw, opts);
                const fast = cleanHtmlFast(raw, opts);

                if (original !== fast) {
                    diffNum++;
                    console.log(`\n${'='.repeat(80)}`);
                    console.log(`DIFF #${diffNum}: ${course} | Q${i} | ${field}`);
                    console.log('='.repeat(80));

                    console.log('\n📥 RAW INPUT:');
                    console.log(raw.slice(0, 500) + (raw.length > 500 ? '...' : ''));

                    console.log('\n🔵 ORIGINAL OUTPUT:');
                    console.log(original);

                    console.log('\n🟢 FAST OUTPUT:');
                    console.log(fast);

                    // Find the first difference
                    let diffPos = -1;
                    for (let k = 0; k < Math.max(original.length, fast.length); k++) {
                        if (original[k] !== fast[k]) {
                            diffPos = k;
                            break;
                        }
                    }

                    if (diffPos >= 0) {
                        console.log('\n🔍 FIRST DIFFERENCE AT POSITION:', diffPos);
                        const contextStart = Math.max(0, diffPos - 30);
                        const contextEnd = Math.min(Math.max(original.length, fast.length), diffPos + 30);
                        console.log('Original context:', JSON.stringify(original.slice(contextStart, contextEnd)));
                        console.log('Fast context:    ', JSON.stringify(fast.slice(contextStart, contextEnd)));
                        console.log('                  ' + ' '.repeat(diffPos - contextStart) + '^');
                    }

                    // Analysis
                    console.log('\n📊 ANALYSIS:');
                    if (original.length > fast.length) {
                        console.log(`  Fast version is SHORTER by ${original.length - fast.length} chars`);
                    } else if (fast.length > original.length) {
                        console.log(`  Fast version is LONGER by ${fast.length - original.length} chars`);
                    }

                    // Check for common patterns
                    if (original.includes('<br/>') && !fast.includes('<br/>')) {
                        console.log('  ⚠️ Fast version REMOVED some <br/> tags');
                    }
                    if (!original.includes('<br/>') && fast.includes('<br/>')) {
                        console.log('  ⚠️ Fast version ADDED some <br/> tags');
                    }
                    if (original.includes('&lt;') && !fast.includes('&lt;')) {
                        console.log('  ⚠️ Fast version may have decoded encoded tags');
                    }
                }
            }
        }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`TOTAL: ${diffNum} differences found`);
}

analyzeDiffs();
