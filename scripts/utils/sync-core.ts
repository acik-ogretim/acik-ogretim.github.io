
import fs from 'fs';
import path from 'path';

export interface AppQuestion {
    id: string;
    unitNumber: number;
    text: string;
    options: { [key: string]: string };
    correctAnswer: string;
    explanation?: string;
}

export function slugify(text: string): string {
    const trMap: { [key: string]: string } = {
        'ç': 'c', 'Ç': 'c',
        'ğ': 'g', 'Ğ': 'g',
        'ş': 's', 'Ş': 's',
        'ü': 'u', 'Ü': 'u',
        'ö': 'o', 'Ö': 'o',
        'ı': 'i', 'İ': 'i',
        'â': 'a', 'î': 'i', 'û': 'u'
    };
    return text
        .split('')
        .map(c => trMap[c] || c)
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function ensureDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
        console.log(`Creating directory: ${dirPath}`);
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

export function saveQuestions(slug: string, questions: AppQuestion[], targetDir: string, extraLog?: string) {
    if (questions.length === 0) return;
    ensureDir(targetDir);
    const dest = path.join(targetDir, `${slug}.json`);
    fs.writeFileSync(dest, JSON.stringify(questions, null, 2));
    console.log(`✅ Synced ${slug} (${questions.length} questions)${extraLog ? ' ' + extraLog : ''}`);
}

export function normalizeTextForMap(t: string): string {
    return t.trim().toLowerCase().replace(/\s+/g, ' ');
}
