
import fs from 'fs';
import path from 'path';

const QUESTIONS_DIR = 'data/questions/anadolu-aof';
const OUTPUT_DIR = 'agent_texts';

// Course mapping
const COURSES = {
    'GİT301U': { file: 'gorsel-iletisim-ve-kuramlari.json', name: 'GÖRSEL İLETİŞİM VE KURAMLARI' },
    'GİT303U': { file: 'kurumsal-kimlik-tasarimi.json', name: 'KURUMSAL KİMLİK TASARIMI' },
    'GİT309U': { file: 'ambalaj-tasarimi.json', name: 'AMBALAJ TASARIMI' },
    'GİT311U': { file: 'engellilik-ve-erisilebilir-tasarim.json', name: 'ENGELLİLİK VE ERİŞİLEBİLİR TASARIM' },
    'FOT213U': { file: 'sayisal-goruntuleme-teknolojileri.json', name: 'SAYISAL GÖRÜNTÜLEME TEKNOLOJİLERİ' },
    'GİT203U': { file: 'sanatta-elestirel-dusunce.json', name: 'SANATTA ELEŞTİREL DÜŞÜNCE' },
    'GİT205U': { file: 'gorsel-tasarimda-yaratici-dusunme-teknikleri.json', name: 'GÖRSEL TASARIMDA YARATICI DÜŞÜNME TEKNİKLERİ' },
};

function cleanHtml(text: string): string {
    if (!text) return '';
    // Basic cleaning, the user asked for summary but we can only clean HTML here.
    // The "summary" part is actually instructions for the Agent reading this text.
    // We will provide the full text cleaned of HTML, and the Agent prompts will tell it to summarize.
    let cleaned = text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '') // Strip other tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();

    // Normalize Roman numerals in options/text if possible, though easier to leave for the Agent prompt instructions?
    // User explicitly asked: "Roma rakamı kullanma düz rakam kullan"
    cleaned = cleaned
        .replace(/\bI\b/g, '1')
        .replace(/\bII\b/g, '2')
        .replace(/\bIII\b/g, '3')
        .replace(/\bIV\b/g, '4')
        .replace(/\bV\b/g, '5')
        .replace(/\bVI\b/g, '6');

    return cleaned;
}

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

Object.entries(COURSES).forEach(([code, course]) => {
    const filePath = path.join(QUESTIONS_DIR, course.file);
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const questions = JSON.parse(content);

    // Sort by unit and then by ID (or original order)
    questions.sort((a: any, b: any) => a.unitNumber - b.unitNumber);

    // Split into 4 parts (assuming ~8 units, so 2 units per part)
    // Part 1: Units 1-2
    // Part 2: Units 3-4
    // Part 3: Units 5-6
    // Part 4: Units 7+
    const parts = {
        'Part1': questions.filter((q: any) => q.unitNumber <= 2),
        'Part2': questions.filter((q: any) => q.unitNumber >= 3 && q.unitNumber <= 4),
        'Part3': questions.filter((q: any) => q.unitNumber >= 5 && q.unitNumber <= 6),
        'Part4': questions.filter((q: any) => q.unitNumber >= 7)
    };

    Object.entries(parts).forEach(([partName, qs]) => {
        if (qs.length === 0) return;

        // Determine unit range for the header
        const units = qs.map((q: any) => q.unitNumber);
        const minUnit = Math.min(...units);
        const maxUnit = Math.max(...units);
        const unitRange = `${minUnit}-${maxUnit}`;

        let output = `${course.name} dersi ünite ${unitRange} soru sırasıyla soru atlamadan, soru özeti (anlaşır şekilde özetle, soru akılda kalabilmeli, sorunun anahtar kelimeleri önemli, Roma rakamı kullanma düz rakam kullan) doğru cevap ve açıklama çok detaya girme, çok hızlı konuşarak (tools kullanarak konuşma tarzını çok hızlı konuşarak bu şekilde ayarla). gibi olsun\n\n`;

        let currentUnit = -1;
        let qCount = 0;

        qs.forEach((q: any) => {
            if (q.unitNumber !== currentUnit) {
                currentUnit = q.unitNumber;
                output += `Unite ${currentUnit}\n`;
            }
            qCount++;

            output += `Soru ${qCount} - ${cleanHtml(q.text)}\n`;

            // Options
            ['A', 'B', 'C', 'D', 'E'].forEach(key => {
                const optText = q.options[key];
                if (optText) {
                    output += `${key} - ${cleanHtml(optText)}\n`;
                }
            });

            output += `Doğru Cevap ${q.correctAnswer}\n`;

            // Explanation: Limit length roughly? User said "çok uzunsa belli bir kısımdan sonrasını ... silmelisin"
            // Let's truncate if > 300 chars for safety, or just leave it for the agent?
            // "Agentte kullanmak üzere" suggests this text is FOR the agent.
            // But the agent is the one reading it.
            // I will clean HTML and maybe truncate extremely long ones.
            let expl = cleanHtml(q.explanation || '');
            if (expl.length > 500) {
                expl = expl.substring(0, 500) + '...';
            }
            output += `Aciklama ${expl}\n\n`;
        });

        const outFileName = `${code}_${course.name.replace(/\s+/g, '_')}_${partName}.txt`;
        fs.writeFileSync(path.join(OUTPUT_DIR, outFileName), output);
        console.log(`Generated ${outFileName}`);
    });
});
