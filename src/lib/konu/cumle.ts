// Sentence splitting for read-aloud: pure, so the offsets that map a sentence back to the page text are testable.

export type Cumle = { bas: number; son: number };

// Words after which a full stop does not end a sentence.
const KISALTMA = new Set([
  "dr", "doç", "prof", "yrd", "öğr", "arş", "gör", "vb", "vs", "vd", "bkz", "örn", "yy", "no", "s", "ss", "çev", "ed", "sn", "mö", "ms", "bk", "krş", "ö.r",
]);

const BUYUK = /[\p{Lu}"“‘'(\[•\-–—\d]/u;

/** Splits text into sentences; returns [start, end) offsets into the original string. */
export function cumleleriBol(metin: string): Cumle[] {
  const sonuc: Cumle[] = [];
  const bitis = /[.!?…]+["”’')\]]*(?=\s)/g;
  let bas = 0;
  for (const m of metin.matchAll(bitis)) {
    const son = (m.index ?? 0) + m[0].length;
    const sonrasi = metin.slice(son).trimStart();
    if (!sonrasi || !BUYUK.test(sonrasi[0])) continue;
    const onceki = /([\p{L}.]+)\.+["”’')\]]*$/u.exec(metin.slice(Math.max(0, son - 20), son));
    const kelime = onceki?.[1]?.toLocaleLowerCase("tr") ?? "";
    if (m[0].startsWith(".") && !/[!?…]/.test(m[0]) && (KISALTMA.has(kelime) || /^\p{L}$/u.test(kelime))) continue;
    ekle(metin, bas, son, sonuc);
    bas = son;
  }
  ekle(metin, bas, metin.length, sonuc);
  return sonuc;
}

const UZUN = 320;

function ekle(metin: string, bas: number, son: number, hedef: Cumle[]): void {
  let b = bas;
  // Trim leading whitespace so highlights do not start on a space
  while (b < son && /\s/.test(metin[b])) b++;
  let s = son;
  while (s > b && /\s/.test(metin[s - 1])) s--;
  if (s <= b) return;
  // Very long sentences are cut at the last comma or space before the limit (speech engines stall on them)
  while (s - b > UZUN) {
    const pencere = metin.slice(b, b + UZUN);
    let kes = Math.max(pencere.lastIndexOf("; "), pencere.lastIndexOf(", "), pencere.lastIndexOf(": "));
    if (kes < UZUN / 2) kes = pencere.lastIndexOf(" ");
    if (kes <= 0) kes = UZUN;
    else kes += 1;
    hedef.push({ bas: b, son: b + kes });
    b += kes;
    while (b < s && /\s/.test(metin[b])) b++;
  }
  hedef.push({ bas: b, son: s });
}

/** What the voice should say: citations like "(Mouritsen, 2002:37-38)" are skipped, spaces collapsed. */
export function okunacakMetin(cumle: string): string {
  return cumle
    .replace(/\s*\[\d{1,3}\]/g, "") // footnote marks like [2]
    .replace(/\s*\([^()]*\b(?:1[5-9]|20)\d\d[^()]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
