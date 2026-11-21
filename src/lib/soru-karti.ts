// Question card markup (pure functions). The course page draws its cards in the browser from
// /ders/<uni>/<ders>/unite/<n>.json (src/scripts/soru-yukleyici.ts) with these functions, and the unit tests
// run them in Node. Class names, ids and data attributes are what the player, filters, discussion, topic drawer
// and print styles (src/styles/print.css) rely on: change them together.
import type { SoruKaydi } from "./unite-verisi";

export interface KartBaglam {
  unit: number;
  /** Topic names by topic number (the unit file's `konular`). */
  konular: Record<string, string>;
  /** Unit title for the "Kaynak" row of the record. */
  uniteBaslik?: string;
  /** /calisma/<ders>/ when the course has a study room: adds the "Anlatımda aç" link to the topic row. */
  calismaYolu?: string;
}

const KACIS: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => KACIS[c] as string);

const EXAM_LABEL: Record<string, string> = { vize: "Vize", final: "Final", butunleme: "Bütünleme", "tek-ders": "Tek Ders", "yaz-okulu": "Yaz Okulu", "uc-ders": "Üç Ders", mezuniyet: "Mezuniyet", genel: "" };
type Sinav = NonNullable<SoruKaydi["sinavlar"]>[number];
type SinavAlani = Pick<SoruKaydi, "year" | "examType" | "sinavlar" | "source">;

/** One exam can have several booklets (term or programme); show the exam once with its booklets. */
export function examLine(q: SinavAlani): string {
  const liste: Sinav[] = q.sinavlar?.length ? q.sinavlar : [{ year: String(q.year ?? ""), examType: q.examType ?? "genel" }];
  const gruplar = new Map<string, Set<string>>();
  for (const s of liste) {
    const ad = `${s.year} ${EXAM_LABEL[s.examType] ?? ""}`.trim();
    const k = gruplar.get(ad) ?? new Set<string>();
    if (s.kitapcik) k.add(s.kitapcik);
    gruplar.set(ad, k);
  }
  return [...gruplar].map(([ad, k]) => (k.size ? `${ad} (${[...k].join(", ")})` : ad)).join(", ");
}

/** Exam groups, newest first. */
export function sinavGruplari(q: SinavAlani): string[] {
  if (q.source !== "cikmis-soru" || !(q.sinavlar?.length || q.year)) return [];
  return examLine(q).split(", ").filter(Boolean).sort((a, b) => b.localeCompare(a, "tr"));
}

/** One-line summary of the record: newest exam and how many more. */
export function kunyeOzeti(q: SinavAlani): string {
  const g = sinavGruplari(q);
  if (g.length === 0) return q.source === "cikmis-soru" ? "Çıkmış soru" : "Alıştırma";
  const ilk = (g[0] as string).replace(/ \(.*\)$/, "");
  return g.length > 1 ? `${ilk} +${g.length - 1}` : ilk;
}

/** data-sinav: "2025-2026 final;2019-2020 vize" (filters read it). */
export function examKeys(q: SinavAlani): string {
  const kaynak: Sinav[] = q.sinavlar ?? (q.source === "cikmis-soru" && q.year ? [{ year: String(q.year), examType: q.examType ?? "genel" }] : []);
  return [...new Set(kaynak.map((s) => `${s.year} ${s.examType}`))].join(";");
}

/** "1.2.5" -> ["1.2 Ad", "1.2.5 Ad"]: names of the topic and its parents (the unit number itself has no name). */
export function konuYolu(bolum: string, konular: Record<string, string>): string[] {
  const parcalar = bolum.split(".");
  const yol: string[] = [];
  for (let i = 2; i <= parcalar.length; i++) {
    const no = parcalar.slice(0, i).join(".");
    const ad = konular[no];
    if (ad) yol.push(`${no} ${ad}`);
  }
  return yol;
}

export const KONTROL: Record<string, string> = {
  "cevap-celiskisi": "Kaynaklar bu soruda farklı şıkkı doğru gösteriyor.",
  "sik-farkli": "Bu soru kaynaklarda farklı şıklarla geçiyor.",
  "kaynak-celiskili": "Kaynak bu soruya farklı yerlerde farklı cevap vermiş.",
};

/** Id the discussion and explanation scripts share: content-<unit>-<index>. */
export const icerikKimligi = (unit: number, idx: number): string => `content-${unit}-${idx}`;

