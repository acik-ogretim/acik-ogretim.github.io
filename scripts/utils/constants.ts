export const ALLOWED_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 'img', 'br', 'table', 'tbody', 'thead', 'tr', 'th', 'td', 'ul', 'ol', 'li', 'form', 'html', 'head', 'body', 'header', 'footer', 'article', 'section', 'main', 'legend', 'fieldset']);

export const TO_UNWRAP = new Set(['div', 'header', 'footer', 'article', 'section', 'a', 'legend', 'fieldset', 'main', 'label', 'span']);

export const STRUCTURAL_TAGS = ['p', 'div', 'ul', 'ol', 'li', 'tr', 'td', 'th', 'table', 'tbody', 'thead', 'tfoot'];

export const SAFE_CLOSING_TAGS = ['b', 'strong', 'i', 'em', 'u', 's', 'strike', 'span', 'article', 'section', 'div', 'p', 'label', 'legend', 'fieldset'];

export const OCR_FIX_MAP: Record<string, string> = {
    'düşnür': 'düşünür',
    'doymanş': 'doymamış',
    'öğrencilern': 'öğrencilerin',
    'acilmüdahale': 'acil müdahale',
    'işletmecilii': 'işletmeciliği'
};

export const SYMBOL_MAP: Record<string, string> = {
    '': '~', '∼': '~', '': '&rArr;', '⇒': '&rArr;',
    '': '&hArr;', '⇔': '&hArr;', '': '&or;', '∨': '&or;',
    '': '&and;', '∧': '&and;', '': '&there4;', '∴': '&there4;',
    '': '&equiv;', '≡': '&equiv;', '': '&exist;', '∃': '&exist;',
    '': '&forall;', '∀': '&forall;', '': '&empty;', '': '&rarr;',
    '': '&bull;', '': '{', '': '}', '': ' ', '': '-', '': ' '
};
