
import os from 'os';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

if (isMainThread) {
    // MAIN THREAD LOGIC
    console.log(`Starting Benchmark: Worker Scaling on ${os.cpus().length} core machine`);
    console.log('--------------------------------------------------');

    async function runBenchmark(workerCount: number, label: string) {
        const start = performance.now();
        const workers = [];
        const TOTAL_JOBS = 100; // Simulated heavy jobs

        // Split jobs
        const jobsPerWorker = Math.ceil(TOTAL_JOBS / workerCount);

        for (let i = 0; i < workerCount; i++) {
            // Each worker simulates processing 'jobsPerWorker' heavy items
            const w = new Worker(new URL(import.meta.url), {
                workerData: { jobCount: jobsPerWorker }
            });
            workers.push(new Promise((resolve, reject) => {
                w.on('message', resolve);
                w.on('error', reject);
                w.on('exit', (code) => {
                    if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
                });
            }));
        }

        await Promise.all(workers);
        const end = performance.now();
        console.log(`${label} (${workerCount} workers): ${(end - start).toFixed(2)}ms`);
    }

    (async () => {
        // Run with CPU Count
        await runBenchmark(os.cpus().length, "CPU Count Strategy");

        // Run with Double CPU Count
        await runBenchmark(os.cpus().length * 2, "2x CPU Count Strategy");

    })();

} else {
    // WORKER THREAD LOGIC
    const { jobCount } = workerData;

    // Simulate CPU intensive work
    for (let i = 0; i < jobCount; i++) {
        let count = 0;
        // Heavy math loop
        for (let j = 0; j < 1_000_000; j++) {
            count += Math.sqrt(j) * Math.random();
        }
    }

    parentPort?.postMessage('done');
}
