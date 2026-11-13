
import fs from 'fs';
import path from 'path';

const QUESTIONS_DIR = 'data/questions/anadolu-aof';
const OUTPUT_DIR = 'agent_texts';

// Course mapping
const COURSES = {
    'GİT102U': { file: 'anadolu-kultur-tarihi.json', name: 'ANADOLU KÜLTÜR TARİHİ' },
    'GİT104U': { file: 'gorsel-iletisim-ve-tasarim-tarihi.json', name: 'GÖRSEL İLETİŞİM VE TASARIM TARİHİ' },
    'GİT204U': { file: 'grafik-uretim-ve-dijital-cogaltim-teknikleri.json', name: 'GRAFİK ÜRETİM VE DİJİTAL ÇOĞALTIM TEKNİKLERİ' },
    'SNT402U': { file: 'sanat-tarihi.json', name: 'SANAT TARİHİ' },
    'GİT202U': { file: 'ileri-tipografi.json', name: 'İLERİ TİPOGRAFİ' },
    'GİT206U': { file: 'dijital-goruntuleme-isleme-yontemleri.json', name: 'DİJİTAL GÖRÜNTÜLEME İŞLEME YÖNTEMLERİ' },
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

interface Question {
    unitNumber: number;
    text: string;
    options: Record<string, string>;
    correctAnswer: string;
    explanation?: string;
}

if (fs.existsSync(OUTPUT_DIR)) {
    // Clean up old files
    fs.readdirSync(OUTPUT_DIR).forEach(file => {
        fs.unlinkSync(path.join(OUTPUT_DIR, file));
    });
} else {
    fs.mkdirSync(OUTPUT_DIR);
}

Object.entries(COURSES).forEach(([code, course]) => {
    const filePath = path.join(QUESTIONS_DIR, course.file);
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const questions: Question[] = JSON.parse(content);

    // Group by unit
    const unitsMap = new Map<number, Question[]>();
    questions.forEach(q => {
        const list = unitsMap.get(q.unitNumber) || [];
        list.push(q);
        unitsMap.set(q.unitNumber, list);
    });

    const sortedUnits = Array.from(unitsMap.keys()).sort((a, b) => a - b);

    sortedUnits.forEach((unitNumber) => {
        const qs = unitsMap.get(unitNumber)!;
        qs.sort((a, b) => (a as any).id?.localeCompare((b as any).id) || 0); // fallback if needed

        let output = `${course.name} dersi ünite ${unitNumber} soru sırasıyla soru atlamadan, soru özeti (anlaşır şekilde özetle, soru akılda kalabilmeli, sorunun anahtar kelimeleri önemli, Roma rakamı kullanma düz rakam kullan) doğru cevap ve açıklama çok detaya girme, çok hızlı konuşarak (tools kullanarak konuşma tarzını çok hızlı konuşarak bu şekilde ayarla). gibi olsun\n\n`;

        output += `Unite ${unitNumber}\n`;
        let qCount = 0;

        qs.forEach((q) => {
            qCount++;
            output += `Soru ${qCount} - ${cleanHtml(q.text)}\n`;

            ['A', 'B', 'C', 'D', 'E'].forEach(key => {
                const optText = q.options[key];
                if (optText) {
                    output += `${key} - ${cleanHtml(optText)}\n`;
                }
            });

            output += `Doğru Cevap ${q.correctAnswer}\n`;

            let expl = cleanHtml(q.explanation || '');
            if (expl.length > 500) {
                expl = expl.substring(0, 500) + '...';
            }
            output += `Aciklama ${expl}\n\n`;
        });

        const safeCourseName = course.name.replace(/[^a-zA-Z0-9ÜĞİŞÇÖüğişçö]/g, '_').replace(/_+/g, '_');
        const outFileName = `${code}_${safeCourseName}_Unite_${unitNumber}.txt`;
        fs.writeFileSync(path.join(OUTPUT_DIR, outFileName), output);
        console.log(`Generated ${outFileName}`);
    });
});
