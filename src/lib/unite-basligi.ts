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
