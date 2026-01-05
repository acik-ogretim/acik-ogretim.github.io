import fs from "fs";
import path from "path";

const UNIVERSITIES_FILE = "data/universities.json";
const COURSES_DIR = "data/courses/ataturk-aof";

function start() {
    console.log("🧹 Starting cleanup-ata-courses...");
    if (!fs.existsSync(UNIVERSITIES_FILE)) {
        console.error(`❌ ${UNIVERSITIES_FILE} not found`);
        return;
    }

    const unis = JSON.parse(fs.readFileSync(UNIVERSITIES_FILE, "utf-8"));
    const ata = unis.find(u => u.id === "ataturk-aof");
    const validIds = new Set(ata.departments.map(d => d.id));

    if (!fs.existsSync(COURSES_DIR)) {
        console.error(`❌ ${COURSES_DIR} not found`);
        return;
    }

    const files = fs.readdirSync(COURSES_DIR);
    console.log(`📂 Found ${files.length} files in ${COURSES_DIR}`);

    let deleteCount = 0;

    for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const id = file.replace(".json", "");
        if (!validIds.has(id)) {
            console.log(`🗑️ Deleting invalid/leftover file: ${file}`);
            fs.unlinkSync(path.join(COURSES_DIR, file));
            deleteCount++;
        }
    }
    console.log(`\n✨ Cleanup complete! Deleted: ${deleteCount} files.`);
}

start();
