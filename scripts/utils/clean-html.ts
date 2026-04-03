import * as cheerio from 'cheerio';
import he from 'he';

const OCR_FIX_MAP: Record<string, string> = {
    'düşnür': 'düşünür',
    'doymanş': 'doymamış',
    'öğrencilern': 'öğrencilerin',
    'acilmüdahale': 'acil müdahale',
    'işletmecilii': 'işletmeciliği'
};

/**
 * Performs regex-based text cleaning and repair before HTML parsing.
 */
export function repairText(html: string, options: { isTechnical?: boolean } = {}): string {
    if (!html) return "";
    let cl = html.normalize('NFC');

    cl = cl.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
           .replace(/&#([0-9]+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));

    cl = cl.replace(/\x16/g, 'ü').replace(/\x12/g, 'ş').replace(/\x14/g, 'ğ').replace(/\x1e/g, 'i').replace(/\x1d/g, 'i')
           .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f\u00AD\uFEFF]/g, '')
           .replace(/&shy;/g, '')
           .replace(/\[\d+\]/g, ''); 

    cl = cl.replace(/<(table|tbody|tr|td)\b[^>]*data-task_position="PREPARE_QUESTION"[^>]*>/gi, '')
           .replace(/&lt;source-footnote[^&]*&gt;/gi, '')
           .replace(/\b_ngh[a-z0-9-]*="[^"]*"/gi, '')
           .replace(/\bng-version="[^"]*"/gi, '');

    // v166/v167 Fix for truncated or mixed-encoded span artifacts
    cl = cl.replace(/&lt;span\b(?:(?!&gt;|[>$]).)*?font-family:\s*monospace;?.*?(&gt;|[>$])/gi, '')
           .replace(/<span\b[^>]*?font-family:\s*monospace;?.*?>/gi, '');

    Object.entries(OCR_FIX_MAP).forEach(([k, v]) => {
        cl = cl.replace(new RegExp(k, 'gi'), v);
    });

    if (!options.isTechnical) {
        const hT = /&lt;(\/?)((?:B|STRONG|I|EM|U|S|STRIKE|SUB|SUP|HR|BR|ARTICLE|SECTION|DIV|P|LABEL|IFRAME|IMG|FONT|SPAN|OL|UL|LI|BLOCKQUOTE|A|TABLE|TBODY|THEAD|TR|TH|TD|H[1-6]|HTML|HEAD|BODY|FORM)\b)((?:\s+(?:(?!&gt;).)*?)?)&gt;/gi;
        cl = cl.replace(hT, (_, s, t, a) => {
            const ln = t.toLowerCase();
            if (s) return !['font','p','div','article','section','label'].includes(ln) ? `</${t}>` : "";
            if (ln === 'font') return "";
            return `<${t}${a.replace(/&quot;/g, '"')}>`;
        });
    }

    cl = cl.replace(/<([a-zA-Zçıöğüş]+)\b(?![^>]*>)/gi, '&lt;$1');

    return cl;
}

/**
 * Converts HTML to plain text by stripping tags and decoding entities.
 */
export function toPlainText(html: string): string {
    if (!html) return "";
    let spaced = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
    spaced = spaced.replace(/(?:<|&lt;)[^>]*$/, '');
    return he.decode(spaced).replace(/\s+/g, ' ').trim();
}

/**
 * Checks if two texts are substantially similar, useful for deduplication.
 */
export function areTextsSimilar(t1: string, t2: string): boolean {
    if (!t1 || !t2) return false;
    const s1 = t1.toLowerCase().replace(/[^a-z0-9şğüöçı]/g, '');
    const s2 = t2.toLowerCase().replace(/[^a-z0-9şğüöçı]/g, '');
    if (!s1 || !s2) return false;
    return s2.includes(s1) || s1.includes(s2) || s1 === s2;
}

/**
 * Checks if a string is considered "garbage" or redundant UI artifacts.
 */
