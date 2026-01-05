import fs from "fs";
import path from "path";

const BASE_URL = "https://obs.atauni.edu.tr/moduller/islem/eobs";
const DEPT_LIST_URL = `${BASE_URL}/getirBirimlerByBtId/2/3993`;
const CURRICULUM_URL = `${BASE_URL}/getirProgramMufredat`;

const OUTPUT_DIR = "data/courses/ataturk-aof";
const AY_ID = "151";

async function fetchJSON(url: string, options: any = {}) {
    console.log(`Fetching: ${url}`);
    const res = await fetch(url, {
        headers: {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
            ...options.headers
        },
        ...options
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
}

async function fetchCurriculum(programId: string) {
    console.log(`Fetching curriculum for program: ${programId}`);
    const res = await fetch(CURRICULUM_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
        },
        body: `ay_id=${AY_ID}&program_id=${programId}`
    });
    if (!res.ok) return null;
    return res.json();
}

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

async function start() {
    try {
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        const depts = await fetchJSON(DEPT_LIST_URL);
        console.log(`Found ${depts.length} units.`);

        for (const dept of depts) {
            const unitId = dept.id.split("/")[1];
            console.log(`Processing unit: ${dept.label} (${unitId})`);

            // Fetch programs under this unit
            const programs = await fetchJSON(`${BASE_URL}/getirBirimlerByBtId/2/3993/${unitId}`);

            for (const program of programs) {
                const programId = program.id;
                const programName = program.label;
                console.log(`  - Program: ${programName} (${programId})`);

                const curriculum = await fetchCurriculum(programId);
                if (curriculum && Array.isArray(curriculum)) {
                    // Filter out non-course rows (like Totals)
                    const cleanCurriculum = curriculum.filter(c => c.DersID && c.DersKodu);

                    if (cleanCurriculum.length > 0) {
                        // Extract base name and degree from label like "Çocuk Gelişimi Lisans Programı (4008)"
                        let baseName = programName.split(" (")[0];
                        let degreeSuffix = "";

                        if (baseName.toLowerCase().includes("lisans tamamlama")) {
                            degreeSuffix = "-lisans-tamamlama";
                            baseName = baseName.replace(/lisans tamamlama/i, "").trim();
                        } else if (baseName.toLowerCase().includes("lisans")) {
                            degreeSuffix = "-lisans";
                            baseName = baseName.replace(/lisans/i, "").trim();
                        } else if (baseName.toLowerCase().includes("önlisans") || baseName.toLowerCase().includes("onlisans")) {
                            degreeSuffix = "-onlisans";
                            baseName = baseName.replace(/önlisans|onlisans/i, "").trim();
                        }

                        // Remove "Programı" suffix if exists
                        baseName = baseName.replace(/Programı$/i, "").trim();

                        const slug = slugify(baseName) + degreeSuffix;
                        const filename = `${slug}.json`;
                        const filePath = path.join(OUTPUT_DIR, filename);

                        // Map to our standard format
                        const mappedData = cleanCurriculum.map(c => ({
                            id: slugify(c.DersAdi.split(" (")[0]),
                            code: c.DersKodu,
                            name: c.DersAdi.split(" (")[0].trim(),
                            semester: parseInt(c.Donem),
                            universityId: "ataturk-aof",
                            departmentId: slug,
                            automationId: c.DersID,
                            akts: c.AKTS,
                            kredi: c.Kredi,
                            type: c.DersTipi
                        }));

                        fs.writeFileSync(filePath, JSON.stringify(mappedData, null, 2));
                        console.log(`    ✅ Saved ${mappedData.length} courses to ${filePath}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error("Crawl failed:", error);
    }
}

start();
