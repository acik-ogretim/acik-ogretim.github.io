// Read-only course tools for the chat. They run in the browser and read the static /veri/*.json files.
import { toolDefinition } from "@tanstack/ai";
import { createFuse, normalizeTurkish } from "../search";
import { WRITING_RULES } from "./yazim-kurallari";

export interface CatalogCourse {
  key: string;
  name: string;
  code: string;
  semester: number;
  university: string;
  universityShort: string;
  department: string;
  url: string;
}
export interface ChatQuestion {
  id: string;
  unit: number;
  no: number;
  text: string;
  options: Record<string, string>;
  answer: string;
  explanation: string;
  source: string;
  year?: string | number;
  examType: string;
  /** Book topic number, e.g. "6.4.2" */
  konu?: string;
  url: string;
}
export interface Konu {
  no: string;
  baslik: string;
  duzey: number;
  sayfa: number;
  alt: Konu[];
}
export interface UniteKonulari {
  unite: number;
  baslik: string;
  bolumler: string[];
  pdf?: string;
  konular: Konu[];
}
export interface UnitSummary {
  unite: number;
  baslik: string;
  ozet: string;
  kavramlar: string[];
}
interface CourseData {
  course: { id: string; name: string; code: string; university: string; department: string; url: string };
  questions: ChatQuestion[];
  summaries?: UnitSummary[];
  konular?: UniteKonulari[];
}

const cache = new Map<string, Promise<unknown>>();
function getJson<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(path).then((r) => {
        if (!r.ok) throw new Error(`${path}: ${r.status}`);
        return r.json();
      }),
    );
  }
  return cache.get(path) as Promise<T>;
}
export const loadCatalog = () => getJson<CatalogCourse[]>("/veri/dersler.json");

async function loadCourse(key: string): Promise<CourseData> {
  const [uni, course] = String(key).split("/");
  if (!uni || !course) throw new Error(`Ders anahtarı "universite/ders" biçiminde olmalı: ${key}`);
  return getJson<CourseData>(`/veri/${encodeURIComponent(uni)}/${encodeURIComponent(course)}.json`);
}

const fuseByCourse = new Map<string, ReturnType<typeof createFuse<ChatQuestion & { _n: string }>>>();
export async function searchQuestions(key: string, query: string, unit?: number) {
  const data = await loadCourse(key);
  let fuse = fuseByCourse.get(key);
  if (!fuse) {
    const docs = data.questions.map((q) => ({
      ...q,
      _n: normalizeTurkish(`${q.text} ${Object.values(q.options).join(" ")} ${q.explanation}`),
    }));
    fuse = createFuse(docs, ["_n"], 0.45);
    fuseByCourse.set(key, fuse);
  }
  // Each word is searched on its own and the scores add up, so a long question still finds its topic.
  const words = normalizeTurkish(query).split(" ").filter((w) => w.length > 2);
  const score = new Map<string, { q: ChatQuestion; s: number }>();
  for (const w of words.length ? words : [normalizeTurkish(query)]) {
    for (const r of fuse.search(w, { limit: 60 })) {
      const prev = score.get(r.item.id);
      score.set(r.item.id, { q: r.item, s: (prev?.s ?? 0) + (1 - (r.score ?? 1)) });
    }
  }
  return [...score.values()]
    .filter((x) => unit === undefined || x.q.unit === unit)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.q);
}

/** The site's own answer record (quiz-player.ts): question anchor id -> last results, true = correct. */
export function progressKey(courseKey: string): string {
  const [uni, course] = courseKey.split("/");
  return `quiz-progress-${uni}-${course}`;
}
export const anchorOf = (q: Pick<ChatQuestion, "unit" | "no">) => `question-${q.unit}-${q.no - 1}`;
function readProgress(courseKey: string): Record<string, boolean[]> {
  try {
    return JSON.parse(localStorage.getItem(progressKey(courseKey)) ?? "{}");
  } catch {
    return {};
  }
}
/** Records an answer given in the chat, so the course page's "wrong answers" filter sees it too. */
export function recordAnswer(courseKey: string, q: Pick<ChatQuestion, "unit" | "no">, correct: boolean) {
  try {
    const all = readProgress(courseKey);
    all[anchorOf(q)] = [...(all[anchorOf(q)] ?? []), correct].slice(-2); // quiz-player keeps the last two
    localStorage.setItem(progressKey(courseKey), JSON.stringify(all));
  } catch {
    /* storage blocked: the answer is shown but not remembered */
  }
}

