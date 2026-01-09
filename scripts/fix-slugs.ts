
import fs from 'node:fs/promises';
import path from 'node:path';

const COURSES_DIR = path.resolve(process.cwd(), 'data/courses/anadolu-aof');

function slugify(text: string): string {
    // Preserve digits in parens (e.g. Dates), remove otherwise (e.g. Lang)
    const cleanText = text.replace(/\s*\([^0-9]*?\)\s*/g, '');

    return cleanText
        .toString()
        .toLowerCase()
        .trim()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

async function main() {
    const files = await fs.readdir(COURSES_DIR);

    for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(COURSES_DIR, file);
        const courses = JSON.parse(await fs.readFile(filePath, 'utf-8'));
        let modified = false;

        courses.forEach((course: any) => {
            const newId = slugify(course.name);
            if (course.id !== newId) {
                console.log(`${file}: ${course.id} -> ${newId} (${course.name})`);
                course.id = newId;
                modified = true;
            }
        });

        if (modified) {
            await fs.writeFile(filePath, JSON.stringify(courses, null, 4));
            console.log(`Updated ${file}`);
        }
    }
}

main();
