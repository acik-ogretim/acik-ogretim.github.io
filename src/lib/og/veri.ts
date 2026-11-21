// Share image catalog: which pages get a 1200x630 card, what each card says and the alt text of its og:image.
// Facts come from the same data the pages use (src/lib/site-haritasi.ts catalog, data/questions); a fact whose
// data is missing is left out. Build time only (reads data/ from disk).
import fs from "node:fs/promises";
import path from "node:path";
import { katalog } from "../site-haritasi";
import { courseDepartments } from "../kanonik";
import { dereceAdi } from "../derece";
import { cogunluklaAciklamali, dersSayilari, sayilariBirlestir, sinavTuruAdlari, yilAraligiMetni, type DersSayilari, type SoruKaydi } from "../ders-sayilari";
import type { OgKarti, OgKutu } from "./cizim";

const sayi = new Intl.NumberFormat("tr-TR", { useGrouping: "always" });
export const bin = (n: number) => sayi.format(n);

/** Static pages with a card of their own; the key is the page path without slashes. */
export const STATIK_KARTLAR: Record<string, { baslik: string; baglam: string }> = {
  ara: { baslik: "Ders ve soru ara", baglam: "Tüm üniversitelerde arama" },
  rehber: { baslik: "Kullanım rehberi", baglam: "Portalı nasıl kullanırsın" },
  sohbet: { baslik: "Derse sor: yapay zekâ sohbeti", baglam: "Kendi anahtarınla, tarayıcında" },
  derslerim: { baslik: "Derslerim", baglam: "Kaldığın yerden devam et" },
  ilerleme: { baslik: "İlerleme", baglam: "Çalışma geçmişin" },
  istatistik: { baslik: "İstatistik", baglam: "Çalışma özetin" },
  hakkimizda: { baslik: "Hakkımızda", baglam: "Açık kaynaklı, ücretsiz çalışma portalı" },
  iletisim: { baslik: "İletişim", baglam: "Bize ulaş" },
  gizlilik: { baslik: "Gizlilik", baglam: "Verilerin tarayıcında kalır" },
  "kullanim-kosullari": { baslik: "Kullanım koşulları", baglam: "Portalın kullanım şartları" },
  telif: { baslik: "Telif ve kaynaklar", baglam: "İçeriklerin kaynağı" },
  yedek: { baslik: "Kayıtları taşı", baglam: "Cihazlar arasında yedek ve eşitleme" },
  cevrimdisi: { baslik: "Çevrimdışı dersler", baglam: "İnternetsiz çalış" },
  ayarlar: { baslik: "Ayarlar", baglam: "Portalı sana göre ayarla" },
};

export type OgKaydi = {
  /** File under /og/ without extension: "index", "sayfa/ara", "<uni>", "<uni>/<bolum>", "<uni>/<bolum>/<ders>". */
  dosya: string;
  /** Page path (with trailing slash) the card belongs to. */
  sayfa: string;
  alt: string;
  kart: () => Promise<OgKarti>;
};

const gercekOnbellegi = new Map<string, Promise<DersSayilari>>();
const DATA = path.resolve(process.cwd(), "data/questions");

/** Counts of one course read straight from its question file; only the small result stays in memory. */
export function dersGercegi(uniId: string, dersId: string): Promise<DersSayilari> {
  const anahtar = `${uniId}/${dersId}`;
  let p = gercekOnbellegi.get(anahtar);
  if (!p) {
    p = (async () => {
      let sorular: SoruKaydi[] = [];
      try {
        const ham = JSON.parse(await fs.readFile(path.join(DATA, uniId, `${dersId}.json`), "utf-8"));
        if (Array.isArray(ham)) sorular = ham;
      } catch {
        // missing or broken file: no facts
      }
      return dersSayilari(sorular);
    })();
    gercekOnbellegi.set(anahtar, p);
  }
  return p;
}

const toplam = async (uniId: string, dersIdleri: string[]) => sayilariBirlestir(await Promise.all(dersIdleri.map((d) => dersGercegi(uniId, d))));

/** Detail tile: a bold figure with its label. */
const kutu = (n: number, etiket: string): OgKutu[] => (n > 0 ? [{ baslik: bin(n), etiket }] : []);

/**
 * Card facts shared by every level: the big number is the past-exam question count (practice questions when a
 * course has none), then the exam-year lines, and tiles for the side panel. Zero or missing values are left out.
 */