/** Flattens the book topic tree: no -> {baslik, sayfa, unite, pdf, ust (parent titles)} */
function konuDizini(data: CourseData) {
  const m = new Map<string, { no: string; baslik: string; sayfa: number; unite: number; pdf?: string; ust: string[] }>();
  for (const u of data.konular ?? []) {
    const gez = (k: Konu, ust: string[]) => {
      m.set(k.no, { no: k.no, baslik: k.baslik, sayfa: k.sayfa, unite: u.unite, pdf: u.pdf, ust });
      for (const a of k.alt) gez(a, [...ust, `${k.no} ${k.baslik}`]);
    };
    for (const k of u.konular) gez(k, [`Ünite ${u.unite}: ${u.baslik}`]);
  }
  return m;
}
const pdfSayfa = (pdf: string | undefined, sayfa: number) => (pdf ? `${pdf}#page=${sayfa}` : undefined);

const slim = ({ _n, ...q }: ChatQuestion & { _n?: string }) => q;
const clamp = (n: unknown, lo: number, hi: number, d: number) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d;
};

const courseKey = { type: "string", description: 'Ders anahtarı, "universite/ders" biçiminde (ör. "auzef/anne-baba-egitimi"). ders_bul sonucundaki key.' } as const;

export const courseTools = [
  toolDefinition({
    name: "ders_bul",
    description: "Sitedeki dersleri adından, kodundan, üniversitesinden ya da bölümünden bulur. Ders belli değilse önce bunu çağır.",
    inputSchema: { type: "object", properties: { sorgu: { type: "string", description: "Ders adı, kodu, üniversite ya da bölüm" } }, required: ["sorgu"] },
  }).server(async (args) => {
    const { sorgu } = args as { sorgu: string };
    const catalog = await loadCatalog();
    const fuse = createFuse(
      catalog.map((c) => ({ ...c, _n: normalizeTurkish(`${c.name} ${c.code} ${c.university} ${c.universityShort} ${c.department}`) })),
      ["_n"],
      0.4,
    );
    return fuse.search(normalizeTurkish(String(sorgu)), { limit: 8 }).map(({ item: { _n, ...c } }) => c);
  }),

  toolDefinition({
    name: "ders_bilgisi",
    description: "Bir dersin üniteleri, ünite başına soru sayısı ve soru türleri. Kaynak şimdilik sitenin soru bankası.",
    inputSchema: { type: "object", properties: { ders: courseKey }, required: ["ders"] },
  }).server(async (args) => {
    const { ders } = args as { ders: string };
    const data = await loadCourse(ders);
    const units = new Map<number, number>();
    const types = new Map<string, number>();
    for (const q of data.questions) {
      units.set(q.unit, (units.get(q.unit) ?? 0) + 1);
      types.set(q.source, (types.get(q.source) ?? 0) + 1);
    }
    return {
      ders: data.course,
      toplamSoru: data.questions.length,
      uniteler: [...units].sort((a, b) => a[0] - b[0]).map(([unite, soru]) => ({ unite, soru })),
      soruTurleri: Object.fromEntries(types),
      uniteBasliklari: (data.summaries ?? []).map((u) => ({ unite: u.unite, baslik: u.baslik })),
      kaynak: data.summaries?.length ? "soru bankası ve ünite özetleri" : "soru bankası",
    };
  }),

  toolDefinition({
    name: "soru_ara",
    description: "Bir dersin soruları, doğru cevapları ve açıklamaları içinde konuya göre arar. Cevap verirken buna dayan.",
    inputSchema: {
      type: "object",
      properties: {
        ders: courseKey,
        sorgu: { type: "string", description: "Aranan kavram ya da konu" },
        unite: { type: "number", description: "Yalnız bu ünite (isteğe bağlı)" },
        adet: { type: "number", description: "En çok kaç soru (varsayılan 10, en çok 20)" },
      },
      required: ["ders", "sorgu"],
    },
  }).server(async (args) => {
    const { ders, sorgu, unite, adet } = args as { ders: string; sorgu: string; unite?: number; adet?: number };
    const found = await searchQuestions(ders, String(sorgu), unite === undefined ? undefined : Number(unite));
    return found.slice(0, clamp(adet, 1, 20, 10)).map(slim);
  }),

  toolDefinition({
    name: "soru_getir",
    description: "Bir sorunun tamamını kimliğiyle getirir.",
    inputSchema: { type: "object", properties: { ders: courseKey, id: { type: "string" } }, required: ["ders", "id"] },
  }).server(async (args) => {
    const { ders, id } = args as { ders: string; id: string };
    const q = (await loadCourse(ders)).questions.find((x) => x.id === String(id));
    return q ?? { hata: "Bu kimlikte soru yok." };
  }),

  toolDefinition({
    name: "unite_sorulari",
    description: "Bir ünitenin sorularından örnek verir; ünite özeti ya da kendini sınama için.",
    inputSchema: {
      type: "object",
      properties: { ders: courseKey, unite: { type: "number" }, adet: { type: "number", description: "Varsayılan 15, en çok 40" } },
      required: ["ders", "unite"],
    },
  }).server(async (args) => {
    const { ders, unite, adet } = args as { ders: string; unite: number; adet?: number };
    const list = (await loadCourse(ders)).questions.filter((q) => q.unit === Number(unite));
    const n = clamp(adet, 1, 40, 15);
    const step = Math.max(1, Math.floor(list.length / n)); // spread across the unit instead of the first n
    return list.filter((_, i) => i % step === 0).slice(0, n);
  }),

  toolDefinition({
    name: "unite_ozeti",
    description: "Bir ünitenin ders kitabından hazırlanmış özetini ve anahtar kavramlarını verir. Konu anlatımı, kavram açıklaması ve ünite özeti için önce buna bak; yalnız özeti olan derslerde vardır.",
    inputSchema: { type: "object", properties: { ders: courseKey, unite: { type: "number" } }, required: ["ders", "unite"] },
  }).server(async (args) => {
    const { ders, unite } = args as { ders: string; unite: number };
    const data = await loadCourse(ders);
    const u = data.summaries?.find((x) => x.unite === Number(unite));
    if (u) return u;
    return data.summaries?.length
      ? { hata: "Bu ünitenin özeti yok.", uniteler: data.summaries.map((x) => x.unite) }
      : { hata: "Bu dersin ünite özetleri henüz yok. Sorulara ve açıklamalara dayan." };
  }),

  toolDefinition({
    name: "ilerlemem",
    description: "Öğrencinin bu dersteki kendi çözüm kaydı: kaç soru çözdü, kaçını yanlış yaptı, hangi ünitelerde zorlanıyor ve son yanlış yaptığı sorular. Zayıf konuları bulmak için kullan.",
    inputSchema: { type: "object", properties: { ders: courseKey }, required: ["ders"] },
  }).server(async (args) => {
    const { ders } = args as { ders: string };
    const data = await loadCourse(ders);
    const progress = readProgress(ders);
    const units = new Map<number, { cozulen: number; yanlis: number; toplam: number }>();
    const wrong: ChatQuestion[] = [];
    let solved = 0;
    for (const q of data.questions) {
      const u = units.get(q.unit) ?? { cozulen: 0, yanlis: 0, toplam: 0 };
      u.toplam++;
      const r = progress[anchorOf(q)];
      if (r?.length) {
        solved++;
        u.cozulen++;
        if (r.includes(false)) {
          u.yanlis++;
          wrong.push(q);
        }
      }
      units.set(q.unit, u);
    }
    const dizin = konuDizini(data);
    const zayif = new Map<string, number>();
    for (const q of wrong) if (q.konu) zayif.set(q.konu, (zayif.get(q.konu) ?? 0) + 1);
    return {
      toplamSoru: data.questions.length,
      cozulen: solved,
      yanlis: wrong.length,
      zayifKonular: [...zayif]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([no, n]) => {
          const k = dizin.get(no);
          return { konu: no, baslik: k?.baslik, unite: k?.unite, yanlisSayisi: n, kitapSayfasi: pdfSayfa(k?.pdf, k?.sayfa ?? 1) };
        }),
      uniteler: [...units].sort((a, b) => a[0] - b[0]).map(([unite, v]) => ({ unite, ...v })),
      yanlisSorular: wrong.slice(0, 15).map((q) => ({ id: q.id, unit: q.unit, no: q.no, konu: q.konu, konuBasligi: q.konu ? dizin.get(q.konu)?.baslik : undefined, text: q.text, answer: q.answer, url: q.url })),
    };
  }),

  toolDefinition({
    name: "konular",
    description: "Dersin kitabındaki numaralı konu ağacı: ünite başlıkları, konu ve alt konular (6.4, 6.4.2), sayfaları ve her konudaki soru sayısı. Bir ünitenin içeriğini ya da bir konunun yerini bulmak için kullan.",
    inputSchema: { type: "object", properties: { ders: courseKey, unite: { type: "number", description: "Yalnız bu ünite (isteğe bağlı)" } }, required: ["ders"] },
  }).server(async (args) => {
    const { ders, unite } = args as { ders: string; unite?: number };
    const data = await loadCourse(ders);
    if (!data.konular?.length) return { hata: "Bu dersin kitap konu ağacı henüz yok. ders_bilgisi ve unite_ozeti ile devam et." };
    const sayi = new Map<string, number>();
    for (const q of data.questions) if (q.konu) sayi.set(q.konu, (sayi.get(q.konu) ?? 0) + 1);
    const yaz = (k: Konu): unknown => ({ no: k.no, baslik: k.baslik, sayfa: k.sayfa, soru: sayi.get(k.no) || undefined, alt: k.alt.length ? k.alt.map(yaz) : undefined });
    return data.konular
      .filter((u) => unite === undefined || u.unite === Number(unite))
      .map((u) => ({ unite: u.unite, baslik: u.baslik, kitap: u.pdf, konular: u.konular.map(yaz) }));
  }),

  toolDefinition({
    name: "konu_anlat",
    description: "Bir konuyu anlatmak için gereken her şeyi toplar: konunun kitaptaki yeri ve üst başlıkları, alt konuları, ünite özetinden ilgili kısım, o konudan çıkmış sorular ve açıklamaları, kitap sayfası bağlantısı. Öğrenci 'şu konuyu anlat' ya da 'yanlış yaptığım konuyu anlat' deyince kullan; anlatımı bu malzemeye dayandır.",
    inputSchema: {
      type: "object",
      properties: {
        ders: courseKey,
        konu: { type: "string", description: 'Konu numarası (ör. "6.4.2"); bilinmiyorsa boş bırak ve sorgu ver' },
        sorgu: { type: "string", description: "Konu numarası bilinmiyorsa konunun adı ya da kavram" },
      },
      required: ["ders"],
    },
  }).server(async (args) => {
    const { ders, konu, sorgu } = args as { ders: string; konu?: string; sorgu?: string };
    const data = await loadCourse(ders);
    const dizin = konuDizini(data);
    let no = konu && dizin.has(String(konu)) ? String(konu) : undefined;
    if (!no && sorgu) {
      const fuse = createFuse([...dizin.values()].map((k) => ({ ...k, _n: normalizeTurkish(k.baslik) })), ["_n"], 0.4);
      no = fuse.search(normalizeTurkish(sorgu), { limit: 1 })[0]?.item.no;
      if (!no) no = (await searchQuestions(ders, sorgu)).find((q) => q.konu)?.konu;
    }
    if (!no) return { hata: "Konu bulunamadı. konular aracıyla numarasını bul.", konuAgaciVar: dizin.size > 0 };
    const k = dizin.get(no)!;
    const altlar = [...dizin.values()].filter((x) => x.no.startsWith(no + ".")).map((x) => `${x.no} ${x.baslik}`);
    const sorular = data.questions.filter((q) => q.konu === no || q.konu?.startsWith(no + "."));
    const ozet = data.summaries?.find((u) => u.unite === k.unite);
    return {
      konu: no,
      baslik: k.baslik,
      ustBasliklar: k.ust,
      altKonular: altlar,
      kitapSayfasi: pdfSayfa(k.pdf, k.sayfa),
      uniteOzeti: ozet ? { baslik: ozet.baslik, ozet: ozet.ozet, kavramlar: ozet.kavramlar } : undefined,
      sorular: sorular.slice(0, 12).map((q) => ({ id: q.id, text: q.text, dogru: q.options[q.answer], aciklama: q.explanation, sinav: q.source === "cikmis-soru" ? `${q.year ?? ""} ${q.examType}`.trim() : undefined, url: q.url })),
      toplamSoru: sorular.length,
    };
  }),

  toolDefinition({
    name: "belge_olustur",
    description: "Öğrenci kalıcı bir çalışma belgesi isteyince kullan: konu özeti, çalışma planı, tekrar kartları, kavram tablosu, sınav öncesi not. Belge sohbette indirilebilir ve yazdırılabilir bir kart olarak açılır; içeriği metinde ayrıca tekrar etme, yalnız bir cümleyle tanıt.",
    inputSchema: {
      type: "object",
      properties: {
        baslik: { type: "string", description: "Belgenin başlığı" },
        icerik: { type: "string", description: "Belgenin tamamı, Markdown (başlıklar, listeler, tablolar)" },
      },
      required: ["baslik", "icerik"],
    },
  }).server(async (args) => {
    const { baslik, icerik } = args as { baslik: string; icerik: string };
    return { baslik: String(baslik).slice(0, 120), icerik: String(icerik) };
  }),

  toolDefinition({
    name: "mini_sinav",
    description: "Sohbette çözülebilen şıklı bir mini sınav kartı açar. Öğrenci kendini sınamak, soru çözmek ya da yanlışlarını tekrar etmek isteyince kullan. Kart soruları kendisi gösterir; soruları metinde ayrıca yazma.",
    inputSchema: {
      type: "object",
      properties: {
        ders: courseKey,
        unite: { type: "number", description: "Yalnız bu ünite (isteğe bağlı)" },
        adet: { type: "number", description: "Soru sayısı, varsayılan 5, en çok 10" },
        yanlislarim: { type: "boolean", description: "Yalnız öğrencinin daha önce yanlış yaptığı sorular" },
      },
      required: ["ders"],
    },
  }).server(async (args) => {
    const { ders, unite, adet, yanlislarim } = args as { ders: string; unite?: number; adet?: number; yanlislarim?: boolean };
    const data = await loadCourse(ders);
    const progress = readProgress(ders);
    let pool = data.questions.filter((q) => unite === undefined || q.unit === Number(unite));
    if (yanlislarim) pool = pool.filter((q) => progress[anchorOf(q)]?.includes(false));
    const n = clamp(adet, 1, 10, 5);
    const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, n); // shortcut: unweighted shuffle, fine for a few questions
    return { ders, sorular: picked };
  }),
] as const;

