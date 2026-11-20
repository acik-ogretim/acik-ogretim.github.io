/** Unit titles from official topic lists. AUZEF writes them in capitals ("TÜRKÇENİN SES OLAYLARI"),
 *  Anadolu writes "Title; subtopic; subtopic". Returns the title in Turkish title case and the subtopics. */
const KUCUK = new Set(["ve", "ile", "veya", "ya", "da", "de", "ki", "için", "gibi", "olarak", "bir"]);

export function trBaslikDuzen(s: string): string {
  const harf = s.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "");
  if (!harf || harf !== harf.toLocaleUpperCase("tr")) return s; // already mixed case
  return s
    .toLocaleLowerCase("tr")
    .split(/(\s+)/)
    .map((w, i) => (i > 0 && KUCUK.has(w) ? w : w.charAt(0).toLocaleUpperCase("tr") + w.slice(1)))
    .join("");
}

export function uniteBasligi(ham: string): { baslik: string; alt: string[] } {
  const parca = ham.split(/;\s*/).map((x) => x.trim()).filter(Boolean);
  const ilk = (parca.shift() ?? "").replace(/^(\d+\.\s*)?ünite\s*\d*\s*[:.-]\s*/i, "");
  return { baslik: trBaslikDuzen(ilk), alt: parca };
}

// Weekly plans list exam and review weeks among the topics ("Ara Sınav", "Final Sınavı Soru Çözümü-1", "Genel Tekrar").
// They are not units: keeping them shifts every later unit (week 8 "Öğrenme" is book unit 5).
const SINAV_HAFTASI = new RegExp(
  [
    String.raw`^\s*(\d+\s*[.-]?\s*)?(ara\s*sınav|arasınav|vize|final|finai|dönem\s*sonu|dönüm\s*sonu|dönem\s*soru|son\s*sınav|bütünleme|yarıyıl\s*sonu|genel\s*tekrar|konu\s*tekrar|tekrar|genel\s*değerlendirme|değerlendirme\s*$)`,
    String.raw`soru\s*çözüm`,
    String.raw`sınav(ına|a)?\s*hazırlık`,
    String.raw`sınav\s*öncesi`,
    String.raw`sınav\s*soru`,
    String.raw`tekrar(ı)?(\s|$)`,
    String.raw`genel\s*tekrar`,
    String.raw`tekrarlan`,
    String.raw`ders\s*değerlendirme`,
    String.raw`gözden\s*geçiril`,
    String.raw`sınav(ı)?\s*$`,
  ].join("|"),
  "i",
);

export function sinavHaftasiMi(baslik: string): boolean {
  // Lower-case in Turkish first: /ı/i does not match "I" ("ARA SINAV")
  return SINAV_HAFTASI.test(baslik.toLocaleLowerCase("tr"));
}

/** One weekly-plan entry to a unit title: drops "3. Hafta –" prefixes, a leading "GİRİŞ•", bullet lists
 *  ("A• B" becomes "A; B") and long descriptions after the title. */
export function haftaBasligi(ham: string): string {
  let b = ham.replace(/^\s*\d+\s*\.?\s*hafta\s*[–:.-]\s*/i, "");
  const parca = b.split(/\s*•\s*/).map((x) => x.trim()).filter(Boolean);
  if (parca.length > 1 && /^giriş$/i.test(parca[0])) parca.shift();
  b = parca.join("; ");
  if (b.length > 90) b = b.split(/\s+-\s+|\s+Kitap:|(?<=[a-zçğıöşü])\.\s/)[0];
  // "Title: item, item, item." keeps the title; the list becomes subtopics
  const iki = b.match(/^([^:;]{6,80}):\s+(.+,.+)$/);
  if (iki) b = `${iki[1]}; ${iki[2].replace(/\.$/, "")}`;
  // Run-together syllabus text ("Title Giriş Subtopic Subtopic ...")
  if (b.length > 90 && /\sGiriş\s/.test(b)) b = b.split(/\sGiriş\s/)[0];
  return b.trim();
}

/** Drops exam/review weeks from an official weekly list, merges a unit taught over two weeks and numbers the
 *  remaining topics as units 1..n. Lists of learning outcomes ("ÖÇ-1") are not unit titles: returns []. */
export function haftalardanUniteler<T extends { no: number; baslik: string }>(konular: T[]): T[] {
  const out: T[] = [];
  for (const k of konular) {
    if (sinavHaftasiMi(k.baslik)) continue;
    const baslik = haftaBasligi(k.baslik);
    if (!baslik || out.at(-1)?.baslik === baslik) continue;
    out.push({ ...k, baslik });
  }
  if (out.some((k) => /^ÖÇ\s*-?\s*\d/i.test(k.baslik))) return [];
  return out.map((k, i) => ({ ...k, no: i + 1 }));
}
