import fs from "fs";
import path from "path";

const UNIVERSITIES_FILE = "data/universities.json";
const COURSES_DIR = "data/courses/ataturk-aof";

function slugify(text: string) {
    const trMap: { [key: string]: string } = {
        'ç': 'c', 'ğ': 'g', 'ş': 's', 'ü': 'u', 'ö': 'o', 'ı': 'i',
        'Ç': 'C', 'Ğ': 'G', 'Ş': 'S', 'Ü': 'U', 'Ö': 'O', 'İ': 'I'
    };
    let cleanText = text;
    for (const key in trMap) {
        cleanText = cleanText.split(key).join(trMap[key]);
    }
    return cleanText
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
}

function start() {
    console.log("🚀 Starting sync-crawled-files...");
    if (!fs.existsSync(UNIVERSITIES_FILE)) {
        console.error(`❌ ${UNIVERSITIES_FILE} not found`);
        return;
    }

    interface DeptLite { id: string; name: string; degree: string }
    interface UniLite { id: string; departments: DeptLite[] }
    const unis: UniLite[] = JSON.parse(fs.readFileSync(UNIVERSITIES_FILE, "utf-8"));
    const ata = unis.find((u: UniLite) => u.id === "ataturk-aof");
    if (!ata) {
        console.error("❌ University 'ataturk-aof' not found in universities.json");
        return;
    }

    if (!fs.existsSync(COURSES_DIR)) {
        console.error(`❌ ${COURSES_DIR} not found`);
        return;
    }

    const files = fs.readdirSync(COURSES_DIR);
    console.log(`📂 Found ${files.length} files in ${COURSES_DIR}`);

    let matchCount = 0;
    let renameCount = 0;

    for (const dept of ata.departments as DeptLite[]) {
        const potentialNames = [];

        let baseSlug = slugify(dept.name.split(" (")[0]);
        let degreeSuffix = "";
        if (dept.degree === "onlisans") degreeSuffix = "-onlisans";
        else if (dept.degree === "lisans") degreeSuffix = "-lisans";
        else if (dept.degree === "lisans-tamamlama") degreeSuffix = "-lisans-tamamlama";

        potentialNames.push(baseSlug + degreeSuffix);
        potentialNames.push(baseSlug);
        potentialNames.push(slugify(dept.name));

        let foundFile = null;
        for (const name of potentialNames) {
            const fileName = `${name}.json`;
            if (files.includes(fileName)) {
                foundFile = fileName;
                break;
            }
        }

        if (foundFile) {
            matchCount++;
            const oldPath = path.join(COURSES_DIR, foundFile);
            const newPath = path.join(COURSES_DIR, `${dept.id}.json`);
            if (oldPath !== newPath) {
                console.log(`🔄 Matching ${dept.name}: Renaming ${foundFile} -> ${dept.id}.json`);
                fs.renameSync(oldPath, newPath);
                renameCount++;
            }
        } else {
            console.log(`⚠️ No match for: ${dept.name} (${dept.id}) [Degree: ${dept.degree}]`);
        }
    }
    console.log(`\n✨ Sync complete! Matches: ${matchCount}, Renamed: ${renameCount}`);
}

start();
