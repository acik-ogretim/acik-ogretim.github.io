import { load } from 'cheerio';
import he from 'he';

// Interface for configuration
export interface CleanHtmlOptions {
    preserveCode?: boolean;
    isTechnical?: boolean;
    isExplanation?: boolean;
    disableChoiceCleanup?: boolean;
    debug?: boolean;
    applyTechnicalLogic?: boolean;
    normalizePlaceholders?: boolean;
    normalizeUnicode?: boolean;
}

export interface RepairOptions {
    stripLoneBr?: boolean;
    normalizePlaceholders?: boolean;
    normalizeUnicode?: boolean;
}

export function repairText(text: string, options: RepairOptions = { stripLoneBr: true, normalizePlaceholders: false, normalizeUnicode: false }): string {
    if (!text) return "";

    // 0. Unicode Normalization (Optional)
    let cleaned = options.normalizeUnicode ? text.normalize('NFC') : text;

    // 1. Basic Text Normalization (Before Parsing)
    // Replace non-breaking spaces and other special spaces
    cleaned = cleaned.replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\xa0/g, ' ')
        .replace(/[\u2000-\u200b]/g, ' ')
        .replace(/[\u00ad\ufeff]/g, '')
        .replace(/[\u2028\u2029]/g, ' ')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/\x1e/g, 'i').replace(/\x1f/g, 'i');

    // Normalize placeholders (dots, hyphens, underscores) to THREE standard HTML ellipses (user preference)
    if (options.normalizePlaceholders) {
        cleaned = cleaned.replace(/[\.\-_]{3,}/g, '&hellip;&hellip;&hellip;');
    }

    // Fix common AÖF OCR typos
    cleaned = cleaned.replace(/temeliolarak/gi, 'temeli olarak');

    // Remove basic comments (safer here)
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");

    return cleaned;
}

