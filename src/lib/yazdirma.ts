// Print settings and print-time page preparation for the course page.
// Settings live in localStorage ("yazdirma-ayarlari"); they are applied as data-baski-* attributes
// on <html> in beforeprint and read by src/styles/print.css.
import { z } from "zod";
import { depodanBul } from "./soru-deposu";
import { konuYolu } from "./soru-karti";

export const YazdirmaAyarlariSemasi = z.object({
  cevap: z.enum(["alt", "sonda", "yok"]).catch("alt"),
  aciklama: z.enum(["var", "yok"]).catch("var"),
  sutun: z.enum(["1", "2"]).catch("2"),
  yazi: z.enum(["kucuk", "normal", "buyuk"]).catch("normal"),
  konu: z.enum(["var", "yok"]).catch("var"),
});
export type YazdirmaAyarlari = z.infer<typeof YazdirmaAyarlariSemasi>;

const ANAHTAR = "yazdirma-ayarlari";
const VARSAYILAN: YazdirmaAyarlari = YazdirmaAyarlariSemasi.parse({});

export function yazdirmaAyarlariniOku(): YazdirmaAyarlari {
  try {
    const ham = localStorage.getItem(ANAHTAR);
    return ham ? YazdirmaAyarlariSemasi.parse(JSON.parse(ham)) : VARSAYILAN;
  } catch {
    return VARSAYILAN;
  }
}

export function yazdirmaAyarlariniYaz(a: YazdirmaAyarlari): void {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(YazdirmaAyarlariSemasi.parse(a)));
  } catch {
    /* storage may be unavailable; printing still works with the in-memory choice */
  }
}

/** Visible question cards in print order (the on-screen filter hides cards with display:none). */
export function gorunenKartlar(kok: ParentNode = document): HTMLElement[] {
  return [...kok.querySelectorAll<HTMLElement>(".question-card")].filter((k) => k.style.display !== "none");
}

/** The count of questions on the printed pages. "288 / 487 soru" read as nothing on paper (Zeki, 21 Nov 2026), so a
 * filtered print just says how many it holds. */
export function soruSayisiMetni(gorunen: number, _toplam: number): string {
  return `${gorunen} soru`;
}

/** One entry per unit: question number (same order as the CSS counter) and the correct key. */
export function cevapAnahtari(kartlar: HTMLElement[]): { unite: string; cevaplar: [number, string][] }[] {
  const gruplar: { unite: string; cevaplar: [number, string][] }[] = [];
  kartlar.forEach((kart, i) => {
    const unite = kart.dataset.unit ?? "";
    const anahtar = kart.querySelector(".correct-option .option-key")?.textContent?.trim() ?? "?";
    let grup = gruplar[gruplar.length - 1];
    if (!grup || grup.unite !== unite) {
      grup = { unite, cevaplar: [] };
      gruplar.push(grup);
    }
    grup.cevaplar.push([i + 1, anahtar]);
  });
  return gruplar;
}

const ANAHTAR_KIMLIK = "baski-cevap-anahtari";

export function baskiyaHazirla(a: YazdirmaAyarlari): void {
  const kok = document.documentElement;
  kok.dataset.baskiCevap = a.cevap;
  kok.dataset.baskiAciklama = a.aciklama;
  kok.dataset.baskiSutun = a.sutun;
  kok.dataset.baskiYazi = a.yazi;
  kok.dataset.baskiKonu = a.konu;

  const kartlar = gorunenKartlar();

  // Short count for the title block
  const sayac = document.getElementById("soru-sayisi");
  if (sayac) sayac.dataset.baski = soruSayisiMetni(kartlar.length, Number(sayac.dataset.toplam ?? kartlar.length));

  // Topic heading above the first question of each topic
  let onceki = "";
  document.querySelectorAll<HTMLElement>(".question-card").forEach((k) => k.removeAttribute("data-konu-basi"));
  for (const kart of kartlar) {
    const konu = kart.dataset.konu ?? "";
    if (konu && konu !== onceki) {
      const kayit = depodanBul(kart.id);
      const ad = (kayit ? konuYolu(konu, kayit.baglam.konular).join(" › ") : "") || konu;
      kart.setAttribute("data-konu-basi", "");
      kart.setAttribute("data-konu-ad", ad.toLocaleUpperCase("tr-TR"));
    }
    onceki = konu;
  }

  // Answer key at the end
  document.getElementById(ANAHTAR_KIMLIK)?.remove();
  if (a.cevap === "sonda" && kartlar.length) {
    const bolum = document.createElement("section");
    bolum.id = ANAHTAR_KIMLIK;
    bolum.className = "baski-cevap-anahtari";
    const baslik = document.createElement("h2");
    baslik.textContent = "Cevap anahtarı";
    bolum.append(baslik);
    for (const grup of cevapAnahtari(kartlar)) {
      const satir = document.createElement("div");
      satir.className = "baski-anahtar-unite";
      const ad = document.createElement("strong");
      ad.textContent = grup.unite ? `Ünite ${grup.unite}` : "Sorular";
      const liste = document.createElement("p");
      liste.textContent = grup.cevaplar.map(([no, k]) => `${no}-${k}`).join("  ");
      satir.append(ad, liste);
      bolum.append(satir);
    }
    const yer = kartlar[kartlar.length - 1].closest("article") ?? document.body;
    yer.after(bolum);
  }
}

export function baskidanSonra(): void {
  document.getElementById(ANAHTAR_KIMLIK)?.remove();
}
