
import fs from 'fs';
import path from 'path';
import { ensureDir, slugify } from './utils/sync-core.js';

const PORTAL_ROOT = process.cwd();
const DENEMELER_ROOT = path.resolve(PORTAL_ROOT, '../ataaof-denemeler');
const MCP_ROOT = path.resolve(PORTAL_ROOT, '../acik-ogretim-mcp');
const MCP_RAW_root = path.join(MCP_ROOT, 'data/raw');

const MAPPINGS = [
    { source: 'Anadolu/json', target: 'anadolu-aof' },
    { source: 'Auzef/json', target: 'auzef' },
    { source: 'ATA-AÖF/json', target: 'ataturk-aof' }
];

function copyFiles() {
    if (!fs.existsSync(MCP_RAW_root)) {
        console.error(`MCP Raw root not found: ${MCP_RAW_root}`);
        return;
    }

    MAPPINGS.forEach(mapping => {
        const sourceDir = path.join(DENEMELER_ROOT, 'output', mapping.source);
        const targetUniDir = path.join(MCP_RAW_root, mapping.target);

        if (!fs.existsSync(sourceDir)) {
            console.warn(`Source not found: ${sourceDir}`);
            return;
        }

        console.log(`Processing ${mapping.source} -> ${mapping.target}...`);

        // Walk through Semester dirs (Donem 1, etc.)
        const terms = fs.readdirSync(sourceDir);
        terms.forEach(term => {
            if (term === '.DS_Store') return;
            const termPath = path.join(sourceDir, term);
            try {
                if (!fs.statSync(termPath).isDirectory()) return;
            } catch { return; }

            const files = fs.readdirSync(termPath);
            files.forEach(f => {
                if (!f.endsWith('.json')) return;

                // Parse filename
                // Anadolu - Dönem X - Course - Type ...
                // Auzef - Dönem X - Course - Type ...
                // ATA-AÖF - Dönem X - Course - Type ...

                const parts = f.replace('.json', '').split(' - ');
                if (parts.length < 3) return;

                const courseName = parts[2];
                const slug = slugify(courseName);

                const targetCourseDir = path.join(targetUniDir, slug);
                ensureDir(targetCourseDir);

                const srcFile = path.join(termPath, f);
                const destFile = path.join(targetCourseDir, f);

                fs.copyFileSync(srcFile, destFile);
            });
        });
    });

    console.log("Copy Raw to MCP Complete.");
}

copyFiles();
