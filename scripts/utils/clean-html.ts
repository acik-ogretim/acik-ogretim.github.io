
import * as cheerio from 'cheerio';
import he from 'he';
import TurndownService from 'turndown';

// Interface for configuration if needed later
interface CleanHtmlOptions {
    preserveCode?: boolean;
    isTechnical?: boolean;
}

export interface RepairOptions {
    stripLoneBr?: boolean;
}

export function repairText(text: string, options: RepairOptions = { stripLoneBr: true }): string {
    if (!text) return "";

    // Decode entities
    let cleaned = he.decode(text);

    // 1. Normalize characters (Move quite early to ensure regexes work on clean text)
    // Normalize line endings
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Replace non-breaking spaces
    cleaned = cleaned.replace(/\xa0/g, ' ');
    // Normalize various Unicode spaces (U+2000 - U+200B) including U+2003 (Em Space) to actual space
    cleaned = cleaned.replace(/[\u2000-\u200b]/g, ' ');
    // Remove invisible zero-width chars (and Soft Hyphen \u00ad)
    cleaned = cleaned.replace(/[\u00ad\ufeff]/g, '');
    // Replace unusual line separators with space
    cleaned = cleaned.replace(/[\u2028\u2029]/g, ' ');
    // Normalize dashes (En dash, Em dash to hyphen)
    cleaned = cleaned.replace(/[\u2013\u2014]/g, '-');
    // Fix specific encoding artifacts (Anadolu)
    cleaned = cleaned.replace(/\x1e/g, 'i').replace(/\x1f/g, 'i');

    // Fix corrupted words (ATA specific)
    cleaned = cleaned
        .replace(/yang[\uFFFD]+nın/g, "yangının")
        .replace(/çal[\uFFFD]+şma/g, "çalışma")
        .replace(/([Yy])ar[\uFFFD]+m/g, "$1arım")
        .replace(/sıras[\uFFFD]+yla/g, "sırasıyla")
        .replace(/bağıms[\uFFFD]+zlık/g, "bağımsızlık")
        .replace(/\uFFFD/g, "") // Remove remaining replacement chars
        .replace(/\u007F/g, "") // Remove DELETE chars
        .replace(/<<</g, ""); // Remove artifact '<<<'

    // Map legacy fonts/symbols to HTML Entities (ATA Logic/Math courses)
    cleaned = cleaned
        .replace(//g, "&sim;").replace(/∼/g, "&sim;").replace(/~/g, "&sim;")
        .replace(//g, "&rArr;").replace(/⇒/g, "&rArr;")
        .replace(//g, "&hArr;").replace(/⇔/g, "&hArr;")
        .replace(//g, "&or;").replace(/∨/g, "&or;")
        .replace(//g, "&and;").replace(/∧/g, "&and;")
        .replace(//g, "&there4;").replace(/∴/g, "&there4;")
        .replace(//g, "&equiv;").replace(/≡/g, "&equiv;")
        .replace(//g, "&exist;").replace(/∃/g, "&exist;")
        .replace(//g, "&forall;").replace(/∀/g, "&forall;")
        .replace(//g, "&empty;")
        .replace(//g, "&rarr;")
        .replace(//g, "&bull;")
        .replace(/\uF020/g, " ")
        .replace(//g, "{").replace(//g, "}");

    // Correct common tag typos from raw data
    cleaned = cleaned.replace(/<(stong|strongg|strng|srong|storng)\b/gi, '<strong');
    cleaned = cleaned.replace(/<\/(stong|strongg|strng|srong|storng)>/gi, '</strong>');

    // Markdown-style formatting support
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");

    // Remove Ginger browser extension artifacts (grammar checker pollution)
    cleaned = cleaned.replace(/<gdiv[^>]*>[\s\S]*?<\/gdiv>/gi, "");
    cleaned = cleaned.replace(/<gdiv[^>]*>[\s\S]*/gi, ""); // Handle unclosed gdivs
    cleaned = cleaned.replace(/<\/gdiv>/gi, ""); // Handle stray closing gdivs
    cleaned = cleaned.replace(/<ga[^>]*>[\s\S]*?<\/ga>/gi, "");
    cleaned = cleaned.replace(/<\/ga>/gi, ""); // Handle stray closing ga tags
    cleaned = cleaned.replace(/<ginger-[^>]*>[\s\S]*?<\/ginger-[^>]*>/gi, "");
    cleaned = cleaned.replace(/<\/ginger-[^>]*>/gi, ""); // Handle stray closing ginger tags

    // Remove noisy span/div/font wrappers that have styles or classes (artifacts from Word/Web)
    cleaned = cleaned.replace(/<(span|div|font)\b[^>]*?(?:style|class|face|mso)="[^"]*"[^>]*?>([\s\S]*?)<\/\1>/gi, "$2");
    cleaned = cleaned.replace(/<(span|div|font)\b[^>]*?(?:style|class|face|mso)="[^"]*"[^>]*?>([\s\S]*?)<\/\1>/gi, "$2");

    // Remove Mozilla-specific br artifacts
    cleaned = cleaned.replace(/<br\s+type="_moz"\s*\/?>/gi, "");

    // Remove "tel:" links (often introduced by browser extensions or OS phone number detection misidentifying numeric ranges)
    cleaned = cleaned.replace(/<a[^>]*href=["']tel:[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, "$1");

    // Fix sticky words: If there's a BR between two alphanumeric parts, ensure there's a space
    cleaned = cleaned.replace(/([a-zğüşıöçA-ZĞÜŞİÖÇ0-9])<br\b[^>]*>([a-zğüşıöçA-ZĞÜŞİÖÇ0-9])/gi, "$1 $2");

    // FINAL CLEANUP: Remove leading/trailing line breaks, horizontal rules and whitespace
    if (options.stripLoneBr) {
        cleaned = cleaned.replace(/^(?:\s*<(?:br|hr)\b[^>]*>\s*|\s)+/gi, '');
        cleaned = cleaned.replace(/(?:\s*<(?:br|hr)\b[^>]*>\s*|\s)+$/gi, '');
    } else {
        // Technical mode (stripLoneBr: false):
        // 1. Proactively strip trailing BR/HR IF there is punctuation before them (Sentence cleanup)
        cleaned = cleaned.replace(/([.?!,;:])(?:\s*<(?:br|hr)\b[^>]*>\s*|\s)+$/gi, '$1');

        // 2. Otherwise only strip if it's not the ONLY content
        // We check if the string consists ONLY of <br/> and <hr/> tags
        const isOnlyTags = /^(?:\s*<(?:br|hr)\b[^>]*>\s*|\s)*$/i.test(cleaned);
        if (!isOnlyTags) {
            cleaned = cleaned.replace(/(?:\s*<(?:br|hr)\b[^>]*>\s*|\s)+$/gi, '');
        }
    }

    return cleaned.trim();
}

export function cleanHtml(text: string, options: CleanHtmlOptions = {}): string {
    if (!text) return "";

    // 1. Initial Unification: Markdown backticks to <code> tags
    // This allows us to handle `code` and <code>code</code> under the same logic.
    let processed = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 2. Placeholder & Protection Phase
    // Extract code segments that should be literal text and replace them with unique markers.
    // We protect code, pre, kbd, samp, and var tags which are typically used for technical content.
    const protectedBlocks: string[] = [];
    const blockTypes = ['code', 'pre', 'kbd', 'samp', 'var'];
    const blockRegex = new RegExp(`<(${blockTypes.join('|')})\\b[^>]*>([\\s\\S]*?)<\\/\\1>`, 'gi');

    processed = processed.replace(blockRegex, (match, tag, content) => {
        // Deep decode then escape to ensure it's literal (e.g. <div> inside code becomes &lt;div&gt;)
        const escapedContent = he.escape(he.decode(content));
        const index = protectedBlocks.length;
        protectedBlocks.push(`<${tag}>${escapedContent}</${tag}>`);
        return `%%PROTECTED_BLOCK_${index}%%`;
    });

    // 3. Perform standard cleaning on the remaining text (where the placeholders are safe strings)
    let cleaned = repairText(processed);

    // Standardize noisy br tags
    cleaned = cleaned.replace(/<br\b[^>]*>/gi, '<br/>');

    // Smart Fix: Broken sentences
    cleaned = cleaned.replace(/(?:\n|<br\s*\/?>)\s*(?=[a-zğüşıöç](?![).]))/g, ' ');

    // Roman Numeral Lists
    cleaned = cleaned.replace(/\n\s*(?=(?:I|V|X|L|C|D|M)+\s*\.)/g, '<br/>');

    // Bullet points
    cleaned = cleaned.replace(/\n\s*(?=[•\-\*])/g, '<br/>');

    // Collapse br
    cleaned = cleaned.replace(/(?:\s*<br\/>\s*)+/gi, '<br/>');

    // Convert newlines to br
    cleaned = cleaned.replace(/[\r\n]+/g, '<br/>');

    // Final cleanup of br
    cleaned = cleaned.replace(/(<br\/>)+/g, '<br/>');

    // 4. White-list based Tag Protection (for the non-protected parts)
    const validTags = new Set([
        'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del', 'ins', 'sub', 'sup', 'small', 'big', 'tt', 'font',
        'code', 'pre', 'kbd', 'samp', 'var',
        'br', 'p', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'blockquote',
        'figure', 'figcaption', 'img'
    ]);

    // If NOT a technical course, allow structural/meta/noisy tags to be preserved (not escaped)
    if (!options.isTechnical) {
        [
            'span', 'div', 'article', 'section', 'header', 'footer', 'nav', 'main', 'aside',
            'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'a',
            'html', 'body', 'head', 'title', 'meta', 'link', 'script', 'style',
            'form', 'input', 'button', 'select', 'option', 'textarea', 'label'
        ].forEach(t => validTags.add(t));
    }

    // Escape unknown tags in the rest of the text (both opening and closing tags)
    cleaned = cleaned.replace(/<\/?([a-zA-Z!?][a-zA-Z0-9\-]*)([^>]*)>/g, (match, tagName, attrs) => {
        const lowerTag = tagName.toLowerCase();

        // Special Case: In technical courses, we want to escape structural tags to show them as code.
        // BUT we must NOT escape real <img> tags that have a 'src' (they are likely diagrams/source images).
        if (options.isTechnical) {
            const structuralTags = ['span', 'div', 'article', 'section', 'header', 'footer', 'nav', 'main', 'aside', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'a', 'form', 'input', 'button', 'select', 'option', 'textarea', 'label'];
            if (structuralTags.includes(lowerTag)) return match.replace('<', '&lt;');
            // Only escape <img> if it DOES NOT have a 'src' attribute
            if (lowerTag === 'img' && !attrs.toLowerCase().includes('src=')) return match.replace('<', '&lt;');
            // Special Case: NEVER escape real images (containing src)
            if (lowerTag === 'img' && attrs.toLowerCase().includes('src=')) return match;
        }

        if (!validTags.has(lowerTag)) {
            return match.replace('<', '&lt;');
        }
        return match;
    });

    // Load into Cheerio for structural cleaning
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
        // Protect void elements and common contentless tags
        const protectedTags = ['img', 'br', 'a', 'input', 'hr', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];
        if (protectedTags.includes(tagName)) return;

        const text = $(el).text().trim();
        const hasProtectedChild = $(el).find(protectedTags.join(', ')).length > 0;

        if (!text && !hasProtectedChild) {
            $(el).remove();
        }
    });

    // 7. Unwrap p tags (causing line breaks)
    // We insert a structural marker (newline) which we will later convert to <br/>
    $('p').each((_, el) => {
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

    // Collapse multiple newlines/br and Convert newlines to BR
    // Since we introduced newlines for P tags to imply structure, these should now be BRs.
    result = result.replace(/\n/g, '<br/>');

    // Final cleanup of BRs
    result = result.replace(/(<br\b[^>]*>\s*)+/gi, '<br/>');

    // Remove leading/trailing line breaks and whitespace
    result = result.replace(/^(<br\b[^>]*>|\s)+/i, '');
    result = result.replace(/(<br\b[^>]*>|\s)+$/i, '');

    // 5. Restoration Phase
    // Replace placeholders with the original (and now properly escaped) protected blocks.
    let finalResult = result.trim();
    protectedBlocks.forEach((block, index) => {
        finalResult = finalResult.replace(`%%PROTECTED_BLOCK_${index}%%`, block);
    });

    // 6. Post-Restoration Cleanup: Collapse nested identical tags (e.g., <strong><strong>...</strong></strong>)
    // Sometimes typo correction or raw data artifacts create redundant nesting.
    finalResult = finalResult.replace(/<(b|strong|i|em|u)>\s*<\1>([\s\S]*?)<\/\1>\s*<\/\1>/gi, '<$1>$2</$1>');

    return finalResult;
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
