
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper for ESM directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Relative path to the sibling project
const SOURCE_DIR = path.join(__dirname, '../../ataaof-denemeler/output/Anadolu/json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/anadolu-materials.json');
const COURSES_DIR = path.join(__dirname, '../data/courses/anadolu-aof');

// Helper to normalize strings
function normalize(str) {
    if (!str) return "";
    return str
        .replace(/İ/g, 'i')
        .replace(/I/g, 'i') // handle raw I
        .toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}



function scanDir(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            scanDir(filePath, fileList);
        } else {
            if (file.endsWith('.json') && file.includes('Materials')) {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}

// 1. Build Name -> ID Map from Portal Data
const courseIdMap = {};
console.log('🔍 Building course ID map from portal data...');

if (fs.existsSync(COURSES_DIR)) {
    const courseFiles = fs.readdirSync(COURSES_DIR).filter(f => f.endsWith('.json'));
    courseFiles.forEach(f => {
        try {
            const content = fs.readFileSync(path.join(COURSES_DIR, f), 'utf-8');
            const courses = JSON.parse(content);
            if (Array.isArray(courses)) {
                courses.forEach(c => {
                    const norm = normalize(c.name);
                    if (norm) {
                        courseIdMap[norm] = c.id;
                    }
                });
            }
        } catch (e) {
            console.warn(`Failed to read course file ${f}: ${e.message}`);
        }
    });
    console.log(`Loaded ${Object.keys(courseIdMap).length} course mappings.`);
} else {
    console.warn(`⚠️ Courses directory not found at ${COURSES_DIR}, keys will be normalized names only.`);
}

console.log('🔍 Scanning material files...');
if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ Source directory not found at: ${SOURCE_DIR}`);
    process.exit(1);
}

const files = scanDir(SOURCE_DIR);
console.log(`found ${files.length} material files.`);

const materialsMap = {}; // courseId -> Material[]

files.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf-8');
        const groups = JSON.parse(content);

        if (!Array.isArray(groups)) {
             return;
        }

        groups.forEach(group => {
            const courseName = group.CourseId || group.Name;
            if (!courseName) return;

            const normKey = normalize(courseName);
            // Use canonical ID if available, otherwise fallback to normalized name
            const courseId = courseIdMap[normKey] || normKey;

            // Filter materials with links
            const validMaterials = (group.Materials || []).filter(m => m.Link && m.Link.startsWith('http')).map(m => {
                let type = 'external';
                // Check for interactive content indicators
                if (group.Type === 'INTERACTIVE_CONTENT' || m.Type === 'INTERACTIVE_CONTENT' ||
                    (group.Name && group.Name.includes('Etkileşimli')) ||
                    (m.Link && m.Link.includes('html_books'))) {
                    type = 'html';
                }

                // Title Generation
                let title = (m.Name || "").trim();
                const chapter = m.ChapterNumber;

                if (chapter && chapter > 0) {
                     title = `Ünite ${chapter} - ${title}`;
                } else {
                    // Fallback to Description if no chapter number
                    let desc = (m.Description || "").replace(/<[^>]*>?/gm, '').trim();
                     if (desc && desc !== title) {
                        title = title ? `${title} - ${desc}` : desc;
                    }
                }

                if (!title) title = "Materyal";

                return {
                    id: m.MaterialId,
                    title: title,
                    url: m.Link,
                    type: type,
                    category: group.Name
                };
            });

            if (validMaterials.length > 0) {
                if (!materialsMap[courseId]) {
                    materialsMap[courseId] = [];
                }
                materialsMap[courseId].push(...validMaterials);
            }
        });

    } catch (e) {
        console.error(`Error reading ${file}:`, e.message);
    }
});

// Ensure output directory exists
const outDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(materialsMap, null, 2));
console.log(`✅ Saved materials for ${Object.keys(materialsMap).length} courses to ${OUTPUT_FILE}`);