export function olgular(d: DersSayilari, ek: OgKutu[] = [], dersDuzeyi = false): Pick<OgKarti, "buyuk" | "yil" | "kutular" | "ozet"> {
  const buyuk = d.cikmis > 0 ? { sayi: bin(d.cikmis), etiket: "çıkmış soru" } : d.soru > 0 ? { sayi: bin(d.soru), etiket: "alıştırma sorusu" } : undefined;
  const yilMetni = yilAraligiMetni(d);
  const yil = !yilMetni ? [] : d.yillar.length > 1 ? [`${d.ilkYil} ile ${d.sonYil}`, `arası sınavlar · ${d.yillar.length} yıl`] : [yilMetni];
  const turler = dersDuzeyi ? sinavTuruAdlari(d) : [];
  const kutular: OgKutu[] = [
    ...(turler.length > 0 && turler.length <= 4 ? [{ baslik: turler.join(", "), etiket: "sınav türleri", kucuk: true }] : []),
    ...(d.cikmis > 0 && d.alistirma > 0 ? kutu(d.soru, "soru") : []),
    ...ek,
    ...(dersDuzeyi ? kutu(d.unite, "ünite") : []),
    ...(dersDuzeyi && cogunluklaAciklamali(d) ? [{ baslik: "Açıklamalı", etiket: "çözümler", kucuk: true }] : []),
  ];
  const ozet = [buyuk ? `${buyuk.sayi} ${buyuk.etiket}` : "", yilMetni].filter(Boolean).join(", ");
  return { buyuk, yil, kutular, ozet: ozet || undefined };
}

let indeks: Promise<Map<string, OgKaydi>> | null = null;

/** Every page that has a card, keyed by page path. Memoized per build. */
export function ogIndeksi(): Promise<Map<string, OgKaydi>> {
  indeks ??= indeksKur();
  return indeks;
}

async function indeksKur(): Promise<Map<string, OgKaydi>> {
  const kat = await katalog();
  const ortak = await courseDepartments();
  const m = new Map<string, OgKaydi>();
  const ekle = (k: OgKaydi) => m.set(k.sayfa, k);

  const dersSayisi = kat.reduce((t, k) => t + k.dersler.length, 0);
  const uniToplami = async (k: (typeof kat)[number]) => toplam(k.uni.id, k.dersler.map((d) => d.ders.id));
  ekle({
    dosya: "index",
    sayfa: "/",
    alt: `Açık Öğretim Portal: ${kat.map((k) => k.uni.shortName).join(", ")} çıkmış soruları ve açıklamalı çözümler`,
    kart: async () => {
      const t = sayilariBirlestir(await Promise.all(kat.map(uniToplami)));
      return {
        baslik: "Çıkmış sorular ve açıklamalı çözümler",
        sol: { liste: kat.map((k) => k.uni.shortName) },
        ...olgular(t, [...kutu(kat.length, "üniversite"), ...kutu(dersSayisi, "ders")]),
      };
    },
  });

  for (const [slug, s] of Object.entries(STATIK_KARTLAR)) {
    ekle({ dosya: `sayfa/${slug}`, sayfa: `/${slug}/`, alt: `${s.baslik}: Açık Öğretim Portal`, kart: async () => ({ baslik: s.baslik, sol: { ana: s.baglam } }) });
  }

  for (const k of kat) {
    const uni = k.uni;
    ekle({
      dosya: uni.id,
      sayfa: k.yol,
      alt: `${uni.name}: ${k.bolumler.length} bölüm, ${k.dersler.length} ders`,
      kart: async () => ({
        baslik: uni.name,
        sol: { etiket: uni.shortName, renk: uni.color, ana: uni.faculty },
        ...olgular(await uniToplami(k), [...kutu(k.bolumler.length, "bölüm"), ...kutu(k.dersler.length, "ders")]),
      }),
    });
    for (const b of k.bolumler) {
      const derece = dereceAdi(b.bolum.degree);
      ekle({
        dosya: `${uni.id}/${b.bolum.id}`,
        sayfa: b.yol,
        alt: `${b.bolum.name} (${derece}), ${uni.shortName}: ${b.dersSayisi} ders`,
        kart: async () => ({
          baslik: b.bolum.name,
          sol: { etiket: uni.shortName, renk: uni.color, ana: uni.name, alt: derece },
          ...olgular(await toplam(uni.id, k.dersler.filter((d) => d.bolum.id === b.bolum.id).map((d) => d.ders.id)), [...kutu(b.dersSayisi, "ders"), ...kutu(b.bolum.duration, "dönem")]),
        }),
      });
    }
    for (const d of k.dersler) {
      const bolumler = ortak.get(`${uni.id}/${d.ders.id}`) ?? [];
      const sol = bolumler.length > 1 ? { ana: "Ortak ders", alt: `${bolumler.length} bölümde okutulur` } : { ana: d.bolum.name, alt: dereceAdi(d.bolum.degree) };
      ekle({
        dosya: `${uni.id}/${d.bolum.id}/${d.ders.id}`,
        sayfa: d.yol,
        alt: `${d.ders.name} dersi: ${uni.shortName}${bolumler.length > 1 ? "" : `, ${d.bolum.name}`}`,
        kart: async () => ({ baslik: d.ders.name, sol: { etiket: uni.shortName, renk: uni.color, ...sol }, ...olgular(await dersGercegi(uni.id, d.ders.id), [], true) }),
      });
    }
  }
  return m;
}

/** og:image alt text with the facts the card shows, e.g. "Psikoloji dersi: ATA-AÖF, 1.240 çıkmış soru, 2016-2017 ile 2024-2025 arası sınavlar". */
export async function ogAlt(k: OgKaydi): Promise<string> {
  const { ozet } = await k.kart();
  return ozet ? `${k.alt}, ${ozet}` : k.alt;
}
