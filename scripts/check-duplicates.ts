
import fs from 'node:fs/promises';
import path from 'node:path';

const COURSES_DIR = path.resolve(process.cwd(), 'data/courses/anadolu-aof');

async function main() {
    try {
        const files = await fs.readdir(COURSES_DIR);
        let totalIssues = 0;

        for (const file of files) {
            if (!file.endsWith('.json')) continue;

            const filePath = path.join(COURSES_DIR, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const courses = JSON.parse(content);

            const idCounts: Record<string, number> = {};
            const codeCounts: Record<string, number> = {};
            const duplicates: string[] = [];

            courses.forEach((c: any) => {
                // Count IDs
                idCounts[c.id] = (idCounts[c.id] || 0) + 1;
                // Count Codes
                codeCounts[c.code] = (codeCounts[c.code] || 0) + 1;
            });

            // Check IDs
            Object.entries(idCounts).forEach(([id, count]) => {
                if (count > 1) {
                    duplicates.push(`Duplicate ID: '${id}' (x${count})`);
                }
            });

            // Check Codes
            Object.entries(codeCounts).forEach(([code, count]) => {
                if (count > 1) {
                    duplicates.push(`Duplicate Code: '${code}' (x${count})`);
                }
            });

            if (duplicates.length > 0) {
                console.log(`\n❌ Issues in ${file}:`);
                duplicates.forEach(d => console.log(`   - ${d}`));
                totalIssues += duplicates.length;
            }
        }

        if (totalIssues === 0) {
            console.log('\n✅ No duplicates found! All IDs and Codes are unique within their departments.');
        } else {
            console.log(`\nFound ${totalIssues} duplicates in total.`);
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

main();