export const QUIZ_TOOL = "mini_sinav";
export const DOC_TOOL = "belge_olustur";

export function systemPrompt(course: CatalogCourse | null): string {
  return [
    "Sen Açık Öğretim Portal'ın ders asistanısın. Açık öğretim öğrencilerine Türkçe, sade ve sıcak bir dille yardım edersin.",
    "Ders içeriği için araçları kullan: ders belli değilse ders_bul; dersin kitaptaki konu ağacı için konular; bir konuyu anlatmak için konu_anlat (yoksa unite_ozeti); soru ve açıklamalar için soru_ara, unite_sorulari, soru_getir; dersin yapısı için ders_bilgisi.",
    "Konu anlatırken konu_anlat'ın verdiği üst başlıklardan başla, kavramları sade dille açıkla, çıkmış sorulardan örnek ver ve sonunda kitap sayfası bağlantısını [Kitapta oku](bağlantı) olarak ekle.",
    "Öğrenci yanlış yaptığı konuları sorarsa ilerlemem aracının zayifKonular listesini konu numarası ve başlığıyla göster; isterse her birini konu_anlat ile anlat.",
    "Öğrenci özet, plan, not ya da kart gibi saklayacağı bir belge isterse belge_olustur ile yaz.",
    "Cevaplarını araçların döndürdüğü ünite özetlerine, sorulara, doğru cevaplara ve açıklamalara dayandır. Bulamazsan bunu söyle, uydurma.",
    "Doğru şıkkı söylemekle kalma, nedenini açıklama metninden anlat.",
    "Dayandığın soruları cevabın sonunda bağlantılarıyla göster: [Ünite 3 · Soru 12](url).",
    "Öğrenci kendini sınamak ya da soru çözmek isterse mini_sinav aracını kullan; kart soruları gösterir, sen yalnız kısa bir giriş cümlesi yaz.",
    "Öğrenci nerede zorlandığını, neye çalışması gerektiğini sorarsa ilerlemem aracıyla kendi kaydına bak ve ona göre plan öner.",
    course
      ? `Kullanıcı şu derste: ${course.name} (${course.university}, ${course.department}). Ders anahtarı: ${course.key}.`
      : "Kullanıcı henüz bir ders seçmedi.",
    "",
    WRITING_RULES,
  ].join("\n");
}
