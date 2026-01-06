import fs from "fs";

import path from "path";

const HTML_FILE = path.join(process.cwd(), "../ataaof-denemeler/data/curriculum_input.html");
const OUTPUT_FILE = path.join(process.cwd(), "data/courses/ataturk-aof/cocuk-gelisimi-lisans.json");

function slugify(text: string): string {
    return text.toString().toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

function parseHtml() {
    const html = fs.readFileSync(HTML_FILE, "utf-8");
    const courses: any[] = [];

    // Split by terms
    const termParts = html.split(/<h4>\s*<strong>\s*(\d+)\s*\.\s*Sınıf\s*-\s*(Güz|Bahar)\s*<\/strong>\s*<\/h4>/i);

    // Split gives [pre, num1, type1, content1, num2, type2, content2, ...]
    for (let i = 1; i < termParts.length; i += 3) {
        const year = parseInt(termParts[i]);
        const type = termParts[i + 1];
        const content = termParts[i + 2];

        const semester = (year - 1) * 2 + (type.toLowerCase() === 'güz' ? 1 : 2);

        // Find rows in table
        const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
        let rowMatch;
        while ((rowMatch = rowRegex.exec(content)) !== null) {
            const rowHtml = rowMatch[1];
            if (rowHtml.includes('<th>') || !rowHtml.includes('href=')) continue;

            // Extract Code: <td class="col-md-1 hidden-sm hidden-xs">ACCG1001</td>
            const codeMatch = rowHtml.match(/<td[^>]*hidden-xs[^>]*>\s*(.*?)\s*<\/td>/i);
            const code = codeMatch ? codeMatch[1].trim() : "";

            // Extract Name and Automation ID: <td class="col-md-7"><a href="/home/izlence/?id=839754&amp;bid=10669&amp;birim=..."> ANATOMİ </a></td>
            const nameMatch = rowHtml.match(/<td[^>]*class="col-md-7"[^>]*>\s*<a[^>]*href=".*?id=(\d+).*?">(.*?)<\/a>/s);
            if (!nameMatch) continue;

            const automationId = nameMatch[1].trim();
            const rawName = nameMatch[2].replace(/&nbsp;/g, ' ').trim();

            // Title Case mapping
            const cleanName = rawName.split(' ').map(word => {
                if (!word) return "";
                const lower = word.toLowerCase().replace(/i/g, 'i').replace(/ı/g, 'ı').replace(/ü/g, 'ü').replace(/ö/g, 'ö').replace(/ç/g, 'ç').replace(/ş/g, 'ş').replace(/ğ/g, 'ğ');
                // Very basic title case
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }).join(' ');

            courses.push({
                id: slugify(rawName),
                code: code,
                name: rawName, // Keep original uppercase or fix later? Portal uses Title Case usually but let's see.
                semester: semester,
                universityId: "ataturk-aof",
                departmentId: "cocuk-gelisimi-lisans",
                automationId: automationId
            });
        }
    }

    // Let's refine the names to be Title Case as in other files
    courses.forEach(c => {
        c.name = fixTitleCase(c.name);
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(courses, null, 2));
    console.log(`✅ Extracted ${courses.length} courses to ${OUTPUT_FILE}`);
}

function fixTitleCase(text: string): string {
    const minorWords = ['ve', 'ile', 'veya', 'de', 'da', 'için', 'i', 'ii', 'iii', 'iv', 'v', 'vi'];
    return text.toLowerCase().split(' ').map((word, index) => {
        if (minorWords.includes(word) && index !== 0) {
            if (['i', 'ii', 'iii', 'iv', 'v', 'vi'].includes(word)) return word.toUpperCase();
            return word;
        }
        // Handle Turkish characters for capitalization
        if (word.startsWith('i')) return 'İ' + word.slice(1);
        if (word.startsWith('ı')) return 'I' + word.slice(1);
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

parseHtml();
