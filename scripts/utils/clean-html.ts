
import * as cheerio from 'cheerio';
import he from 'he';
import TurndownService from 'turndown';

// Interface for configuration if needed later
interface CleanHtmlOptions {
    preserveCode?: boolean;
}

export function cleanHtml(text: string): string {
    if (!text) return "";

    // Decode entities
    let cleaned = he.decode(text);

    // Normalize line endings
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Normalize dashes (En dash, Em dash to hyphen)
    cleaned = cleaned.replace(/[\u2013\u2014]/g, '-');

    // Standardize noisy br tags
    cleaned = cleaned.replace(/<br\b[^>]*>/gi, '<br/>');

    // Pre-process newlines to <br> to preserve them
    cleaned = cleaned.replace(/\n/g, '<br/>');

    // Collapse multiple consecutive line breaks
    cleaned = cleaned.replace(/(<br\/>\s*)+/g, '<br/>');

    // Fix specific encoding artifacts (Anadolu)
    cleaned = cleaned.replace(/\x1e/g, 'i').replace(/\x1f/g, 'i');

    // Replace non-breaking spaces
    cleaned = cleaned.replace(/\xa0/g, ' ');

    // Remove invisible zero-width chars (and Soft Hyphen \u00ad)
    cleaned = cleaned.replace(/[\u00ad\u200b\u200c\u200d\ufeff]/g, '');

    // Replace unusual line separators with space
    cleaned = cleaned.replace(/[\u2028\u2029]/g, ' ');

    // Load into Cheerio
    const $ = cheerio.load(cleaned, { xmlMode: false });

    // 1. Handle o:p
    $('*').each((_, el) => {
        if (el.type === 'tag' && el.name.toLowerCase().startsWith('o:')) {
            $(el).before(' ');
            $(el).replaceWith($(el).contents());
        }
    });

    // Transform OL styles to type attribute (before stripping styles)
    $('ol').each((_, el) => {
        const style = $(el).attr('style');
        if (style && /list-style-type:\s*upper-roman/i.test(style)) {
            $(el).attr('type', 'I');
        }
        if (style && /list-style-type:\s*lower-roman/i.test(style)) {
            $(el).attr('type', 'i');
        }
    });

    // Transform underlined spans to <u>
    $('span').each((_, el) => {
        const style = $(el).attr('style');
        if (style && /text-decoration:\s*underline/i.test(style)) {
            el.tagName = 'u';
        }
    });

    // 2. Unwrap noisy block tags with space
    // FIX: Do NOT unwrap body/html/head as they are structural roots in Cheerio
    const blockTags = ['div', 'article', 'pre'];
    // If input had <html> inside, Cheerio corrects it.
    // We rely on $('body').html() to extract content, which inherently strips wrapper html/body.

    blockTags.forEach(tag => {
        $(tag).each((_, el) => {
            $(el).before(' ');
            $(el).replaceWith($(el).contents());
        });
    });

    // 3. Unwrap noisy inline tags (no space)
    $('font').each((_, el) => {
        $(el).replaceWith($(el).contents());
    });

    // 4. Strip attributes from strict tags
    const strictTags = ['strong', 'b', 'i', 'em', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'tfoot', 'ul', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre', 'sup', 'sub', 'ins'];
    strictTags.forEach(tag => {
        $(tag).each((_, el) => {
            if ('attribs' in el) {
                Object.keys(el.attribs).forEach(attr => $(el).removeAttr(attr));
            }
        });
    });

    // 5. Smart strip for ol, p, u, span, ins
    const allowedAttrs: Record<string, string[]> = {
        'ol': ['type', 'start'],
        'p': [],
        'u': [],
        'ins': [],
        'span': []
    };

    Object.keys(allowedAttrs).forEach(tagName => {
        const allowed = allowedAttrs[tagName];
        $(tagName).each((_, el) => {
            if ('attribs' in el) {
                Object.keys(el.attribs).forEach(attr => {
                    if (!allowed.includes(attr)) {
                        $(el).removeAttr(attr);
                    }
                });
            }
        });
    });

    // Unwrap attributeless spans
    $('span').each((_, el) => {
        if (!el.attribs || Object.keys(el.attribs).length === 0) {
            $(el).replaceWith($(el).contents());
        }
    });

    // 6. Remove empty tags
    $('*').each((_, el) => {
        const tagEl = el as any;
        if (!tagEl.tagName) return;

        if (tagEl.tagName === 'HTML' || tagEl.tagName === 'HEAD' || tagEl.tagName === 'BODY') return;

        const tagName = tagEl.tagName.toLowerCase();
        if (['img', 'br', 'a'].includes(tagName)) return;

        const text = $(el).text().trim();
        const hasProtectedChild = $(el).find('img, br, a').length > 0;

        if (!text && !hasProtectedChild) {
            $(el).remove();
        }
    });

    // 7. Unwrap p and div tags (causing line breaks)
    $('p, div').each((_, el) => {
        if ($(el).text().trim()) {
            $(el).after('\n');
        }
        $(el).replaceWith($(el).contents());
    });

    // Extract result
    let result = $('body').html() || "";

    // Collapse multiple spaces and remove isPasted
    result = result.replace(/id="isPasted"/g, '');
    result = result.replace(/[ \t]+/g, ' ');

    // Remove empty tags artifacts
    result = result.replace(/<([a-z0-9]+)[^>]*>\s*<\/\1>/gi, '');

    // Collapse multiple newlines/br
    result = result.replace(/\n+/g, '\n');
    result = result.replace(/(<br\b[^>]*>\s*)+/gi, '<br/>');

    // Remove leading/trailing line breaks and whitespace
    result = result.replace(/^(<br\b[^>]*>|\s|\n)+/i, '');
    result = result.replace(/(<br\b[^>]*>|\s|\n)+$/i, '');

    return result.trim();
}

export function safeHtmlToMarkdown(text: string): string {
    if (!text) return "";
    let processed = text.replace(/\s*<br\b[^>]*>\s*/gi, '\n');
    processed = processed.replace(/<\/br>/gi, '');

    const protect = (s: string) => s.replace(/&lt;/g, '[[LT]]').replace(/&gt;/g, '[[GT]]').replace(/&LT;/g, '[[LT]]').replace(/&GT;/g, '[[GT]]');
    processed = protect(processed);

    const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        emDelimiter: '_',
    });

    turndownService.keep(['sup', 'sub', 'u', 'b', 'i', 'em', 'strong', 'ins']);

    let converted = turndownService.turndown(processed).trim();

    const restore = (s: string) => s.replace(/\[\[LT\]\]/g, '&lt;').replace(/\[\[GT\]\]/g, '&gt;');
    converted = restore(converted);

    converted = converted.replace(/^(\d+)\./gm, '$1\\.');
    converted = converted.replace(/\\\*\\\*/g, '**').replace(/\\\*/g, '*');
    converted = converted.replace(/\\_/g, '_');
    converted = converted.replace(/\\\./g, '.');
    converted = converted.replace(/ +$/gm, '');

    return converted;
}

