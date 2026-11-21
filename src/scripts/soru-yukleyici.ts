// Draws the course page's question cards in the browser. The page HTML carries only the skeleton (title, actions,
// unit strip, one empty unit container per unit); each unit's questions come from /ders/<uni>/<ders>/unite/<n>.json
// (the course package, docs/veri-mimarisi.md). The unit the address points to is drawn first, so a
// link like #question-3-12 lands on its card; the rest follow as they arrive. Everything that works on cards (player,
// filters, search, discussion) starts after SORULAR_HAZIR_OLAYI, so none of it needs to know about late cards.
import { paketAdresi, paketDizinSchema, paketUniteSchema, type PaketDizin, type PaketUnite, type SoruKaydi } from "../lib/unite-verisi";
import { kunyeAyrintiHtml, soruKartiHtml, type KartBaglam } from "../lib/soru-karti";
import { kitapSirala } from "../lib/soru-siralama";
import { soruSirala } from "../lib/soru-sirasi";
import { depodanBul, depoyaYaz } from "../lib/soru-deposu";
import { SORULAR_HAZIR_OLAYI } from "../lib/ders-olaylari";

/** Unit the address points to (#question-3-12 or #unite-3), or null. */
export function hedefUnite(hash: string): number | null {
  const m = /^#(?:question|unite)-(\d+)/.exec(hash);
  return m ? Number(m[1]) : null;
}

/** Cards of one unit in book order; `eski` is the place in the older "most asked first" order when it differs. */
export function uniteKartlari(v: PaketUnite, dizin: PaketDizin | null, calismaYolu?: string): { sorular: SoruKaydi[]; html: string; baglam: KartBaglam } {
  const sorular: SoruKaydi[] = v.sorular.map((q) => ({ ...q, year: q.year === undefined ? undefined : String(q.year) }));
  const kitapSirasi = kitapSirala(sorular);
  const eskiSira = new Map(soruSirala(sorular).map((q, i) => [q, i]));
  kitapSirasi.forEach((q, i) => {
    const e = eskiSira.get(q);
    if (e !== undefined && e !== i) q.eski = e;
  });
  const baglam: KartBaglam = {
    unit: v.unite,
    konular: Object.fromEntries((dizin?.konular ?? []).map((k) => [k.no, k.baslik])),
    uniteBaslik: dizin?.uniteler.find((u) => u.no === v.unite)?.baslik || undefined,
    calismaYolu,
  };
  return { sorular: kitapSirasi, html: kitapSirasi.map((q, i) => soruKartiHtml(q, i, baglam)).join(""), baglam };
}

async function jsonGetir(adres: string): Promise<unknown> {
  const r = await fetch(adres);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function dizinGetir(uni: string, ders: string): Promise<PaketDizin | null> {
  try {
    const p = paketDizinSchema.safeParse(await jsonGetir(paketAdresi.dizin(uni, ders)));
    return p.success ? p.data : null;
  } catch {
    return null; // topic names are missing from the card summaries, the questions still show
  }
}

async function uniteyiGetir(uni: string, ders: string, unite: number): Promise<PaketUnite> {
  const p = paketUniteSchema.safeParse(await jsonGetir(paketAdresi.unite(uni, ders, unite)));
  if (!p.success) throw new Error("Soru dosyası okunamadı");
  return p.data;
}

function hataGoster(kap: HTMLElement, tekrar: () => void): void {
  kap.querySelector("[data-yukleniyor]")?.remove();
  const kutu = document.createElement("div");
  kutu.className = "soru-yukleme-hata";
  kutu.dataset.yukleniyor = "";
  kutu.setAttribute("role", "alert");
  const metin = document.createElement("span");
  metin.textContent = "Bu ünitenin soruları yüklenemedi.";
  const dugme = document.createElement("button");
  dugme.type = "button";
  dugme.className = "eylem-cip";
  dugme.textContent = "Yeniden dene";
  dugme.addEventListener("click", tekrar);
  kutu.append(metin, dugme);
  kap.querySelector("h2")?.after(kutu);
}

export async function sorulariYukle(alan: HTMLElement): Promise<void> {
  const uni = alan.dataset.uni ?? "";
  const ders = alan.dataset.ders ?? "";
  const calismaYolu = alan.dataset.calismaYolu || undefined;
  const uniteler = (alan.dataset.uniteler ?? "").split(",").filter(Boolean).map(Number);
  const hedef = hedefUnite(location.hash);
  const sirali = hedef !== null && uniteler.includes(hedef) ? [hedef, ...uniteler.filter((u) => u !== hedef)] : uniteler;

  const dizinSozu = dizinGetir(uni, ders);
  const ciz = async (unite: number): Promise<void> => {
    const kap = document.getElementById(`unite-${unite}`);
    if (!kap) return;
    try {
      const [v, dizin] = await Promise.all([uniteyiGetir(uni, ders, unite), dizinSozu]);
      const { sorular, html, baglam } = uniteKartlari(v, dizin, calismaYolu);
      sorular.forEach((q, i) => depoyaYaz(unite, i, { q, baglam, idx: i }));
      kap.querySelectorAll("[data-yukleniyor]").forEach((x) => x.remove());
      kap.querySelector("h2")?.after(...htmlDugumleri(html));
      // Layout opens the AI controls once at load, before these cards exist
      if (localStorage.getItem("ai-enrichment-enabled") === "true") {
        kap.querySelectorAll(".ai-enrichment-controls").forEach((d) => d.classList.remove("hidden"));
      }
    } catch {
      hataGoster(kap, () => location.reload());
    }
  };

  // The unit the reader asked for first and alone, then the others together
  if (sirali[0] !== undefined) await ciz(sirali[0]);
  if (hedef !== null) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "start" });
  await Promise.all(sirali.slice(1).map(ciz));
  document.documentElement.dataset.sorularHazir = "1";
  window.dispatchEvent(new CustomEvent(SORULAR_HAZIR_OLAYI));
}

function htmlDugumleri(html: string): Node[] {
  const t = document.createElement("template");
  t.innerHTML = html;
  return [...t.content.childNodes];
}

/** Record details are built when the reader opens the record (the toggle event does not bubble: capture it). */
function kunyeAyrintisiniBagla(): void {
  document.addEventListener(
    "toggle",
    (e) => {
      const d = e.target;
      if (!(d instanceof HTMLDetailsElement) || !d.classList.contains("soru-kunye") || !d.open || d.querySelector(".soru-kunye-ayrinti")) return;
      const kayit = depodanBul(d.closest<HTMLElement>(".question-card")?.id ?? "");
      if (kayit) d.insertAdjacentHTML("beforeend", kunyeAyrintiHtml(kayit.q, kayit.baglam));
    },
    true,
  );
}

const alan = typeof document === "undefined" ? null : document.querySelector<HTMLElement>("[data-soru-alani]");
if (alan) {
  kunyeAyrintisiniBagla();
  void sorulariYukle(alan);
}
