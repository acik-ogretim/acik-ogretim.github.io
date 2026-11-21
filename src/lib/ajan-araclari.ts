// Agent tools of the site (WebMCP, experimental). Each tool is a thin wrapper around code the page
// already runs: the action registry (eylemler.ts), the filter module (suzgec.ts), the stored position
// (calisma-durumu.ts) and the course catalog (/veri/dersler.json). Inputs are validated with Zod and
// the JSON Schema handed to the browser is generated from the same schema, so the two never drift.
// Nothing here sends data anywhere: tools read and change the page and localStorage only.
import { z } from "zod/v4";
import { DEVAM_HASH, devamBaglantisi, kaldiginYerOku, sonCalisilanlar, yerMetni, type Yer } from "./calisma-durumu";
import { EYLEMLER } from "./eylemler";
import { suzgecOku, suzgecYaz, VARSAYILAN_SUZGEC, type SuzgecAyar } from "./suzgec";

/** Row of /veri/dersler.json (src/pages/veri/dersler.json.ts). */
export type KatalogKaydi = {
  key: string;
  name: string;
  code?: string;
  semester?: number;
  university: string;
  universityShort: string;
  department: string;
  url: string;
};

/** Everything a tool may touch, injected so the tools run in unit tests without a browser. */
export type AracOrtami = {
  katalog: () => Promise<KatalogKaydi[]>;
  yol: () => string;
  git: (adres: string) => void;
  yenile: () => void;
  kaydir: (id: string) => boolean;
  depoOku: (anahtar: string) => string | null;
  depoYaz: (anahtar: string, deger: string) => void;
  suzgeciUygula: () => void;
  soruSayisiMetni: () => string | null;
  kaldiginYer: () => Record<string, Yer>;
};

export type AracSonucu = { tamam: boolean; mesaj: string; veri?: unknown };

type AracTanimi<S extends z.ZodType> = {
  name: string;
  title: string;
  description: string;
  girdi: S;
  annotations?: { readOnlyHint?: boolean; consequentialHint?: boolean };
  calistir: (girdi: z.infer<S>, ortam: AracOrtami) => Promise<AracSonucu> | AracSonucu;
};

const tanimla = <S extends z.ZodType>(t: AracTanimi<S>) => t;

const SLUG = z.string().regex(/^[a-z0-9-]+$/, "küçük harf, rakam ve tire");
/** Course path /<uni>/<bolum>/<ders> (with or without a trailing slash). */
const DERS_YOLU = /^\/([a-z0-9-]+)\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/;

export const dersYolundan = (yol: string) => {
  const m = DERS_YOLU.exec(yol);
  return m ? { uni: m[1], bolum: m[2], ders: m[3] } : null;
};