export function questionsToMarkdown(questions: any[]): string {
    let md = "";
    questions.forEach((q, i) => {
        const qTextContent = q.SoruMetni || q.question || "";
        const qTextRaw = safeHtmlToMarkdown(qTextContent);
        let qTextFormatted = qTextRaw.replace(/\n/g, '<br />');
        qTextFormatted = qTextFormatted.replace(/\s*(<br\b[^>]*>\s*)+/g, '<br />');

        const idx = i + 1;
        md += `${idx}. ${qTextFormatted}\n`;

        const options = ['A', 'B', 'C', 'D', 'E'];
        options.forEach(opt => {
            let isCorrect = false;
            const correctKey = q.DogruCevap || q.correctAnswer;
            if (correctKey && String(correctKey).trim().toUpperCase() === opt) {
                isCorrect = true;
            }

            const prefix = isCorrect ? "**Cevap " : "";
            const suffix = isCorrect ? "**" : "";
            const listItemPrefix = `    - ${prefix}${opt}-) `;

            const optContent = q[opt] || (q.options ? q.options[opt] || q.options[options.indexOf(opt)] : "");
            let optTextFormatted = "";
            if (optContent) {
                const raw = safeHtmlToMarkdown(String(optContent));
                optTextFormatted = raw.replace(/\n/g, ' ');
                optTextFormatted = optTextFormatted.replace(/<br\b[^>]*>/gi, ' ');
                optTextFormatted = optTextFormatted.replace(/\s+/g, ' ').trim();
            }

            md += `${listItemPrefix}${optTextFormatted}${suffix}\n`;
        });

        if (q.Aciklama) {
            let explanation = safeHtmlToMarkdown(q.Aciklama);
            explanation = explanation.replace(/\n/g, '<br />');
            explanation = explanation.replace(/(<br\b[^>]*>\s*)+/g, '<br />');
            md += `\n    > **Açıklama:** ${explanation}\n\n`;
        }
        md += "    <hr />\n";
    });
    return md;
}