export function cleanHtml(text: string, options: CleanHtmlOptions = {}): string {
    if (!text) return "";

    const useTechnicalLogic = options.applyTechnicalLogic ?? options.isTechnical ?? false;

    // Pre-processing
    // Use repairText for basic normalization (spaces, dashes, dots)
    // Pass down the normalization preferences (default to false to focus on errors)
    let cleaned = repairText(text, {
        stripLoneBr: true,
        normalizePlaceholders: options.normalizePlaceholders ?? false,
        normalizeUnicode: options.normalizeUnicode ?? false
    });

    // 2. Identify and handle encoded artifacts immediately but safely
    const encodedArtifactRegex = /&lt;(?:span|div)\s+[^&gt;]*style=[^&gt;]*?(?:left|top|font-family|transform|position):[^&gt;]*?&gt;([\s\S]*?)&lt;\/(?:span|div)&gt;/gi;
    cleaned = cleaned.replace(encodedArtifactRegex, '$1');

    // Convert apple-converted-space spans and nested whitespace tags
    let prevCleaned;
    do {
        prevCleaned = cleaned;
        cleaned = cleaned.replace(/<(b|strong|i|em|u|span)\b[^>]*>\s*<\/\1>/gi, ' ');
        cleaned = cleaned.replace(/<span\s+class="apple-converted-space"[^>]*>([\s\S]*?)<\/span>/gi, (match, content) => {
            const trimmed = content.trim();
            if (!trimmed || trimmed === "&nbsp;") return ' ';
            return content;
        });
    } while (cleaned !== prevCleaned);

    // Protect Blocks & Literalize logic - largely simplified by Cheerio but we keep protection for regex-based safety
    const protectedBlocks: string[] = [];
    if (useTechnicalLogic) {
        cleaned = cleaned.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, (match) => {
            protectedBlocks.push(match);
            return `%%PROTECTED_BLOCK_${protectedBlocks.length - 1}%%`;
        });
        cleaned = cleaned.replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, (match) => {
            protectedBlocks.push(match);
            return `%%PROTECTED_BLOCK_${protectedBlocks.length - 1}%%`;
        });
    }

    // Cheerio Loading
    // xmlMode: false ensures HTML tolerance and auto-closing (fixes the split tag issue)
    // decodeEntities: false prevents Cheerio from decoding entities prematurely
    const $ = load(cleaned, { xmlMode: false, decodeEntities: false } as any);
    const root = $('body'); // Operate on body

    // --- NODE BASED CLEANING ---

    // 1. Remove UI/Technical Junk & Extension Artifacts
    const junkTags = 'button, svg, script, style, noscript, canvas, iframe, map, area, gdiv, ga, ginger-word, ginger-correction';
    root.find(junkTags).remove();

    // 2. Handle o:p and legacy wrappers
    root.find('*').each((_, el) => {
        const tagName = el.tagName.toLowerCase();
        if (tagName.startsWith('o:') || tagName === 'dir') {
            $(el).replaceWith($(el).contents());
        }
    });

    // 3. Symbol Mapping
    const symbolMap: Record<string, string> = {
        '': '~', '∼': '~', '': '&rArr;', '⇒': '&rArr;',
        '': '&hArr;', '⇔': '&hArr;', '': '&or;', '∨': '&or;',
        '': '&and;', '∧': '&and;', '': '&there4;', '∴': '&there4;',
        '': '&equiv;', '≡': '&equiv;', '': '&exist;', '∃': '&exist;',
        '': '&forall;', '∀': '&forall;', '': '&empty;', '': '&rarr;',
        '': '&bull;', '': '{', '': '}'
    };

    const processTextSymbols = (elem: any) => {
        $(elem).contents().each((_, child) => {
            if (child.type === 'text') {
                let t = child.data || '';
                for (const [sym, rep] of Object.entries(symbolMap)) {
                    if (t.includes(sym)) t = t.split(sym).join(rep);
                }
                child.data = t;
            } else if (child.type === 'tag') {
                processTextSymbols(child);
            }
        });
    };
    processTextSymbols(root);

    // Transform Spans/Divs/OL Types
    root.find('span, div').each((_, el) => {
        const $el = $(el);
        const style = $el.attr('style') || "";
        const cls = $el.attr('class') || "";

        if (/text-decoration:\s*underline/i.test(style)) {
            const content = $el.html() || '';
            $el.replaceWith(`<u>${content}</u>`);
        } else if (/font-family:\s*['"]?(?:courier|monospace|consolas|lucida console)/i.test(style) ||
            /tagnamecolor|attributevaluecolor|tagcolor|comment/i.test(cls)) {
            const content = $el.html() || '';
            $el.replaceWith(`<code>${content}</code>`);
        } else if (/position:\s*absolute|left:|top:|transform:/i.test(style)) {
            $el.replaceWith($el.contents());
        }
    });

    root.find('ol').each((_, el) => {
        const $el = $(el);
        const style = $el.attr('style') || "";
        if (/list-style-type:\s*upper-roman/i.test(style)) {
            $el.attr('type', 'I').removeAttr('style');
        } else if (/list-style-type:\s*lower-roman/i.test(style)) {
            $el.attr('type', 'i').removeAttr('style');
        }
    });

    // Unwrap layout containers
    const layoutTags = ['div', 'article', 'section', 'header', 'footer', 'nav', 'main', 'aside', 'figure', 'figcaption', 'span', 'font', 'center'];
    if (!options.isTechnical) layoutTags.push('pre');

    let changed = true, iterations = 0;
    while (changed && iterations < 10) {
        changed = false;
        const currentRoot = root; // Re-query checks
        layoutTags.forEach(tag => {
            currentRoot.find(tag).each((_, el) => {
                $(el).replaceWith($(el).contents());
                changed = true;
            });
        });
        iterations++;
    }

    // BR Handling
    root.find('br').each((_, br) => {
        const $br = $(br);
        const prev = br.prev;
        const next = br.next;

        const prevTextRaw = (prev && prev.type === 'text') ? (prev.data || '') : '';
        const nextTextRaw = (next && next.type === 'text') ? (next.data || '') : '';
        const prevText = he.decode(prevTextRaw).trimEnd();
        const nextText = he.decode(nextTextRaw).trimStart();

        const isListMarker = /^([•\-–—]|[IVXivx]+\.|[0-9]+[\.\-]|\([0-9]+\)|\([a-zA-Z]\)\s)/.test(nextText);
        const startsWithUppercase = /^[A-ZÇĞİÖŞÜÂÎÛ]/.test(nextText) && !/^[a-zçğıöşüâîû]/.test(nextText);
        const isMidSentence = /[a-zA-ZçğıöşüİĞÜÖŞçâîûÂÎÛ0-9,;:\)\s]$/.test(prevText) &&
            (/^[a-zçğıöşüâîû]/.test(nextText) || nextText.startsWith('('));
        const inTable = $br.closest('table').length > 0;

        if (!inTable && !isListMarker && !startsWithUppercase && isMidSentence && prev && prev.type === 'text' && next && next.type === 'text') {
            prev.data = prevTextRaw.trimEnd() + ' ';
            next.data = nextTextRaw.trimStart();
            $br.remove();
        } else {
            if (prev && prev.type === 'text') prev.data = prev.data.trimEnd();
            if (next && next.type === 'text') next.data = next.data.trimStart();
        }
    });

    // Whitelist
    const whitelist = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'hr', 'b', 'strong', 'i', 'em', 'u', 'code', 'pre', 'ul', 'ol', 'li', 'img', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'sup', 'sub', 'kbd', 'samp', 'var', 'span', 'math', 'semantics', 'mrow', 'mtext', 'mo', 'mfrac', 'mi', 'annotation', 'mover', 'munder', 'munderover', 'msqrt', 'mroot', 'mstyle', 'merror', 'mpadded', 'mphantom', 'mfenced', 'menclose', 'mtable', 'mtr', 'mtd', 'maligngroup', 'malignmark', 'ms', 'mspace', 'mglyph']);

    root.find('*').each((_, el) => {
        const tag = el.tagName.toLowerCase();
        if (tag && !whitelist.has(tag)) {
            $(el).replaceWith($(el).contents());
        }
    });

    // Attributes Strip
    root.find('*').each((_, el) => {
        const tag = el.tagName.toLowerCase();
        if (!tag || ['html', 'head', 'body'].includes(tag)) return;
        const attrs = Object.keys(el.attribs || {});
        attrs.forEach(a => {
            if (tag === 'img' && ['src', 'alt', 'width', 'height'].includes(a)) return;
            if (tag === 'a' && a === 'href') return;
            if ((tag === 'td' || tag === 'th') && ['colspan', 'rowspan'].includes(a)) return;
            if (tag === 'ol' && ['type', 'start'].includes(a)) return;
            $(el).removeAttr(a);
        });
    });

    // Empty Tag Cleanup
    let tagCleanupChanged;
    do {
        tagCleanupChanged = false;
        root.find('*').each((_, el) => {
            const $el = $(el);
            if ($el.parent().length === 0) return;
            const tag = el.tagName.toLowerCase();
            if (!tag || ['html', 'head', 'body', 'img', 'br', 'hr'].includes(tag)) return;

            const textContent = $el.text().trim();
            const hasProtected = textContent.includes('%%PROTECTED_BLOCK_');
            const hasContentTags = $el.find('img, br, hr, p, li, blockquote').length > 0;

            if (!textContent.length && !hasProtected && !hasContentTags) {
                // If it has spaces but no visible text, replace with single space
                if ($el.text().length > 0 && !['p', 'br', 'li', 'td', 'th', 'tr'].includes(tag)) {
                    $el.replaceWith(' ');
                } else {
                    $el.remove();
                }
                tagCleanupChanged = true;
            }
        });
    } while (tagCleanupChanged);

    // List & Table Normalizations
    root.find('img').each((_, el) => { if (!$(el).attr('src')) { $(el).replaceWith(he.escape($.html(el))); } });
    root.find('a').each((_, el) => { if (!$(el).attr('href')) { $(el).replaceWith($(el).contents()); } });

    // Merge lists
    root.find('ul, ol').each((_, el) => {
        const $el = $(el);
        if ($el.parent().length === 0) return;
        const tag = el.tagName.toLowerCase();
        let $next = $el.next();
        while ($next.length && $next[0].tagName.toLowerCase() === tag) {
            if (tag === 'ol' && $el.attr('type') !== $next.attr('type')) break;
            $el.append($next.contents());
            $next.remove();
            $next = $el.next();
        }
    });

    // Unwrap nested P
    root.find('li, td, th').each((_, el) => {
        $(el).find('p').each((_, p) => {
            $(p).after('\n').replaceWith($(p).contents());
        });
    });
    root.find('ol > ul, ol > ol, ul > ol, ul > ul').each((_, inner) => {
        $(inner).replaceWith($(inner).contents());
    });

    // Unwrap P and Heading tags
    root.find('p, h1, h2, h3, h4, h5, h6').each((_, el) => {
        $(el).after('\n').replaceWith($(el).contents());
    });

    // Final Encoding
    // Final Encoding
    const encodeTextNodes = (elem: any) => {
        $(elem).contents().each((_, child) => {
            if (child.type === 'text') {
                let decoded = he.decode(child.data || '');
                decoded = decoded.replace(/[\u00A0\u2000-\u200b]/g, ' ')
                    .replace(/\u00AD/g, '')
                    .replace(/[\u2013\u2014\u2212]/g, '-')
                    .replace(/\u223C/g, '~');

                // Direct assignment: Cheerio handles necessary escaping (e.g. & -> &amp;) upon serialization
                child.data = decoded;
            } else if (child.type === 'tag') {
                encodeTextNodes(child);
            }
        });
    };
    encodeTextNodes(root);

    let result = root.html() || '';

    // Post-processing strings
    result = result.replace(/[ \t\u00A0]+/g, ' ');
    result = result.replace(/\r/g, '');
    result = result.replace(/\n\s*\n+/g, '\n');
    const structuralBoundaries = /<\/?(?:table|thead|tbody|tfoot|tr|td|th|ul|ol|li|p|div|section|article|blockquote|br)\b[^>]*>/gi;
    result = result.replace(new RegExp(`\\s*(${structuralBoundaries.source})\\s*`, 'gi'), '$1');
    result = result.replace(/\n/g, '<br/>');
    result = result.replace(/\s*<br\s*\/?>\s*/gi, '<br/>');

    // Lists cleanup: no BR around lists
    result = result.replace(/<br\s*\/?>\s*(<\/?(?:ul|ol|li)\b[^>]*>)/gi, '$1');
    result = result.replace(/(<\/?(?:ul|ol|li)\b[^>]*>)\s*<br\s*\/?>/gi, '$1');

    // Self-close IMG
    result = result.replace(/<img([^>]*)>/gi, (match, attrs) => `<img ${attrs.trim()}/>`);

    // Merge adjacent formatting
    ['strong', 'b', 'i', 'em', 'u'].forEach(tag => {
        result = result.replace(new RegExp(`</${tag}><${tag}>`, 'gi'), '');
    });

    // Link healing
    result = result.replace(/<a\s+href="([^"]+)">([\s\S]+?)([\.,:;!])\s*<\/a>/gi, (match, href, text, punct) => {
        let newHref = href.endsWith(punct) ? href.slice(0, -1) : href;
        return `<a href="${newHref}">${text}</a>${punct}`;
    });
    result = result.replace(/<a\s+href="([^"]+)">([^<]+)<\/a>(\.(?:tr|com|net|org|gov|edu|info|tv|me|com\.tr)\b)/gi, (match, href, text, suffix) => {
        const newHref = href.endsWith(suffix) ? href : href + suffix;
        return `<a href="${newHref}">${text}${suffix}</a>`;
    });
    result = result.replace(/([“"'])\s*<a\b[^>]*>(.*?)<\/a>\s*([”"'])/gi, '$1$2$3');

    // Wiris
    const wirisRegex = /(?:<img\b[^>]*src=["']|)(https?:\/\/(?:www\.)?wiris\.net\/[^\s"']*?mml=)([^\s"'&]+)(?:&[^\s"']*|)(?:["'][^>]*>|)/gi;
    const decodeRecursive = (s: string, depth = 0): string => {
        if (depth > 3) return s;
        try { const d = decodeURIComponent(s); return d === s ? d : decodeRecursive(d, depth + 1); } catch { return s; }
    };
    result = result.replace(wirisRegex, (match, prefix, mmlEncoded) => {
        try { return decodeRecursive(mmlEncoded); } catch { return match; }
    });

    result = result.replace(/^(<br\b[^>]*>|\s|&gt;|>)+/i, '').replace(/(<br\b[^>]*>|\s)+$/i, '');

    // Restore Protected
    protectedBlocks.forEach((block, index) => {
        result = result.replace(`%%PROTECTED_BLOCK_${index}%%`, block);
    });

    // Aggressive cleanup (double encoded)
    result = result.replace(/&lt;p&gt;&amp;nbsp;&lt;\/p&gt;/gi, '')
        .replace(/<p>&nbsp;<\/p>/gi, '')
        .replace(/<p>\s*<\/p>/gi, '')
        .replace(/<p\s+class="(Pa?\d+|Default|p\d+|Secenekler|Soru|Cevap|Baslik|Metin|Normal|BodyText|ListParagraph)"\s*>/gi, '<p>')
        .replace(/&lt;p&gt;\s*&lt;\/p&gt;/gi, '')
        .replace(/&lt;(li|span|b|i|strong|em)&gt;\s*&lt;\/\1&gt;/gi, '')
        .replace(/^(<br\s*\/?>|\s)+/gi, '')
        .replace(/(<br\s*\/?>|\s)+$/gi, '');

    while (/<br\s*\/?>[\s\xa0]*<br\s*\/?>/i.test(result)) {
        result = result.replace(/<br\s*\/?>[\s\xa0]*<br\s*\/?>/gi, '<br/>');
    }

    // 2. Self-Deduplication (Common in Explanation fields)
    // If it looks like "Text A <br/> Text A (longer)" or vice versa, keep only the longer one.
    if (result.includes('<br')) {
        const parts = result.split(/<br\s*\/?>/i);
        if (parts.length >= 2) {
            const p1 = toPlainText(parts[0]);
            const p2 = toPlainText(parts.slice(1).join('<br/>'));

            if (p1 && p2) {
                if (p1.length > 5 && p2.length > 5) {
                    if (p2.includes(p1) || p1.includes(p2)) {
                        result = (p2.length >= p1.length) ? parts.slice(1).join('<br/>') : parts[0];
                    }
                }
            }
        }
    }

    return result.trim();
}

/**
 * Extracts plain text from HTML, similar to browser's innerText.
 * Uses Cheerio for reliable DOM-based extraction without regex.
 */
export function toPlainText(html: string): string {
    if (!html) return "";

    // Replace <br> and other tags with a space to avoid merging words
    // e.g. "word1<br/>word2" -> "word1 word2" instead of "word1word2"
    const spaced = html.replace(/<[^>]+>/g, ' ');

    return he.decode(spaced)
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

export function questionsToMarkdown(questions: any[]): string {
    return questions.map((q, i) => {
        let md = `### Soru ${i + 1}\n\n${q.text}\n\n`;
        if (q.options) {
            Object.keys(q.options).forEach(key => {
                md += `- **${key})** ${q.options[key]}\n`;
            });
        }
        md += `\n**Doğru Cevap:** ${q.correctAnswer}\n`;
        if (q.explanation) {
            md += `\n> **Açıklama:** ${q.explanation}\n`;
        }
        return md;
    }).join('\n---\n\n');
}