/** Lowercase in Turkish and fold the letters agents often type without diacritics. */
export function katla(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Courses whose name, code or department contain every word of the query; the name match ranks first. */
export function dersleriAra(katalog: KatalogKaydi[], sorgu: string, universite?: string, sinir = 8): KatalogKaydi[] {
  const kelimeler = katla(sorgu).split(" ").filter(Boolean);
  const gorulen = new Set<string>();
  const sonuc: { k: KatalogKaydi; puan: number }[] = [];
  for (const k of katalog) {
    if (universite && !k.key.startsWith(`${universite}/`)) continue;
    if (gorulen.has(k.key)) continue;
    const ad = katla(k.name);
    const metin = `${ad} ${katla(k.code ?? "")} ${katla(k.department)} ${katla(k.universityShort)}`;
    if (!kelimeler.every((w) => metin.includes(w))) continue;
    gorulen.add(k.key);
    const puan = (ad === kelimeler.join(" ") ? 0 : 2) + (kelimeler.every((w) => ad.includes(w)) ? 0 : 1);
    sonuc.push({ k, puan });
  }
  return sonuc
    .sort((a, b) => a.puan - b.puan || a.k.name.localeCompare(b.k.name, "tr") || a.k.key.localeCompare(b.k.key))
    .slice(0, sinir)
    .map((x) => x.k);
}

const dersSayfasiGerekli = (ortam: AracOrtami): AracSonucu | null =>
  dersYolundan(ortam.yol()) ? null : { tamam: false, mesaj: "Bu araç yalnız bir ders sayfasında çalışır. Önce dersi_ac ile bir ders açın." };

/** Clearing actions change the learner's records; agents get them only through the page's own menu. */
export const AJANA_KAPALI_EYLEMLER = new Set(["uniteyi-temizle", "dersi-temizle", "yeri-sifirla"]);
const eylemKimlikleri = EYLEMLER.map((e) => e.id).filter((id) => !AJANA_KAPALI_EYLEMLER.has(id));

export const ARACLAR = [
  tanimla({
    name: "ders_ara",
    title: "Ders ara",
    description:
      "Dört açık öğretim fakültesinin (anadolu-aof, ataturk-aof, auzef, ankuzef) ders kataloğunda ders adı, ders kodu ya da bölüm adıyla arar. Her sonuç kendi üniversitesine aittir.",
    girdi: z.object({
      sorgu: z.string().trim().min(2).max(100).describe("Ders adı, kodu ya da bölüm, ör. 'genel muhasebe' veya 'IKT101U'"),
      universite: SLUG.optional().describe("Yalnız bu üniversite: anadolu-aof, ataturk-aof, auzef ya da ankuzef"),
      sinir: z.number().int().min(1).max(20).default(8).describe("En çok kaç sonuç"),
    }),
    annotations: { readOnlyHint: true },
    calistir: async (g, ortam) => {
      const bulunan = dersleriAra(await ortam.katalog(), g.sorgu, g.universite, g.sinir);
      if (bulunan.length === 0) return { tamam: true, mesaj: `"${g.sorgu}" için ders bulunamadı.`, veri: [] };
      return {
        tamam: true,
        mesaj: `${bulunan.length} ders bulundu.`,
        veri: bulunan.map((k) => ({
          universite: k.key.split("/")[0],
          ders: k.key.split("/")[1],
          ad: k.name,
          kod: k.code || undefined,
          donem: k.semester,
          universiteAdi: k.university,
          bolum: k.department,
          adres: k.url,
        })),
      };
    },
  }),
  tanimla({
    name: "dersi_ac",
    title: "Dersi aç",
    description: "Bir dersin çalışma sayfasını açar. universite ve ders değerlerini ders_ara sonucundan alın.",
    girdi: z.object({ universite: SLUG.describe("ör. auzef"), ders: SLUG.describe("ör. genel-psikoloji") }),
    calistir: async (g, ortam) => {
      const kayit = (await ortam.katalog()).find((k) => k.key === `${g.universite}/${g.ders}`);
      if (!kayit) return { tamam: false, mesaj: `${g.universite}/${g.ders} bulunamadı. Önce ders_ara ile doğru kimliği alın.` };
      ortam.git(kayit.url);
      return { tamam: true, mesaj: `${kayit.name} (${kayit.universityShort}) açılıyor.` };
    },
  }),
  tanimla({
    name: "uniteye_git",
    title: "Üniteye git",
    description: "Açık ders sayfasında verilen ünitenin başına kaydırır. 0, ünitesi belirlenmemiş sorulardır.",
    girdi: z.object({ no: z.number().int().min(0).max(99).describe("Ünite numarası") }),
    annotations: { readOnlyHint: true },
    calistir: (g, ortam) =>
      dersSayfasiGerekli(ortam) ??
      (ortam.kaydir(`unite-${g.no}`)
        ? { tamam: true, mesaj: `Ünite ${g.no} gösteriliyor.` }
        : { tamam: false, mesaj: `Bu derste ${g.no}. ünite yok ya da sorusu yok.` }),
  }),
  tanimla({
    name: "soruya_git",
    title: "Soruya git",
    description: "Açık ders sayfasında bir ünitenin n. sorusuna kaydırır (sıra sayfadaki kitap sırasıdır, 1'den başlar).",
    girdi: z.object({
      unite: z.number().int().min(0).max(99).describe("Ünite numarası"),
      no: z.number().int().min(1).max(2000).describe("Ünitedeki soru sırası, 1'den başlar"),
    }),
    annotations: { readOnlyHint: true },
    calistir: (g, ortam) =>
      dersSayfasiGerekli(ortam) ??
      (ortam.kaydir(`question-${g.unite}-${g.no - 1}`)
        ? { tamam: true, mesaj: `Ünite ${g.unite}, soru ${g.no} gösteriliyor.` }
        : { tamam: false, mesaj: `Ünite ${g.unite} içinde ${g.no}. soru yok.` }),
  }),
  tanimla({
    name: "sorulari_filtrele",
    title: "Soruları süz",
    description:
      "Açık ders sayfasında Süzgeç ayarını değiştirir: ünite, kaynak (çıkmış soru ya da alıştırma), sınav, yanlışlarım, cevaplanmamışlar. Yazılmayan alan olduğu gibi kalır; sifirla bütün süzgeci kaldırır.",
    girdi: z.object({
      unite: z
        .union([z.literal("all"), z.literal("first_half"), z.literal("second_half"), z.number().int().min(0).max(99)])
        .optional()
        .describe("all, first_half (vize), second_half (final) ya da ünite numarası"),
      kaynak: z.enum(["all", "cikmis-soru", "alistirma"]).optional(),
      sinav: z.string().max(40).optional().describe("ör. '2023-2024 final'; all bütün sınavlar"),
      yanlislarim: z.boolean().optional().describe("Yalnız yanlış cevaplananlar"),
      cevaplanmamis: z.boolean().optional().describe("Yalnız hiç cevaplanmamışlar"),
      sifirla: z.boolean().optional().describe("Bütün süzgeci kaldır"),
    }),
    calistir: (g, ortam) => {
      const engel = dersSayfasiGerekli(ortam);
      if (engel) return engel;
      const ham = ortam.depoOku("quiz-settings");
      const simdiki = suzgecOku(ham);
      const yeni: SuzgecAyar = g.sifirla
        ? { ...VARSAYILAN_SUZGEC }
        : {
            filterUnite: g.unite === undefined ? simdiki.filterUnite : String(g.unite),
            filterSource: g.kaynak ?? simdiki.filterSource,
            filterExam: g.sinav ?? simdiki.filterExam,
            filterIncorrect: g.yanlislarim ?? simdiki.filterIncorrect,
            filterUnanswered: g.cevaplanmamis ?? simdiki.filterUnanswered,
          };
      ortam.depoYaz("quiz-settings", suzgecYaz(ham, yeni));
      ortam.suzgeciUygula();
      return { tamam: true, mesaj: ortam.soruSayisiMetni() ?? "Süzgeç uygulandı.", veri: yeni };
    },
  }),
  tanimla({
    name: "kaldigim_yere_don",
    title: "Kaldığım yere dön",
    description:
      "Öğrencinin bu tarayıcıda kaydedilmiş kaldığı soruya döner. ders verilmezse açık dersin kaydı, yoksa en son çalışılan ders kullanılır. Kayıt yoksa son çalışılanları listeler.",
    girdi: z.object({ ders: z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/).optional().describe("universite/ders, ör. auzef/genel-psikoloji") }),
    calistir: (g, ortam) => {
      const kayitlar = ortam.kaldiginYer();
      const acik = dersYolundan(ortam.yol());
      const anahtar = g.ders ?? (acik && kayitlar[`${acik.uni}/${acik.ders}`] ? `${acik.uni}/${acik.ders}` : undefined);
      const sirali = sonCalisilanlar({ surum: 2, dersler: kayitlar });
      const hedef = anahtar ? kayitlar[anahtar] : sirali[0]?.[1];
      if (!hedef) {
        return {
          tamam: false,
          mesaj: anahtar ? `${anahtar} için kayıtlı bir yer yok.` : "Bu tarayıcıda kayıtlı bir çalışma yeri yok.",
          veri: sirali.slice(0, 5).map(([d, y]) => ({ ders: d, ad: y.ad, yer: yerMetni(y) })),
        };
      }
      const adres = devamBaglantisi(hedef);
      // Same course: the page reads the resume hash only while loading, so reload with it.
      ortam.git(adres);
      if (ortam.yol().replace(/\/$/, "") === hedef.yol && adres.endsWith(DEVAM_HASH)) ortam.yenile();
      return { tamam: true, mesaj: `${hedef.ad}: ${yerMetni(hedef)} açılıyor.` };
    },
  }),
  tanimla({
    name: "eylem_calistir",
    title: "Ders sayfası eylemi",
    description:
      "Ders sayfasının menüsündeki bir eylemi çalıştırır: sesli okuma (seslendir), çözme kipi (coz), önceki/sonraki soru (geri, ileri), cevabı göster, içindekiler, tema ve diğerleri. Kayıt silen eylemler bu araçla çalışmaz.",
    girdi: z.object({ eylem: z.enum(eylemKimlikleri as [string, ...string[]]).describe("Eylem kimliği") }),
    calistir: (g, ortam) => {
      const engel = dersSayfasiGerekli(ortam);
      if (engel) return engel;
      const e = EYLEMLER.find((x) => x.id === g.eylem);
      if (!e) return { tamam: false, mesaj: `${g.eylem} adlı eylem yok.` };
      if (e.pasif?.()) return { tamam: false, mesaj: `${e.etiket} şu an kullanılamıyor.` };
      e.calistir();
      return { tamam: true, mesaj: `${e.etiket} çalıştırıldı.` };
    },
  }),
] as const;

