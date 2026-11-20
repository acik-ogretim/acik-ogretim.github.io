// Readability rules applied after cleanHtml: they only add line breaks / underline or drop an
// option's own letter, and each rule has a guard so ordinary sentences are left untouched.
// Tests: scripts/tests/soru-bicim.test.ts (cases taken from real questions).

const ROMA = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

/** "A) Elton Mayo" -> "Elton Mayo" for option A. "A." only when every option starts "X." with its
 *  own letter ("A. Weber" style initials stay). */
export function secenekHarfleriniSil(secenekler: Record<string, string>): Record<string, string> {
  const anahtarlar = Object.keys(secenekler);
  const noktaHepsi =
    anahtarlar.length > 1 &&
    anahtarlar.every((k) => new RegExp(`^\\s*${k}\\.\\s`).test(secenekler[k] ?? ""));
  const sonuc: Record<string, string> = {};
  for (const k of anahtarlar) {
    let v = secenekler[k] ?? "";
    v = v.replace(new RegExp(`^\\s*\\(?${k}\\)\\s*`, "i"), "");
    if (noktaHepsi) v = v.replace(new RegExp(`^\\s*${k}\\.\\s*`), "");
    sonuc[k] = v.trim();
  }
  return sonuc;
}

/** Puts premises "I. … II. … III. …" on their own lines when they run inline. Only when the list
 *  starts at the beginning, after a line break, or after ":" "?" ";" and goes I, II, III in order
 *  ("I. Mehmet değil II. Mehmet" and "II. Dünya Savaşı" stay as they are). */
export function onculSatirlari(metin: string): string {
  for (const ayrac of ["\\.", "\\)", "-"]) {
    const desen = new RegExp(`(?:^|(?<=\\s)|(?<=>))(${[...ROMA].reverse().join("|")})${ayrac}\\s`, "g");
    const bulunan = [...metin.matchAll(desen)].map((m) => ({ konum: m.index ?? 0, r: m[1] }));
    const kesimler: number[] = [];
    let beklenen = 0;
    for (const b of bulunan) {
      if (b.r === ROMA[beklenen]) {
        kesimler.push(b.konum);
        beklenen++;
      }
    }
    if (kesimler.length < 2) continue;
    const once = metin.slice(0, kesimler[0]).trimEnd();
    if (once && !/(<br\s*\/?>|[:?;])$/.test(once)) continue;
    let sonuc = once && !/<br\s*\/?>$/.test(once) ? `${once}<br/>` : once;
    for (let i = 0; i < kesimler.length; i++) {
      let parca = metin.slice(kesimler[i], kesimler[i + 1] ?? metin.length);
      if (i < kesimler.length - 1) {
        parca = parca.trimEnd();
        if (!/<br\s*\/?>$/.test(parca)) parca += "<br/>";
      } else {
        // Question stem after the last premise ("… Yukarıdakilerden hangisi …?") goes to a new line
        parca = parca
          .replace(
            /([.;:!?])\s+(?=(?:Yukarıda|Buna göre|Bunlardan|Verilen|Bu bilgilere|Bu öncüllerden|Hangileri|Which|According)(?!<))/,
            "$1<br/>",
          )
          // no punctuation before the stem: break only before the unmistakable stem words
          .replace(/(?<![.;:!?>])\s+(?=Yukarıda(?:ki|kiler|kilerden|n|ki bilgilerden|ki ifadelerden|ki öncüllerden| verilen| sıralanan)\b)/u, "<br/>");
      }
      sonuc += parca;
    }
    return sonuc;
  }
  return metin;
}

// Negative endings of the last word of a question ("… hangisi … değildir?").
const OLUMSUZ_SOZ = /^(değildir|yanlıştır|yoktur|söylenemez|olamaz|hariçtir|dışındadır|bulunmamaktadır|beklenemez|gösterilemez|sayılamaz|denemez)$/i;

function olumsuzMu(sozcuk: string): boolean {
  const s = sozcuk.toLocaleLowerCase("tr");
  if (OLUMSUZ_SOZ.test(s)) return true;
  // -maz/-mez, -mamaktadır, -mamalıdır …; short words like "yaz", "kemer" are filtered by length
  return s.length >= 5 && /(?:maz|mez|mamaktadır|memektedir|mamalıdır|memelidir|mamıştır|memiştir)$/.test(s);
}

/** Underlines the negative word that ends a question: "… biri değildir?" -> "… biri <u>değildir</u>?"
 *  Only the last word before the final "?", only in a question that asks "hangi…/aşağıdaki…". */
export function olumsuzuVurgula(metin: string): string {
  const m = metin.match(/^(.*?)((?:<(?:strong|b|em|i)>)*)([\p{L}]+)((?:<\/(?:strong|b|em|i)>)*)(\s*\?\s*(?:<\/(?:strong|b|em|i)>)*\s*)$/su);
  if (!m) return metin;
  const [, onu, acilis, sozcuk, kapanis, son] = m;
  if (!olumsuzMu(sozcuk)) return metin;
  if (/<u>\s*$/.test(onu + acilis)) return metin;
  const sonCumle = onu.split(/<br\s*\/?>/).pop() ?? "";
  if (!/(hangi|aşağıdaki|yukarıdaki|verilen|which)/i.test(sonCumle)) return metin;
  return `${onu}${acilis}<u>${sozcuk}</u>${kapanis}${son}`;
}

/** Plain newlines do not show in HTML: turn them into <br/> (k1/k2 texts separate premises with \n). */
export function satirSonlari(metin: string): string {
  if (!metin.includes("\n")) return metin;
  return metin
    .replace(/\s*\r?\n\s*/g, "<br/>")
    .replace(/(?:<br\s*\/?>\s*){2,}/g, "<br/>")
    .replace(/^(?:<br\/>)+|(?:<br\/>)+$/g, "");
}

/** Rules applied to question texts (olumsuzuVurgula is kept but not applied by default). */
export function soruMetniBicimle(metin: string): string {
  return onculSatirlari(satirSonlari(metin));
}
