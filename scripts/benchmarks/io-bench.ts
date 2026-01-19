
import fs from 'fs';
import path from 'path';

// Generate a large dummy JSON file for testing if not exists
const TARGET_FILE = path.join(process.cwd(), 'temp-bench-data.json');
const DATA_SIZE = 10000;

if (!fs.existsSync(TARGET_FILE)) {
    console.log('Generating dummy JSON data...');
    const data = Array.from({ length: DATA_SIZE }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        content: `Some content for item ${i} `.repeat(20),
        meta: {
            a: Math.random(),
            b: `String ${Math.random()}`
        }
    }));
    fs.writeFileSync(TARGET_FILE, JSON.stringify(data, null, 2));
}

console.log(`Starting Benchmark: File I/O (File: ${TARGET_FILE})`);
console.log('--------------------------------------------------');

const READ_ITERATIONS = 50;

// Test 1: Synchronous Read
const startSync = performance.now();
for (let i = 0; i < READ_ITERATIONS; i++) {
    const raw = fs.readFileSync(TARGET_FILE, 'utf-8');
    const json = JSON.parse(raw);
}
const endSync = performance.now();
console.log(`Synchronous Read + Parse: ${(endSync - startSync).toFixed(2)}ms`);


// Test 2: Asynchronous Read
const startAsync = performance.now();
const asyncPromises = [];
for (let i = 0; i < READ_ITERATIONS; i++) {
    asyncPromises.push(fs.promises.readFile(TARGET_FILE, 'utf-8').then(raw => JSON.parse(raw)));
}
await Promise.all(asyncPromises);
const endAsync = performance.now();
console.log(`Asynchronous Read + Parse:  ${(endAsync - startAsync).toFixed(2)}ms`);

console.log('\nNote: Async usually shines when interleaved with other tasks, not necessarily in a tight loop of ONE file.');

// Cleanup
if (fs.existsSync(TARGET_FILE)) {
    fs.unlinkSync(TARGET_FILE);
}
