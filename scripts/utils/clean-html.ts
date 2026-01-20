import { load } from 'cheerio';
import { createHash } from 'crypto';
import he from 'he';

// Cache for cleaned HTML results - keyed by hash of input
const cleanHtmlCache = new Map<string, string>();
const CACHE_MAX_SIZE = 10000;  // Prevent memory bloat

const ALLOWED_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'b', 'strong', 'i', 'em', 'u', 'code', 'pre', 'ul', 'ol', 'li', 'img', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'sup', 'sub', 'kbd', 'samp', 'var', 'span', 'div', 'math', 'semantics', 'mrow', 'mtext', 'mo', 'mfrac', 'mi', 'annotation', 'mover', 'munder', 'munderover', 'msqrt', 'mroot', 'mstyle', 'merror', 'mpadded', 'mphantom', 'mfenced', 'menclose', 'mtable', 'mtr', 'mtd', 'maligngroup', 'malignmark', 'ms', 'mspace', 'mglyph', 'mn', 'msup', 'msub', 'mmsubsup', 'form', 'input', 'select', 'option', 'label', 'textarea', 'keygen', 'article', 'section', 'aside', 'header', 'footer', 'main', 'nav', 'address', 'colgroup', 'col']);

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
    university?: string;
    source?: string;
}

export interface RepairOptions {
    stripLoneBr?: boolean;
    normalizePlaceholders?: boolean;
    normalizeUnicode?: boolean;
    isTechnical?: boolean;
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
        .replace(/[\x1d\x1e\x1f]/g, 'i')
        .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    // Normalize placeholders (dots, hyphens, underscores) to THREE standard HTML ellipses (user preference)
    if (options.normalizePlaceholders) {
        cleaned = cleaned.replace(/[\.\-_]{3,}/g, '&hellip;&hellip;&hellip;');
    }

    // Fix common AÖF OCR typos
    cleaned = cleaned.replace(/temeliolarak/gi, 'temeli olarak');