export type AracAdi = (typeof ARACLAR)[number]["name"];

/** JSON Schema of a tool's input, generated from its Zod schema. */
export function girdiSemasi(arac: (typeof ARACLAR)[number]): Record<string, unknown> {
  const sema = z.toJSONSchema(arac.girdi, { io: "input" }) as Record<string, unknown>;
  delete sema.$schema;
  return sema;
}

/** Validates the agent's input, then runs the tool. Invalid input comes back as a readable message. */
export async function araciCalistir(ad: string, girdi: unknown, ortam: AracOrtami): Promise<AracSonucu> {
  const arac = ARACLAR.find((a) => a.name === ad);
  if (!arac) return { tamam: false, mesaj: `${ad} adlı araç yok.` };
  // Chrome before 155 could pass the arguments as a JSON string.
  let ham = girdi ?? {};
  if (typeof ham === "string") {
    try {
      ham = JSON.parse(ham || "{}");
    } catch {
      return { tamam: false, mesaj: "Geçersiz girdi: JSON çözümlenemedi." };
    }
  }
  const r = arac.girdi.safeParse(ham);
  if (!r.success) return { tamam: false, mesaj: `Geçersiz girdi: ${z.prettifyError(r.error)}` };
  // Each schema was parsed by its own tool above; the cast only joins the union of tool signatures.
  return (arac.calistir as (g: unknown, o: AracOrtami) => Promise<AracSonucu> | AracSonucu)(r.data, ortam);
}

/** Name and description pairs for llms.txt and the guide. */
export const aracOzetleri = () => ARACLAR.map((a) => ({ ad: a.name, aciklama: a.description }));
