
import * as cheerio from 'cheerio';
import fs from 'node:fs/promises';
import path from 'node:path';

const ANADOLU_BASE_URL = 'https://abp.anadolu.edu.tr';
const DEPARTMENTS_URL = 'https://abp.anadolu.edu.tr/tr/akademik/acikogretim';
const DATA_DIR = path.resolve(process.cwd(), 'data');
const COURSES_DIR = path.join(DATA_DIR, 'courses', 'anadolu-aof');

// Helper to slugify names
function slugify(text: string): string {
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
        .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes
}

async function fetchHtml(url: string) {
    console.log(`Fetching: ${url}`);
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    return await res.text();
}

async function main() {
    // Ensure directories exist
    await fs.mkdir(COURSES_DIR, { recursive: true });

    // 1. Fetch Departments List
    console.log('Fetching departments list...');
    const html = await fetchHtml(DEPARTMENTS_URL);
    const $ = cheerio.load(html);

    const departments: any[] = [];

    // Select all program links
    $('.altProgram a').each((_, el) => {
        const link = $(el).attr('href');
        const text = $(el).text().trim();

        if (link && text) {
            const parts = link.split('/');
            const codeIndex = parts.indexOf('programProfili') + 1;
            const code = parts[codeIndex];

            if (code) {
                const parentUl = $(el).closest('ul');
                const header = $(el).parent().prevAll('.list-title.program').first();
                const headerText = header.text().trim().toLowerCase();

                const degree = headerText.includes('önlisans') ? 'onlisans' : 'lisans';

                const name = text.replace(/^\s*-\s*/, '').trim();
                let slug = slugify(name);

                if (code === '2088') {
                    slug = 'gorsel-iletisim';
                }

                departments.push({
                    id: slug,
                    name: name,
                    shortName: name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 4),
                    code: code,
                    degree: degree,
                    duration: degree === 'lisans' ? 8 : 4,
                    active: true
                });
            }
        }
    });

    console.log(`Found ${departments.length} departments.`);

    // 2. Update universities.json
    const uniFilePath = path.join(DATA_DIR, 'universities.json');
    const universities = JSON.parse(await fs.readFile(uniFilePath, 'utf-8'));
    const anadoluIndex = universities.findIndex((u: any) => u.id === 'anadolu-aof');

    if (anadoluIndex === -1) {
        console.error('Anadolu University not found in universities.json');
        return;
    }

    const existingDepts = universities[anadoluIndex].departments || [];
    const mergedDepts = [...existingDepts];

    for (const newDept of departments) {
        const existing = mergedDepts.find(d => d.id === newDept.id);
        if (!existing) {
            mergedDepts.push(newDept);
        } else {
            if (!existing.code) existing.code = newDept.code;
        }
    }

    mergedDepts.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    universities[anadoluIndex].departments = mergedDepts;
    await fs.writeFile(uniFilePath, JSON.stringify(universities, null, 4));
    console.log('Updated universities.json');

    // 3. Fetch Courses for each department
    console.log('Fetching courses...');

    for (const dept of departments) {
        const courseUrl = `https://abp.anadolu.edu.tr/tr/program/dersler/${dept.code}/13`;
        const courses: any[] = [];

        try {
            console.log(`Fetching courses for ${dept.name} (${dept.code})...`);
            await new Promise(r => setTimeout(r, 500));

            const html = await fetchHtml(courseUrl);
            const $c = cheerio.load(html);

            $c('.yariyil-ad').each((_, header) => {
                const semesterText = $c(header).text().trim();
                const roman = semesterText.split('.')[0].trim();
                const semesterMap: Record<string, number> = {
                    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8
                };
                const semester = semesterMap[roman] || 1;

                const table = $c(header).next('table');
                table.find('tr').each((rowIdx, row) => {
                    const cols = $c(row).find('td');
                    if (cols.length > 0) {
                        if ($c(row).text().includes('Toplam')) return;
                        if (cols.length < 4) return;

                        const code = $c(cols[0]).text().trim();
                        if (!code) return;

                        const nameLink = $c(cols[1]).find('a');
                        const name = nameLink.length ? nameLink.text().trim() : $c(cols[1]).text().trim();
                        const cleanName = name.replace(/\s+/g, ' ').trim();

                        if (code && cleanName) {
                            courses.push({
                                id: slugify(cleanName),
                                code: code,
                                name: cleanName,
                                semester: semester,
                                credits: 0,
                                ects: parseFloat($c(cols[4]).text().replace(',', '.') || '0'),
                                universityId: 'anadolu-aof',
                                departmentId: dept.id,
                                automationId: code
                            });
                        }
                    }
                });
            });

            // Parse "Yabancı Dil Dersleri" specifically
            $c('h2').each((_, header) => {
                if ($c(header).text().includes('Yabancı Dil Dersleri')) {
                    const table = $c(header).next('table');
                    table.find('tr').each((_, row) => {
                        const cols = $c(row).find('td');
                        if (cols.length >= 4) {
                            const code = $c(cols[0]).text().trim();
                            const link = $c(cols[1]).find('a');
                            const name = link.length ? link.text().trim() : $c(cols[1]).text().trim();

                            let semester = 1;
                            if (code.includes('101')) semester = 1;
                            if (code.includes('102')) semester = 2;

                            let automationId = code;
                            const href = link.attr('href');
                            if (href) {
                                const match = href.match(/\/ders\/tanitim\/(\d+)/);
                                if (match) automationId = match[1];
                            }

                            if (code && name) {
                                courses.push({
                                    id: slugify(name),
                                    code: code,
                                    name: name,
                                    semester: semester,
                                    credits: 0,
                                    ects: parseFloat($c(cols[4]).text().replace(',', '.') || '0'),
                                    universityId: 'anadolu-aof',
                                    departmentId: dept.id,
                                    automationId: automationId
                                });
                            }
                        }
                    });
                }
            });

            if (courses.length > 0) {
                const filename = path.join(COURSES_DIR, `${dept.id}.json`);
                await fs.writeFile(filename, JSON.stringify(courses, null, 4));
                console.log(`Saved ${courses.length} courses to ${filename}`);
            } else {
                console.warn(`No courses found for ${dept.name}`);
            }

        } catch (err: any) {
            console.error(`Error fetching courses for ${dept.name}:`, err.message);
        }
    }
}

main().catch(console.error);
