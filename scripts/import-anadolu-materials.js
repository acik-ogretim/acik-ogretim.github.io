
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper for ESM directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source: eKampüs material lists saved per course by acik-ogretim-mcp (scripts/fetcher/anadolu_baglantilar.py),
// one folder per site course id, plus the link check (anadolu_erisim_denetle.py). Links the check found gone
// ("kapali") or behind an Anadolu login ("oturum") are left out (Zeki, 27 Nov 2026: erişilemeyenler kaldırılmalı).
const MCP_RAW = process.env.ACIK_OGRETIM_MCP_RAW || path.join(__dirname, '../../acik-ogretim-mcp/data/raw/anadolu-aof');
const OUTPUT_FILE = path.join(__dirname, '../src/data/anadolu-materials.json');
const DROP = new Set(['kapali', 'oturum']);

if (!fs.existsSync(MCP_RAW)) {
    console.error(`❌ Source directory not found at: ${MCP_RAW}`);
    process.exit(1);
}
const erisimPath = path.join(MCP_RAW, 'erisim.json');
const erisim = fs.existsSync(erisimPath) ? JSON.parse(fs.readFileSync(erisimPath, 'utf-8')) : {};

const materialsMap = {}; // courseId -> Material[]
let dropped = 0;
for (const courseId of fs.readdirSync(MCP_RAW).sort()) {
    const file = path.join(MCP_RAW, courseId, 'materyaller.json');
    if (!fs.existsSync(file)) continue;
    const groups = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
        const category = (group.Name || '').trim();
        for (const m of group.Materials || []) {
            const url = (m.Link || '').trim();
            if (!url.startsWith('http')) continue;
            if (DROP.has(erisim[url])) { dropped++; continue; }
            const type = group.Type === 'INTERACTIVE_CONTENT' || m.Type === 'INTERACTIVE_CONTENT'
                || category.includes('Etkileşimli') || url.includes('html_books') ? 'html' : 'external';
            let title = (m.Name || '').trim();
            if (m.ChapterNumber && m.ChapterNumber > 0) {
                title = `Ünite ${m.ChapterNumber} - ${title}`;
            } else {
                const desc = (m.Description || '').replace(/<[^>]*>?/gm, '').trim();
                if (desc && desc !== title) title = title ? `${title} - ${desc}` : desc;
            }
            (materialsMap[courseId] ||= []).push({ id: m.MaterialId, title: title || 'Materyal', url, type, category });
        }
    }
}
console.log(`Dropped ${dropped} unreachable links.`);

// Ensure output directory exists
const outDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(materialsMap, null, 2));
console.log(`✅ Saved materials for ${Object.keys(materialsMap).length} courses to ${OUTPUT_FILE}`);