    // 4. Anadolu AÖF specific junk (exposed attributes as plain text)
    const attributeArtifactRegex = /\b(?:data-[a-z0-9_-]+|positionpattern|toolbar|formatter|handler)\s*=\s*"(?:[^"\\]|\\.)*"/gi;
    cleaned = cleaned.replace(attributeArtifactRegex, '');

    // 5. Strip broken HTML-like fragments that often remain after stripping attributes
    const bracketArtifactRegex = /<(?:table|tbody|tr|td|p|div|span|font|colgroup|col)\b[^>]*?(?:data-|positionpattern|toolbar|formatter|handler)\s*=[^>]*?>/gi;
    cleaned = cleaned.replace(bracketArtifactRegex, '');

    // 6. Final Cleanup: Remove stray closing brackets that often follow attribute junk at the start
    // UNLESS it looks like a math operator or placeholder start (followed by space and alphanumeric)
    cleaned = cleaned.replace(/^\s*(?:&gt;|>)(?!\s*[\w\u00C0-\u017F])/, '');

    // 7. Repair double-encoded tags (e.g. &amp;lt;dir&amp;gt; -> <dir>)
    cleaned = cleaned.replace(/&amp;(?:lt|gt);/gi, (match) => match.toLowerCase() === '&amp;lt;' ? '&lt;' : '&gt;');

    // Remove basic comments (safer here)
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");

    // Remove <br type="_moz"> artifacts which are common in rich text editors
    cleaned = cleaned.replace(/<br\s+type="_moz"\s*\/?>/gi, "");

    // Remove text-encoded HR artifacts
    cleaned = cleaned.replace(/&lt;hr\s*\/?>/gi, "");

    // Remove Ginger extension artifacts (iframes/divs)
    cleaned = cleaned.replace(/&lt;iframe[^&]*ginger-extension[^&]*&gt;/gi, "");
    cleaned = cleaned.replace(/<iframe[^>]*ginger-extension[^>]*>/gi, "");

    // Remove encoded or real Angular artifacts like <source-footnote...> or &lt;source-footnote...&gt; immediately
    // Broaden regex to handle more variations and nested structures, stopping at the first > or &gt;
    // Also covers qb-div, chat-app, etc. if they appear in this pattern
    cleaned = cleaned.replace(/(?:<|&lt;)\/?(?:source|sources|qb-div|chat-app|side-navigation-v2|bard-sidenav-container|bard-sidenav-content|chat-window|immersive-panel|learning-immersive-panel|activity-set|question)[\s\S]*?(?:>|&gt;)/gi, "");

    // 8. Tag Healing: Convert escaped tags (like &lt;strong&gt;) back to real tags
    // CRITICAL: We only heal OPENING tags to prevent orphaned closing tags like </p> from leaking
    // EXCEPTION: We allow healing CLOSING tags for known safe inline formatting to prevent broken bold/strong ranges.
    // Matches patterns like &lt;B&gt; or &lt;span style="..."&gt;, but NOT &lt;/p&gt;
    // We use (?:(?!&gt;).)*? for attributes to allow ANYTHING until the closing &gt; without consuming it
    // Updated whitelist to include iframe, article, section, div, p and allow technical prefixes like mat-, chat-, ng-
    // Improved attribute matching to handle spaces before the closing &gt; more reliably
    const tagHealingRegex = /&lt;(\/?)((?:B|STRONG|I|EM|U|S|STRIKE|SUB|SUP|HR|BR|ARTICLE|SECTION|DIV|P|LABEL|LEGEND|FIELDSET|IFRAME|SPAN|OL|UL|LI|BLOCKQUOTE|A|TABLE|TBODY|THEAD|TFOOT|TR|TH|TD|CODE|PRE|H[1-6]|CHAT-[A-Z0-9-]+|MAT-[A-Z0-9-]+|NG-[A-Z0-9-]+|IMG|FONT)\b)((?:\s+(?:(?!&gt;).)*?)?)&gt;/gi;
    cleaned = cleaned.replace(tagHealingRegex, (match, slash, tagName, attrs) => {
        const lower = tagName.toLowerCase();
        const isTechnical = options.isTechnical ?? false;

        // Structural elements should NOT be healed if they are lone closing tags in technical content
        // to prevent them from being stripped by Cheerio or stability loops.
        const structuralTags = ['p', 'div', 'ul', 'ol', 'li', 'tr', 'td', 'th', 'table', 'tbody', 'thead', 'tfoot'];
        if (slash && isTechnical && structuralTags.includes(lower)) {
            return match;
        }

        // KEYGEN, CANVAS and other specific technical snippets should NOT be healed in technical context
        // if they would just be removed as junk later.
        if (isTechnical && ['keygen', 'canvas'].includes(lower)) {
            return match;
        }

        const safeClosingTags = ['b', 'strong', 'i', 'em', 'u', 's', 'strike', 'span', 'small', 'mark', 'sub', 'sup', 'article', 'section', 'div', 'p', 'label', 'legend', 'fieldset', 'font', 'center', 'aside', 'header', 'footer', 'main', 'nav'];
        if (slash) {
            return safeClosingTags.includes(lower) ? he.decode(match) : match;
        }

        // Special check for ambiguous layout/code tags (A, DIV, P, SPAN)
        // If these appear without "rich" attributes in a technical context, they are likely code snippets.
        // We only heal them if they look like layout/formatting (style, class, href, src, face, align).
        if (['a', 'div', 'p', 'span'].includes(lower)) {
            const hasRichAttr = /(?:style|class|href|src|face|align|width|height)\s*=/i.test(attrs || "");
            const looksLikeCode = /(?:id|name|type|value|onClick|onMouse)\s*=/i.test(attrs || "");

            // If it has NO attributes, assume it's code (e.g. "Use the <a> tag") unless it's a known non-empty container we want?
            // Actually, bare <a> is useless as a link. Bare <p> is okay but rare as encoded.
            if (!attrs || !attrs.trim()) {
                return match; // Keep as &lt;a&gt;
            }

            // If it has code-like attributes, keep it escaped
            if (looksLikeCode) {
                return match;
            }

            // If it strictly has rich attributes, heal it
            if (hasRichAttr) {
                return `<${tagName}${attrs || ""}>`;
            }

            // Default: if we are unsure, and it's technical, tend to preserve.
            if (isTechnical) return match;
        }

        // Return opening tag
        return `<${tagName}${attrs || ""}>`;
    });

    return cleaned;
}

// ... (rest of file)