/** Details of the record, built when the reader opens it (the card carries only the summary line). */
export function kunyeAyrintiHtml(q: SoruKaydi, k: KartBaglam): string {
  const gruplar = sinavGruplari(q);
  const yol = q.section && k.konular[q.section] ? konuYolu(q.section, k.konular) : [];
  const satirlar: string[] = [];
  if (gruplar.length > 0) {
    satirlar.push(`<div class="soru-kunye-satir"><dt>${gruplar.length > 1 ? `${gruplar.length} sınavda çıktı` : "Sınav"}</dt><dd>${esc(gruplar.join(" · "))}</dd></div>`);
  }
  if (yol.length > 0 && q.section) {
    // Çalışma odası olan derslerde konu bağlantısı doğrudan anlatıma gider; çekmece küçük "Önizle" düğmesinde kalır
    const hedef = k.calismaYolu ? `${k.calismaYolu}?konu=${encodeURIComponent(q.section)}` : "";
    const rozet = `<span>${esc(yol.join(" › "))}</span><svg aria-hidden="true"><use href="#i-ileri"/></svg>`;
    const onizle = hedef ? ` <button type="button" class="q-anlatim q-onizle print:hidden" data-konu="${esc(q.section)}" aria-label="Konuyu önizle">Önizle</button>` : "";
    satirlar.push(
      `<div class="soru-kunye-satir"><dt>Konu</dt><dd>${hedef ? `<a class="q-konu" href="${esc(hedef)}">${rozet}</a>` : `<button type="button" class="q-konu" data-konu="${esc(q.section)}">${rozet}</button>`}${onizle}</dd></div>`,
    );
  }
  const unite = k.unit === 0 ? "Ünitesi belirlenmemiş" : `Ünite ${k.unit}${k.uniteBaslik ? ` ${esc(k.uniteBaslik)}` : ""}`;
  satirlar.push(
    `<div class="soru-kunye-satir"><dt>Kaynak</dt><dd>${q.source === "cikmis-soru" ? "Çıkmış soru" : "Alıştırma ve deneme"} · <a href="#unite-${k.unit}">${unite}</a></dd></div>`,
  );
  if (q.kontrol) {
    satirlar.push(
      `<div class="soru-kunye-satir" data-kontrol="${q.kontrol}"><dt class="text-warn">Kontrol edin</dt><dd>${KONTROL[q.kontrol] ?? ""} Soruyu ve cevabı kontrol edin.</dd></div>`,
    );
  }
  return `<dl class="soru-kunye-ayrinti">${satirlar.join("")}</dl>`;
}

/** The whole card of question number `idx` (0-based) in its unit. */
export function soruKartiHtml(q: SoruKaydi, idx: number, k: KartBaglam): string {
  const u = k.unit;
  const no = idx + 1;
  const konuVar = !!(q.section && k.konular[q.section]);
  const secenekler = q.options
    .map(
      (o) =>
        `<div class="option-item${o.key === q.correctAnswer ? " correct-option" : ""}" data-key="${esc(o.key)}" data-testid="option-${esc(o.key)}"><span class="option-key">${esc(o.key)}</span><div class="option-text">${o.text}</div></div>`,
    )
    .join("");
  const cid = icerikKimligi(u, idx);
  const aciklama = q.explanation
    ? `<div class="explanation-card explanation-box text-ink-muted text-sm leading-relaxed relative" data-explanation-id="exp-${u}-${idx}"><div class="aciklama-ust"><strong class="flex-1 text-ink font-semibold">Açıklama</strong><button type="button" class="q-ikon print:hidden" data-ikon="ses" data-seslendir aria-label="Açıklamayı seslendir"></button><button type="button" class="q-ikon print:hidden" data-ikon="sohbet" data-ai="ask" aria-label="Derse sor"></button><div class="ai-enrichment-controls hidden relative z-10"><button type="button" class="btn-ai-menu q-ikon" data-ikon="more" data-ai="menu" aria-label="Yapay zekâ işlemleri"></button></div></div><div class="explanation-content" id="${cid}">${q.explanation}</div></div>`
    : `<div class="explanation-card explanation-box aciklama-yok relative" data-explanation-id="exp-${u}-${idx}"><div class="explanation-content" id="${cid}"><button type="button" class="aciklama-yok-satir" data-ai="regenerate"><svg aria-hidden="true"><use href="#i-sohbet"/></svg><span>Açıklama yok · <b>Yapay zekâ ile açıkla</b></span><svg aria-hidden="true"><use href="#i-ileri"/></svg></button></div></div>`;
  const attrs = [
    `class="question-card"`,
    `id="question-${u}-${idx}"`,
    `data-unit="${u}"`,
    `data-id="${esc(q.id)}"`,
    q.section ? `data-konu="${esc(q.section)}"` : "",
    q.eski !== undefined ? `data-eski="${q.eski}"` : "",
    `data-source="${q.source}"`,
    `data-sinav="${esc(examKeys(q))}"`,
    `data-testid="question-card"`,
  ].filter(Boolean);
  return (
    `<div ${attrs.join(" ")}>` +
    `<header class="q-ust"><details class="soru-kunye"><summary><h3 class="soru-kunye-ozet"><span class="q-no">Soru ${no}</span><span class="soru-kunye-parca">${esc(kunyeOzeti(q))}</span>` +
    (konuVar ? `<span class="soru-kunye-parca">${esc(q.section as string)} ${esc(k.konular[q.section as string] as string)}</span>` : "") +
    (q.kontrol ? `<span class="soru-kunye-parca text-warn">kontrol edin</span>` : "") +
    `</h3><i class="soru-kunye-ok" aria-hidden="true"></i></summary></details>` +
    `<button type="button" class="q-ikon print:hidden" data-ikon="tartis" data-q-tartis aria-label="Soru ${no}: tartış ya da hata bildir"></button></header>` +
    `<div class="prose prose-invert max-w-none"><div class="question-text">${q.text}</div><h4 class="sr-only">Seçenekler</h4><div class="space-y-3 mb-6">${secenekler}</div>${aciklama}` +
    `<div class="answer-meta-card answer-metadata-box correct-answer-line"><p class="text-muted-theme text-sm leading-relaxed"><strong class="text-accent-ink uppercase tracking-wider mr-2">Doğru Cevap:</strong> <span class="font-bold">${esc(q.correctAnswer)}</span></p></div></div></div>`
  );
}
