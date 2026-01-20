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

interface DiffResult {
    course: string;
    questionIndex: number;
    field: string;
    original: string;
    fast: string;
}

async function testCourse(course: string): Promise<{ passed: number; failed: number; diffs: DiffResult[] }> {
    const filePath = path.join(BASE_PATH, course, 'alistirma-sorulari.json');

    if (!fs.existsSync(filePath)) {
        console.log(`  [SKIP] ${course} - file not found`);
        return { passed: 0, failed: 0, diffs: [] };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    const questions = Array.isArray(data) ? data : (data.questions || data.data || []);

    let passed = 0;
    let failed = 0;
    const diffs: DiffResult[] = [];

    for (const [i, q] of questions.entries()) {
        const fields = ['Text', 'AnswerExplanation', 'A', 'B', 'C', 'D', 'E'];

        for (const field of fields) {
            const raw = q[field] || "";
            if (!raw) continue;

            const opts = { isExplanation: field === 'AnswerExplanation', isTechnical: true };
            const original = cleanHtmlOriginal(raw, opts);
            const fast = cleanHtmlFast(raw, opts);

            if (original === fast) {
                passed++;
            } else {
                failed++;
                if (diffs.length < 3) { // Limit diffs per course
                    diffs.push({ course, questionIndex: i, field, original, fast });
                }
            }
        }
    }

    return { passed, failed, diffs };
}

async function runAllTests() {
    console.log('Testing all unstaged anadolu-aof courses...\n');

    let totalPassed = 0;
    let totalFailed = 0;
    const allDiffs: DiffResult[] = [];

    for (const course of COURSES) {
        process.stdout.write(`Testing ${course}... `);
        const result = await testCourse(course);
        totalPassed += result.passed;
        totalFailed += result.failed;
        allDiffs.push(...result.diffs);

        if (result.failed === 0) {
            console.log(`✅ ${result.passed} fields OK`);
        } else {
            console.log(`⚠️ ${result.passed} OK, ${result.failed} diffs`);
        }
    }

    console.log('\n========================================');
    console.log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed`);
    console.log(`Match Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(2)}%`);
    console.log('========================================\n');

    if (allDiffs.length > 0) {
        console.log('Sample diffs (max 5):');
        for (const diff of allDiffs.slice(0, 5)) {
            console.log(`\n[${diff.course}] Q${diff.questionIndex} ${diff.field}:`);
            console.log('Original:', diff.original.slice(0, 150) + '...');
            console.log('Fast:', diff.fast.slice(0, 150) + '...');
        }
    }
}

runAllTests();