export function cleanHtml(text: string, options: CleanHtmlOptions = {}): string {
    if (!text) return "";

    // Generate cache key from input + options hash to ensure correctness
    const optionsKey = `${options.isTechnical}|${options.isExplanation}|${options.university}|${options.applyTechnicalLogic}|${options.normalizePlaceholders}|${options.normalizeUnicode}`;
    const cacheKey = createHash('sha1').update(text + optionsKey).digest('hex');

    // Check cache first
    if (cleanHtmlCache.has(cacheKey)) {
        return cleanHtmlCache.get(cacheKey)!;
    }

    const useTechnicalLogic = options.applyTechnicalLogic ?? options.isTechnical ?? false;

    // --- PRE-PROCESSING ---
    // Protect #include <...> or #include &lt;...&gt; directives IMMEDIATELY before any decoding
    // We use a strict content match (word chars + dots + hyphens) to avoid matching </p> or other structural tags.
    text = text.replace(/#include\s*(?:&lt;|<)([\w\.\/-]+)(?:&gt;|>)/gi, (match, content) => `#include &lt;${content.trim()}&gt;`);

    // Use repairText for basic normalization (spaces, dashes, dots)
    // Pass down the normalization preferences (default to false to focus on errors)
    let cleaned = repairText(text, {
        stripLoneBr: true,
        normalizePlaceholders: options.normalizePlaceholders ?? false,
        normalizeUnicode: options.normalizeUnicode ?? false,
        isTechnical: useTechnicalLogic
    });

    // 1. Markdown Support
    // Convert **bold** strictly in:
    // - Explanations
    // - Non-technical courses
    // - Anadolu university content
    // - 'alistirma-sorulari' source
    const allowBold = options.isExplanation ||
        !options.isTechnical ||
        options.university === 'anadolu' ||
        options.source === 'alistirma-sorulari';

    if (allowBold) {
        cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    }
    // STOP: NO italics (*) or underscores (_) supported to protect math formulas and snake_case

    // Protect common keyboard keys in angle brackets (e.g. <SHIFT>, <CTRL>)
    cleaned = cleaned.replace(/<(SHIFT|CTRL|ALT|ESC|ENTER|TAB|F\d+|HOME|END|PGUP|PGDN|SPACE|BACKSPACE)>/gi, '&lt;$1&gt;');

    // Protect PHP tags from being interpreted as processing instructions
    cleaned = cleaned.replace(/<\?php/gi, '&lt;?php');
    cleaned = cleaned.replace(/\?>/g, '?&gt;');

    // Protect linguistic formulas containing + (e.g. <urug+ın+dın>)
    // Restricted to simple word-like segments to avoid catching <img> with base64
    cleaned = cleaned.replace(/<([a-zA-Z0-9şıöçğüÜİÖÇĞŞ]+\+[a-zA-Z0-9şıöçğüÜİÖÇĞŞ\+]*)>/gi, '&lt;$1&gt;');

    // Remove invisible control characters (DEL U+007F)
    cleaned = cleaned.replace(/\x7F/g, '');

    // 145: Protect mathematical notation and linguistic formulas (e.g. AR<AVC, <urug+ın)
    // 146: We escape '<' only if it's NOT followed by a valid white-listed HTML tag
    // 147: We ALSO check for junk tags and tags to unwrap so they reach Cheerio as tags
    const TO_UNWRAP = ['dir', 'font', 'center', 'o:p'];
    const JUNK_TAGS_LOCAL = ['button', 'svg', 'canvas', 'script', 'style', 'audio', 'video', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'option', 'fieldset', 'legend', 'datalist', 'output', 'meta', 'colgroup', 'col', 'xml', 'mat-icon', 'chat-app', 'side-navigation-v2', 'bard-sidenav-container', 'bard-sidenav-content', 'chat-window', 'immersive-panel', 'learning-immersive-panel', 'activity-set', 'question', 'main', 'source-footnote', 'source-inline-chip', 'sources-carousel', 'qb-div'];

    // Escape tags that are NOT in allowed whitelist or known special lists
    // This protects SQL-like placeholders and math inequalities from being parsed as tags by Cheerio
    cleaned = cleaned.replace(/<([a-zA-Z0-9+_:-]+)\b/g, (match, tagName) => {
        const lowerTag = tagName.toLowerCase();
        const isTechnical = options.isTechnical ?? false;

        if (ALLOWED_TAGS.has(lowerTag) ||
            TO_UNWRAP.some(t => lowerTag.startsWith(t)) ||
            JUNK_TAGS_LOCAL.includes(lowerTag) ||
            lowerTag.startsWith('mat-') || lowerTag.startsWith('chat-') || lowerTag.startsWith('ng-')) {

            // In technical contexts, we should escape tags that would otherwise be removed as junk
            // unless they are explicitly allowed formatting tags.
            if (isTechnical && JUNK_TAGS_LOCAL.includes(lowerTag) && !ALLOWED_TAGS.has(lowerTag)) {
                return "&lt;" + tagName;
            }

            // Special Case: In technical contexts, 'del', 's', 'strike', 'ins' often appear in code examples (like HTML tags)
            // If they are in the allowed list but we are in technical mode, we might want to escape them if they look like code
            // But since they are formatting tags, we usually keep them.
            // HOWEVER, based on diffs, <del>metin</del> is being stripped or rendered.
            // If the user wants to see <del> literally, it should have been escaped in source or we need robust detection.
            // Let's rely on the JUNK protection above for now, and add specific technical escapes below.
            return match;
        }
        return "&lt;" + tagName;
    });

    // Also escape closing tags for the same set if opening tags were escaped
    cleaned = cleaned.replace(/<\/([a-zA-Z0-9+_:-]+)\b/g, (match, tagName) => {
        const lowerTag = tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(lowerTag) &&
            !TO_UNWRAP.some(t => lowerTag.startsWith(t)) &&
            !['mat-', 'chat-', 'ng-'].some(p => lowerTag.startsWith(p))) {
            return "&lt;/" + tagName;
        }
        return match;
    });

    // 2. Identify and handle encoded artifacts immediately but safely
    // Broaden logic to handle both style AND class artifacts (Tailwind, AI containers, rich text snippets)
    // We target common property markers like left, top, font-family, background-color, color, transform, position, min-h-, text-message
    const artifactProperties = 'left|top|font-family|background-color|color|transform|position|min-h-|text-message|flex|items-start|whitespace-pre-wrap';
    const encodedArtifactRegex = new RegExp(`&lt;(?:span|div|p)\\s+[^&gt;]*(?:style|class)=[^&gt;]*?(?:${artifactProperties})[:=][^&gt;]*?&gt;([\\s\\S]*?)&lt;\\/(?:span|div|p)&gt;`, 'gi');
    cleaned = cleaned.replace(encodedArtifactRegex, '$1');

    // Also catch unclosed or truncated encoded artifacts (very common in some raw extractions)
    // We consume everything from the trigger until the next encoded tag or the end of the string
    cleaned = cleaned.replace(new RegExp(`&lt;(?:span|div|p)\\s+[^&lt;&gt;]*(?:style|class)=[^&lt;&gt;]*?(?:${artifactProperties})[:=][\\s\\S]*?(?=&lt;|$)`, 'gi'), '');

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
    // (Moved to iterative loop loop below to handle nested artifacts)

    // 2. Handle o:p and legacy wrappers
    root.find('*').each((_, el) => {
        const tagName = el.tagName.toLowerCase();
        if (tagName.startsWith('o:') || tagName === 'dir' || tagName === 'font' || tagName === 'center') {
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
        const firstLi = $el.find('li').first();
        const firstText = firstLi.text().trim();

        // Detect Roman numerals (e.g. I., II., III.)
        const isRoman = /^[IVXLCDM]+\b[\.\-\)]/i.test(firstText) || /list-style-type:\s*upper-roman/i.test(style);
        const isLowerRoman = /^[ivxlcdm]+\b[\.\-\)]/.test(firstText) || /list-style-type:\s*lower-roman/i.test(style);

        if (isRoman) {
            $el.attr('type', 'I').removeAttr('style');
            // Clean up the markers if they are hardcoded in the text
            $el.find('li').each((_, li) => {
                const $li = $(li);
                let t = $li.html() || '';
                // Only strip if it's at the very start
                // t = t.replace(/^\s*(?:&nbsp;|\s)*([IVXLCDM]+)\s*[\.\-\)]\s*(?:&nbsp;|\s)*/i, '');
                $li.html(t);
            });
        } else if (isLowerRoman) {
            $el.attr('type', 'i').removeAttr('style');
            $el.find('li').each((_, li) => {
                const $li = $(li);
                let t = $li.html() || '';
                // t = t.replace(/^\s*(?:&nbsp;|\s)*([ivxlcdm]+)\s*[\.\-\)]\s*(?:&nbsp;|\s)*/, '');
                $li.html(t);
            });
        }
    });

    // Handle alpha lists (A., B., C.) if they appear as ol
    root.find('ol:not([type])').each((_, el) => {
        const $el = $(el);
        const firstText = $el.find('li').first().text().trim();
        if (/^[a-e]\s*[\.\-\)]/i.test(firstText)) {
            $el.attr('type', 'A');
            $el.find('li').each((_, li) => {
                const $li = $(li);
                let t = $li.html() || '';
                // t = t.replace(/^\s*(?:&nbsp;|\s)*([a-e])\s*[\.\-\)]\s*(?:&nbsp;|\s)*/i, '');
                $li.html(t);
            });
        }
    });

    // 6. Unwrap Layout Containers (Table, Div, Span, P, Article, Section, etc.)
    // We want to preserve their textual content but remove the container if it's just layout
    // We iterate until stable (max 15 iterations) to handle deep nesting
    // Unwrapped tags: tags where we keep the content but remove the tag
    const layoutTags = ['table', 'tbody', 'tr', 'td', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'header', 'footer', 'ul', 'ol', 'dir', 'font', 'center', 'article', 'section', 'a', 'legend', 'fieldset', 'datalist', 'output', 'main'];

    // Junk tags: tags where we remove the tag AND its content
    // We target common UI artifacts and metadata
    const junkTags = [
        'button', 'svg', 'canvas', 'script', 'style', 'audio', 'video', 'iframe', 'object', 'embed',
        'form', 'input', 'textarea', 'select', 'option',
        'meta', 'colgroup', 'col', 'xml', 'head', 'title', 'link',
        'mat-icon', 'chat-app', 'side-navigation-v2', 'bard-sidenav-container', 'bard-sidenav-content',
        'chat-window', 'immersive-panel', 'learning-immersive-panel', 'activity-set', 'question',
        'source-footnote', 'source-citation', 'source-inline-chip', 'source-inline-chips', 'sources-carousel-inline'
    ];

    // 0. Remove junk tags GLOBALLY (entire document) before we narrow to body
    junkTags.forEach(tag => {
        $.root().find(tag).remove();
    });
    // Target specific classes for iframes/other junk that might bypass tag name check
    $.root().find('.ginger-extension-definitionpopup').remove();
    $.root().find('.ginger-extension-single-word').each((_, el) => {
        const $el = $(el);
        $el.replaceWith($el.html() || "");
    });

    // Nested List Flattening: Convert nested lists to line breaks within parent LI
    // This handles the case where I. II. III. are nested but should be flat.
    $('li').each((_, li) => {
        const $li = $(li);
        $li.find('ul, ol').each((_, nested) => {
            const $n = $(nested);
            const items: string[] = [];
            $n.find('li').each((_, nli) => {
                const content = $(nli).html() || "";
                if (content.trim()) items.push(content);
            });
            if (items.length > 0) {
                $n.replaceWith('<br/>' + items.join('<br/>'));
            } else {
                $n.remove();
            }
        });
    });

    // Root-level List Flattening: If the entire content is a single-item list, unwrap it.
    // Especially common in options fields.
    // SKIP if technical content or explanation, where structure matters.
    const rootNodes = $.root().children();
    if (!options.isTechnical && !options.isExplanation && rootNodes.length === 1 && ['ul', 'ol'].includes(rootNodes[0].tagName?.toLowerCase())) {
        const $list = $(rootNodes[0]);
        if ($list.find('> li').length === 1) {
            const $li = $list.find('> li');
            $list.replaceWith($li.html() || "");
        }
    }

    let stable = false;
    let iterations = 0;
    while (!stable && iterations < 15) {
        let changed = false;

        layoutTags.forEach(tag => {
            root.find(tag).each((_, el) => {
                const $el = $(el);

                // Table/Cell/List Handling: unwrap layout-only containers
                if (['table', 'tbody', 'tr', 'td', 'ul', 'ol'].includes(tag)) {

                    // 1. Single-item List Check (Priority 1)
                    // We unwrap single items to avoid nested structures for one-liners
                    // Aggressive unwrap for non-explanations (likely options)
                    const isSingleItemList = ['ul', 'ol'].includes(tag) && $el.find('li').length === 1;
                    if (isSingleItemList) {
                        if (tag === 'ol') {
                            // Smart Unwrapping: Preserve semantics by prepending marker if missing
                            const startVal = $el.attr('start');
                            const typeVal = $el.attr('type');
                            const $li = $el.find('li');
                            const text = $li.text().trim();

                            if (startVal && startVal !== '0') {
                                const num = parseInt(startVal, 10);
                                if (!isNaN(num) && !text.startsWith(`${num}.`)) {
                                    $li.prepend(`${num}. `);
                                }
                            } else if (typeVal === 'A' || typeVal === 'I') {
                                // Simple heuristic for A/I, assuming 1st item
                                const marker = typeVal === 'A' ? 'A.' : 'I.';
                                if (!text.match(/^[A-Z][\.\)]/i) && !text.startsWith(marker)) {
                                    // Only prepend if strictly missing, to avoid "A) A. Text"
                                    // Actually, usually A) is present. If not, safe to add.
                                }
                            }
                        }

                        $el.find('li').replaceWith($el.find('li').contents());
                        $el.replaceWith($el.contents()); // Unwrap the list tag too
                        changed = true;
                        return;
                    }

                    // 2. Flatten Multi-item Semantic Lists (Priority 2)
                    // PRESERVE OL with start/type attributes (Semantic Lists), BUT allow unwrapping if start="0" (junk)
                    if (tag === 'ol') {
                        const startVal = $el.attr('start');
                        const hasType = !!$el.attr('type');

                        // User Request: Flatten lists with 'start' attribute (e.g. start="2" -> "2. Text")
                        // Also treat start="0" as junk wrapper (unwrap without prefix)
                        if (startVal) {
                            const startNum = parseInt(startVal, 10);
                            if (!isNaN(startNum)) {
                                // Flatten logic
                                const $lis = $el.find('li');
                                $lis.each((i, li) => {
                                    const $li = $(li);
                                    // Threshold: if startNum is very high (e.g. > 100), it's likely a question/section marker rather than a list
                                    // Prepend number if > 0 AND reasonable for a list
                                    if (startNum > 0 && startNum < 100) {
                                        const liText = $li.text().trim();
                                        if (!liText.startsWith(`${startNum + i}.`)) {
                                            $li.prepend(`${startNum + i}. `);
                                        }
                                    }

                                    // Add separator if not last item
                                    if (i < $lis.length - 1) {
                                        $li.append('<br/>');
                                    }
                                    $li.replaceWith($li.contents());
                                });
                                $el.replaceWith($el.contents());
                                changed = true;
                                return;
                            }
                        }

                        // Fallback: Preserve semantic lists with 'type' (e.g. I. II. A. B.)
                        if (hasType) {
                            return; // Do NOT unwrap semantic lists
                        }
                    }

                    const parentTable = $el.closest('table');

                    // 1. Artifact Check: If it's a tbody/tr/td but its parent table was already removed
                    if (!parentTable.length && ['tbody', 'tr', 'td'].includes(tag)) {
                        $el.replaceWith($el.contents());
                        changed = true;
                        return;
                    }

                    // 2. Metadata Check: If the table has layout-only attributes
                    const attrs = Object.keys(el.attribs || {}).join(' ');
                    const parentAttrs = parentTable.length ? Object.keys(parentTable.attr() || {}).join(' ') : '';

                    const isLayoutChild = parentTable.attr('id')?.includes('question-table') ||
                        parentTable.attr('class')?.includes('table-light') ||
                        /pattern|toggle|url|action|toolbar/i.test(parentAttrs);

                    const isLayoutTable = $el.attr('id')?.includes('question-table') ||
                        $el.attr('class')?.includes('table-light') ||
                        ($el.is('table') && $el.find('td').length <= 1) ||
                        isLayoutChild ||
                        /pattern|toggle|url|action|toolbar|visible|view|formatter|handler/i.test(attrs);

                    if (!isLayoutTable) return;
                }

                // When unwrapping block elements, ensure we don't merge text
                // But avoid adding excessive BRs if one exists nearby
                if (['p', 'div', 'header', 'footer', 'section', 'article'].includes(tag)) {
                    // Safety check: Ensure element is still attached before checking siblings
                    if (el.parentNode) {
                        try {
                            if (!$el.prev().is('br')) $el.before('<br/>');
                            if (!$el.next().is('br')) $el.after('<br/>');
                        } catch (e) {
                            // Ignore traversal errors on corrupt nodes
                        }
                    }
                }
                $el.replaceWith($el.contents());
                changed = true;
            });
        });

        if (!changed) stable = true;
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

        const isListMarker = /^([•\-–—]|[IVXivx]+\.|[0-9]+[\.\-]|\([0-9]+\)|\([a-zA-Z]\)\s|[a-zA-Z]\.\s)/.test(nextText);
        const startsWithUppercase = /^[A-ZÇĞİÖŞÜÂÎÛ]/.test(nextText) && !/^[a-zçğıöşüâîû]/.test(nextText);
        const isMidSentence = /[a-zA-ZçğıöşüİĞÜÖŞçâîûÂÎÛ0-9,;:\)\s]$/.test(prevText) &&
            (/^[a-zçğıöşüâîû]/.test(nextText) || nextText.startsWith('('));
        const inTable = $br.closest('table').length > 0;

        // In explanation text, we want to preserve structure more aggressively, especially manual lists
        const aggressiveMerge = !options.isExplanation && !options.preserveCode && !options.isTechnical;

        if (aggressiveMerge && !inTable && !isListMarker && !startsWithUppercase && isMidSentence && prev && prev.type === 'text' && next && next.type === 'text') {
            prev.data = prevTextRaw.trimEnd() + ' ';
            next.data = nextTextRaw.trimStart();
            $br.remove();
        } else {
            if (prev && prev.type === 'text') prev.data = prev.data.trimEnd();
            if (next && next.type === 'text') next.data = next.data.trimStart();
        }
    });

    // Whitelist
    const whitelist = ALLOWED_TAGS;

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
            // Allow form element attributes for technical courses
            if (['input', 'keygen', 'form', 'select', 'option', 'textarea', 'label'].includes(tag) &&
                ['type', 'name', 'value', 'action', 'method', 'for', 'placeholder', 'id'].includes(a)) return;
            // Allow MathML attributes
            if (['xmlns', 'display', 'mathvariant', 'stretchy', 'encoding', 'fence', 'separator', 'linethickness', 'open', 'close', 'actuate', 'show', 'alttext'].includes(a)) return;
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
            if (!tag || ['html', 'head', 'body', 'img', 'br', 'hr', 'input', 'select', 'textarea', 'keygen', 'form'].includes(tag)) return;

            const textContent = $el.text().trim();
            const hasProtected = textContent.includes('%%PROTECTED_BLOCK_');
            const hasContentTags = $el.find('img, br, hr, p, li, blockquote, input, select, textarea, keygen, form').length > 0;

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


    // Remove list tags that don't contain list items (invalid structure)
    root.find('ol, ul').each((_, el) => {
        const $el = $(el);
        if ($el.find('li').length === 0) {
            $el.replaceWith($el.contents());
        }
    });

    // List & Table Normalizations
    root.find('img').each((_, el) => { if (!$(el).attr('src')) { $(el).replaceWith(he.escape($.html(el))); } });
    root.find('a').each((_, el) => { if (!$(el).attr('href')) { $(el).replaceWith($(el).contents()); } });

    // Merge lists
    // Merge lists ONLY if they are strictly adjacent or separated by whitespace/BR
    root.find('ul, ol').each((_, el) => {
        const $el = $(el);
        if ($el.parent().length === 0) return;
        const tag = el.tagName.toLowerCase();

        // We need to check siblings manually to catch text nodes
        let nextNode = el.nextSibling;
        while (nextNode) {
            // Skip text nodes that are just whitespace
            if (nextNode.type === 'text' && !nextNode.data?.trim()) {
                nextNode = nextNode.nextSibling;
                continue;
            }
            // If BR, skip it (it's just partial formatting, we can merge across BR)
            if (nextNode.type === 'tag' && nextNode.tagName === 'br') {
                nextNode = nextNode.nextSibling;
                continue;
            }

            // If it's the same list tag, merge!
            if (nextNode.type === 'tag' && nextNode.tagName === tag) {
                const $next = $(nextNode);
                if (tag === 'ol' && $el.attr('type') !== $next.attr('type')) break;

                $el.append($next.contents());
                const nextToDel = nextNode;
                nextNode = nextNode.nextSibling; // Advance before removing
                $(nextToDel).remove();
                continue; // Continue checking for more
            }

            // If we hit anything else (text content, other tag), STOP merging
            break;
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
    // Only strip BR before UL/OL start, or after UL/OL end IF followed by another block
    // BUT we must be careful not to merge text.
    // Safest: Don't strip BR after list closing tags </ul>, </ol>, </li>.
    // List Spacing Cleanup: Remove BRs immediately BEFORE and AFTER lists
    // Pre-list BR removal
    result = result.replace(/(?:<br\s*\/?>\s*)+(<(?:ul|ol)\b[^>]*>)/gi, '$1');
    // Post-list BR removal
    result = result.replace(/(<\/(?:ul|ol)\b[^>]*>)(?:\s*<br\s*\/?>)+/gi, '$1');
    // Inside List Item BR removal (Leading/Trailing)
    // <li><br/>Text...</li> -> <li>Text...</li>
    result = result.replace(/<li\b[^>]*>\s*(?:<br\s*\/?>\s*)+/gi, (match) => match.replace(/<br\s*\/?>\s*/gi, ''));
    result = result.replace(/(?:<br\s*\/?>\s*)+<\/li>/gi, '</li>');

    // Table Cell Cleaning: Strip BR from start/end of TD/TH
    result = result.replace(/<(td|th)\b[^>]*>\s*(?:<br\s*\/?>\s*)+/gi, (match) => match.replace(/<br\s*\/?>\s*/gi, ''));
    result = result.replace(/(?:<br\s*\/?>\s*)+<\/(td|th)>/gi, '</$1>');

    // Remove empty Blockquotes
    result = result.replace(/<blockquote>\s*(?:<br\s*\/?>\s*)*<\/blockquote>/gi, '');

    // Sentence Repair: Remove BRs that break sentences (lowercase to lowercase)
    // e.g. "fonksiyonu<br/>olarak" -> "fonksiyonu olarak"
    // We utilize a look-behind and look-ahead pattern simulation via replace
    result = result.replace(/([a-zğüşıöç])\s*<br\s*\/?>\s*([a-zğüşıöç])/g, '$1 $2');

    // Self-close IMG
    result = result.replace(/<img([^>]*)>/gi, (match, attrs) => `<img ${attrs.trim()}/>`);

    // 2. Self-Deduplication (Moved BEFORE merge to prevent breaking Title+Explanation combos)
    // If it looks like "Text A <br/> Text A (longer)" or vice versa, keep only the longer one.
    if (options.isExplanation && result.includes('<br')) {
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

    // Merge adjacent formatting
    ['strong', 'b', 'i', 'em', 'u'].forEach(tag => {
        result = result.replace(new RegExp(`</${tag}>(\\s*|<br\\s*/>\\s*)<${tag}>`, 'gi'), (match, middle) => {
            // Merge but PRESERVE the whitespace/br content between them
            // e.g. "</strong> <strong>" -> " " (effectively "<strong>... ...</strong>")
            return middle;
        });
        // Strict adjacency merge (no whitespace)
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

    result = result.replace(/^(<br\b[^>]*>|\s)+/i, '').replace(/(<br\b[^>]*>|\s)+$/i, '');

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

    while (/<br\s*\/?>[\s\xa0\n]*<br\s*\/?>/i.test(result)) {
        result = result.replace(/<br\s*\/?>[\s\xa0\n]*<br\s*\/?>/gi, '<br/>');
    }
    // Normalize <br /> to <br/> for consistency with tests
    result = result.replace(/<br\s+\/>/g, '<br/>');

    const finalResult = result.trim();

    // Store in cache
    if (cleanHtmlCache.size > CACHE_MAX_SIZE) {
        cleanHtmlCache.clear(); // Simple eviction to prevent bloat
    }
    cleanHtmlCache.set(cacheKey, finalResult);

    return finalResult;
}

/**
 * Extracts plain text from HTML, similar to browser's innerText.
 * Uses Cheerio for reliable DOM-based extraction without regex.
 */
export function toPlainText(html: string): string {
    if (!html) return "";

    // Replace <br> and other tags with a space
    let spaced = html.replace(/<[^>]+>/g, ' ');

    // Remove truncated tags at the end (e.g. "<span style="...)
    spaced = spaced.replace(/<[^>]*$/, '');

    return he.decode(spaced)
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

/**
 * Checks if two texts are substantially similar, useful for deduplication.
 * It handles cases where one text is a subset of another, or they differ only by
 * minor artifacts (like a missing link or extra whitespace).
 */
export function areTextsSimilar(t1: string, t2: string): boolean {
    if (!t1 || !t2) return false;

    t1 = t1.toLowerCase();
    t2 = t2.toLowerCase();

    // 1. Strict Inclusion (fastest) but safe for short texts
    // If one includes the other, check if they are roughly same length (e.g. > 50% overlap ratio)
    // This prevents "I" matching "II" or "cat" matching "catch".
    if (t1.includes(t2) || t2.includes(t1)) {
        // For very short texts, avoid partial word matches or slight diffs
        if (t1.length < 50 || t2.length < 50) {
            // Tokenize by splitting on any non-alphanumeric chars
            const tokenizer = (text: string) => text.toLowerCase().split(/[^a-z0-9şğüöçı]+/).filter(t => t.length > 0);

            const tokens1 = tokenizer(t1);
            const tokens2 = tokenizer(t2);

            const shortTokens = tokens1.length < tokens2.length ? tokens1 : tokens2;
            const longTokens = tokens1.length < tokens2.length ? tokens2 : tokens1;

            // If strict subset of tokens
            const allExist = shortTokens.every(st => longTokens.includes(st));

            // Even if all tokens exist, we must enforce a length ratio.
            const lenRatio = Math.min(t1.length, t2.length) / Math.max(t1.length, t2.length);
            if (allExist && lenRatio > 0.8) return true;

            // If tokens didn't match perfectly, fall back to high ratio
            return lenRatio > 0.95;
        }

        // For longer texts, we STILL need a ratio check to avoid matching "long paragraph" with "contained sentence"
        const lenRatio = Math.min(t1.length, t2.length) / Math.max(t1.length, t2.length);
        return lenRatio > 0.8;
    }

    // 2. Alphanumeric Inclusion (ignores punctuation/whitespace)
    const s1 = t1.replace(/[^a-z0-9şğüöçı]/g, '');
    const s2 = t2.replace(/[^a-z0-9şğüöçı]/g, '');

    // Safety check for empty strings after strip
    if (!s1 || !s2) return false;

    if (s2.includes(s1) || s1.includes(s2)) {
        const lenRatio = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
        return lenRatio > 0.9;
    }

    return false;
}

/**
 * Checks if a string is considered "garbage" or redundant (e.g. just an answer marker).
 */
export function isGarbage(s: string): boolean {
    if (!s) return true;
    if (s.includes('<img')) return false;
    if (s.includes('<hr')) return true;

    const plain = toPlainText(s).toLowerCase().trim();

    // 1. Minimum content check
    if (plain.length < 2) return true;

    // Technical content protection: if it contains tech symbols like <, >, &, /, it's likely content
    // PROTECT ARABIC/OTTOMAN TEXT
    if (/[\u0600-\u06FF]/.test(plain)) return false;

    if (/[<>&/\\{}[\]]/.test(plain) || s.includes('&lt;') || s.includes('&gt;') || s.includes('&amp;')) return false;

    // Check if it's a list item (e.g., "I- İş", "1. Test", "A) Option")
    const listPattern = /^([ivxIVX]+|[0-9]+|[a-eA-E])[\.\-\)]\s*.+/;
    if (listPattern.test(plain)) return false;

    // Numerical/short options (e.g. "100", "A", "10") should NOT be garbage if they are numbers or single characters
    if (plain.length < 5 && /^[a-e0-9\W]+$/.test(plain)) {
        // If it's a pure number or a-e choice letter, it's not garbage as it might be a short option
        if (/^\d+(\.\d+)*%?$/.test(plain) || /^[a-e]$/i.test(plain)) return false;
        return true;
    }

    // 2. Answer key markers (Entirely)
    // Matches "Doğru yanıt A", "C evrenseldir", "C şıkkıdır", etc.
    const markerRegex = /^(?:doğru\s*)?(?:yanıt|cevap|şık|seçene[kğ])(?:lar|ler)?\s*:?\s*[a-e](?:'|’)?(?:dır|dir|dur|dür|tır|tur|tir|tür|lar|ler)*(?:\s+(?:şık|seçenek|seçene[kğ]|cevap|yanıt)(?:lar|ler)?(?:ı|i|u|ü)?(?:dır|dir|dur|dür|tır|tur|tir|tür|lar|ler)*)?\.?$/;
    const englishMarkerRegex = /^(?:the\s+)?correct\s+answer\s+is\s+[a-e]\.?$/;
    if (markerRegex.test(plain) || englishMarkerRegex.test(plain)) return true;

    // 3. Page references
    const pageRegex = /^(?:sayfa|unit)\s*[:\-\s]*\d+$/;
    if (pageRegex.test(plain)) return true;

    // 4. Standalone noise fragments
    // Support plural everywhere: "seçenekleridir", "seçeneğidirler", "yanıtlarıdır"
    const noiseRegex = /^(?:şık|seçene[kğ]|cevap|yanıt)(?:lar|ler)?(?:ı|i|u|ü)?(?:dır|dir|dur|dür|tır|tur|tir|tür|lar|ler)*\.?$/;
    if (noiseRegex.test(plain)) return true;

    return false;
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