export function isGarbage(s: string): boolean {
    if (!s) return true;
    if (s.includes('<img')) return false;
    const plain = toPlainText(s).toLowerCase();
    if (plain.length < 2) return true;
    if (plain.length < 5 && /^[a-e0-9\W]+$/.test(plain)) return true;
    if (/^(?:doğru\s*)?(?:yanıt|cevap|şık|seçenek)\s*:?\s*[a-e](?:'|’)?(?:dır|dir|dur|dür|tır|tur|tir|tür)?(?:\s+(?:şık|seçenek|cevap|yanıt)(?:ı|i|u|ü)?(?:dır|dir|dur|dür|tır|tur|tir|tür)?)?\.?$/.test(plain)) return true;
    if (plain === 'hatırlatma' || plain === 'hatırlatma sorusu' || plain === 'soru') return true;
    return false;
}

function stripWrappers(h: string): string {
    let c = h.trim();
    let ch = true;
    while (ch) {
        ch = false;
        ['b', 'strong', 'i', 'em', 'u'].forEach(t => {
            const r = new RegExp(`^\\s*<${t}>(.*?)<\\/${t}>\\s*$`, 'i');
            const m = c.match(r);
            if (m && m[1] && !m[1].includes(`<${t}>`)) {
                c = m[1].trim();
                ch = true;
            }
        });
    }
    return c;
}

/**
 * Main cleaning utility for HTML content used in questions and explanations.
 */
export function cleanHtml(html: string, options: { university?: string; isExplanation?: boolean; stripLoneBr?: boolean; isTechnical?: boolean; disableChoiceCleanup?: boolean } = {}): string {
    if (!html) return "";
    const isAnad = options.university === 'anadolu';
    
    let preHtml = html;
    if (options.isTechnical) {
        preHtml = preHtml.replace(/&lt;img\s+(.*?)\s*\/?&gt;/gi, '<img $1 />');
        preHtml = preHtml.replace(/<([^> \/]+)>/g, (m, g) => {
            const tags = ['b','strong','i','em','u','br','p','div','span','ol','ul','li','table','tbody','thead','tr','th','td','img','form','html','head','body'];
            return tags.includes(g.toLowerCase()) ? m : `&lt;${g}&gt;`;
        });
    }

    const cl = repairText(preHtml, { isTechnical: options.isTechnical });
    const $ = cheerio.load(cl, { decodeEntities: false });
    const root = $('body');

    root.find('head, script, style, link, meta, input, button, textarea').remove();
    root.find('*').each((_, el) => { if ($(el).css('display') === 'none') $(el).remove(); });

    let docListIdx = 1;

    if (!options.isExplanation) {
        root.find('ol, ul').each((_, el) => {
            const $l = $(el);
            const tN = el.tagName.toLowerCase();
            const items: string[] = [];
            const children = $l.children('li');
            if (children.length) {
                children.each((i, c) => {
                    let text = $(c).html()?.trim() || "";
                    if (tN === 'ol') {
                        const startAttr = parseInt($l.attr('start') || "1", 10);
                        const startVal = (children.length === 1 && docListIdx > 1) ? docListIdx : (startAttr + i);
                        let type = $l.attr('type') || "1";
                        if ($l.attr('style')?.includes('lower-alpha')) type = 'a';
                        else if ($l.attr('style')?.includes('upper-roman')) type = 'I';
                        else if ($l.attr('style')?.includes('lower-roman')) type = 'i';
                        const rM = (n: number, upper = true) => {
                            const m = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n] || n.toString();
                            return upper ? m : m.toLowerCase();
                        };
                        if (type === 'I') text = `${rM(startVal, true)}. ${text}`;
                        else if (type === 'i') text = `${rM(startVal, false)}. ${text}`;
                        else if (type === 'A') text = `${String.fromCharCode(64 + startVal)}. ${text}`;
                        else if (type === 'a') text = `${String.fromCharCode(96 + startVal)}. ${text}`;
                        else text = `${startVal}. ${text}`;
                        docListIdx = startVal + 1;
                    } else { docListIdx++; }
                    items.push(text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "$1"));
                });
            } else {
                const raw = $l.html()?.split(/<br\s*\/?>/i) || [];
                raw.forEach((line) => {
                    const cleanI = line.replace(/^\s*\d+[\.\)]\s*/, '').trim();
                    if (cleanI) items.push(`${docListIdx++}. ${cleanI}`);
                });
            }
            if (items.length) {
                const prevNode = (el.previousSibling as any);
                const prefix = (prevNode && prevNode.nodeValue && prevNode.nodeValue.trim().length > 0) ? '<br/>' : '';
                $l.replaceWith(prefix + items.join('<br/>') + '<br/>');
            } else { $l.remove(); }
        });
    }

    root.find('p').each((_, el) => {
        const h = $(el).html()?.trim() || "";
        if (h) $(el).replaceWith(h + '<br/>'); else $(el).remove();
    });

    const UNWRAP = ['div', 'header', 'footer', 'article', 'section', 'a', 'legend', 'fieldset', 'main', 'label', 'span'];
    UNWRAP.forEach(t => {
        root.find(t).each((_, e) => {
            if (t === 'span' && $(e).find('b, strong, i, em, u, img, br, table').length) return;
            $(e).replaceWith($(e).contents());
        });
    });

    const ALLOWED = new Set(['b', 'strong', 'i', 'em', 'u', 'img', 'br', 'table', 'tbody', 'thead', 'tr', 'th', 'td', 'ul', 'ol', 'li', 'form', 'html', 'head', 'body', 'header', 'footer', 'article', 'section', 'main', 'legend', 'fieldset']);
    root.find('*').each((_, el) => { if (!ALLOWED.has(el.tagName.toLowerCase())) $(el).replaceWith($(el).contents()); });

    let res = root.html() || "";
    if (options.isExplanation) res = res.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

    res = res.replace(/<\/ (em|i|b|strong|u)>/gi, '</$1>')
             .replace(/<\/em>([a-zA-Zğüşıöç0-9])/gi, '</em> $1')
             .replace(/<(b|strong|i|em|u)>(\s+)<\/\1>/gi, '$2') 
             .replace(/<(b|strong|i|em|u)>\s*<br\s*\/?>\s*<\/\1>/gi, '')
             .replace(/<(b|strong|i|em|u)>(?:\s*<br\s*\/?>\s*)+/gi, '<$1>')
             .replace(/(?:\s*<br\s*\/?>\s*)+<\/(b|strong|i|em|u)>/gi, '</$1>')
             .replace(/<(b|strong|i|em|u)>(?:&nbsp;|\s)+/gi, '<$1>')
             .replace(/(?:&nbsp;|\s)+<\/(b|strong|i|em|u)>/gi, '</$1>')
             .replace(/<\/(strong|b)>(\s*)<(strong|b)>/gi, '$2')
             .replace(/<\/(em|i)>(\s*)<(em|i)>/gi, '$2')
             .replace(/<\/u>(\s*)<u>/gi, '$1')
             .replace(/<\/(strong|b|em|i|u)>(?:\s|&nbsp;)*<br\s*\/?>\s*<(strong|b|em|i|u)>/gi, ' ')
             .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
             .replace(/<br\s*\/?>\s*(<br\s*\/?>)+/gi, '<br/>')
             .replace(/^\s*<br\s*\/?>|<br\s*\/?>\s*$/gi, '')
             .replace(/<(b|strong|i|em|u)>\s*<\/\1>/gi, '')
             .replace(/<br>/g, '<br/>')
             .replace(/([a-zğüşıöç0-9,;:\)])\s*<br\s*\/?>\s*([a-züşıöç0-9\()])/g, (m, p1, p2) => {
                 if (isAnad && !options.isExplanation) return `${p1}<br/>${p2}`;
                 return `${p1} ${p2}`;
             })
             .replace(/([^a-zA-Zğüşıöç0-9])\s*<br\s*\/?>\s*([a-zA-Zğüşıöç0-9])/g, '$1<br/>$2')
             .replace(/<br\s*\/?>\s*(<table)/gi, '$1')
             .replace(/(<\/table>)\s*<br\s*\/?>/gi, '$1')
             .replace(/(<table[^>]*>)\s*<br\s*\/?>\s*/gi, '$1')
             .replace(/<\/tr>\s*<br\s*\/?>\s*/gi, '</tr>')
             .replace(/<\/thead>\s*<br\s*\/?>\s*/gi, '</thead>')
             .replace(/<\/tbody>\s*<br\s*\/?>\s*/gi, '</tbody>')
             .trim();

    if (options.stripLoneBr) res = res.replace(/<br\s*\/?>/gi, ' ');

    return stripWrappers(res).normalize('NFC').trim();
}
