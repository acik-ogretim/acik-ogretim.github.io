
import fs from 'node:fs/promises';
import path from 'node:path';

const COURSES_DIR = path.resolve(process.cwd(), 'data/courses/anadolu-aof');

async function main() {
    const files = await fs.readdir(COURSES_DIR);
    let totalRemoved = 0;

    for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(COURSES_DIR, file);
        const courses = JSON.parse(await fs.readFile(filePath, 'utf-8'));

        // Remove duplicate Codes first
        // Create a map by code. If collision, prefer one (e.g. keep first)
        const uniqueCourses: any[] = [];
        const seenCodes = new Set<string>();

        for (const course of courses) {
            if (seenCodes.has(course.code)) {
                console.log(`[${file}] Removing duplicate code: ${course.code} (${course.name})`);
                totalRemoved++;
            } else {
                seenCodes.add(course.code);
                uniqueCourses.push(course);
            }
        }

        // Now check for ID collisions among remaining unique codes
        // If IDs collide but codes differ, append index
        const idMap = new Map<string, number>();
        // First pass counting
        for (const c of uniqueCourses) {
            idMap.set(c.id, (idMap.get(c.id) || 0) + 1);
        }

        // Fix IDs if count > 1
        const processedIds = new Map<string, number>();
        let modifiedIds = 0;

        for (const c of uniqueCourses) {
            if (idMap.get(c.id)! > 1) {
                // Collision exists
                let count = processedIds.get(c.id) || 0;
                count++;
                processedIds.set(c.id, count);

                if (count > 1) {
                    // Rename secondary occurrences
                    const newId = `${c.id}-${count}`;
                    console.log(`[${file}] Renaming duplicate ID: ${c.id} -> ${newId}`);
                    c.id = newId;
                    modifiedIds++;
                }
            }
        }

        if (totalRemoved > 0 || modifiedIds > 0) {
            await fs.writeFile(filePath, JSON.stringify(uniqueCourses, null, 4));
        }
    }

    console.log(`Cleanup complete. Removed ${totalRemoved} duplicate codes.`);
}

main();
