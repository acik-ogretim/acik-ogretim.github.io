// Download chip on the course card (#cevrimdisi-indir) and its progress bar. The menu action "cevrimdisi"
// (eylemler.ts) clicks the same chip, so both always show one state.
import { bildir } from "../bildirim";
import { EYLEM_DURUM_OLAYI } from "../eylemler";
import { boyutMetni, dersKimligi } from "./anahtar";
import { CEVRIMDISI_OLAYI, ILERLEME_OLAYI, destekVar, durum, indir, type DersDurumu, type IlerlemeOlayi } from "./istemci";
import { metaOku } from "./paket";

const ETIKET: Record<DersDurumu, string> = {
  yok: "Çevrimdışı için indir",
  iniyor: "İndiriliyor",
  yarim: "İndirmeyi sürdür",
  hazir: "Çevrimdışı hazır",
  guncelleme: "Güncelleme var",
};

const tarihMetni = (iso: string) => new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });

export function dersDugmesiniBagla(): void {
  const dugme = document.getElementById("cevrimdisi-indir") as HTMLButtonElement | null;
  if (!dugme || !destekVar()) return;
  const { uni = "", ders = "", ad } = dugme.dataset;
  const kimlik = dersKimligi(uni, ders);
  const etiket = dugme.querySelector<HTMLElement>("[data-etiket]");
  const serit = document.getElementById("cevrimdisi-serit");
  const dolu = serit?.querySelector<HTMLElement>("span");
  const bilgi = document.getElementById("cevrimdisi-bilgi");
  let simdiki: DersDurumu = "yok";

  const ciz = (d: DersDurumu, ek?: string) => {
    simdiki = d;
    dugme.dataset.durum = d;
    if (etiket) etiket.textContent = ek ? `${ETIKET[d]} ${ek}` : ETIKET[d];
    for (const s of dugme.querySelectorAll<SVGElement | HTMLElement>("[data-simge]")) {
      const gorunur = s.dataset.simge === (d === "hazir" ? "hazir" : d === "guncelleme" ? "guncelleme" : "indir");
      s.toggleAttribute("hidden", !gorunur);
    }
    dugme.setAttribute("aria-busy", String(d === "iniyor"));
    if (serit) serit.hidden = d !== "iniyor";
    window.dispatchEvent(new CustomEvent(EYLEM_DURUM_OLAYI));
  };

  const yenile = async () => {
    const m = await metaOku(uni, ders);
    const d = await durum(m, uni, ders);
    if (d === "iniyor") return;
    ciz(d);
    if (bilgi) {
      bilgi.hidden = !m;
      if (m) bilgi.textContent = m.durum === "tamam" ? `Bu cihazda · ${boyutMetni(m.boyut)} · ${tarihMetni(m.tarih)}` : "İndirme yarım kaldı; sürdürünce kaldığı yerden devam eder.";
    }
  };

  window.addEventListener(ILERLEME_OLAYI, (e) => {
    const d = (e as CustomEvent<IlerlemeOlayi>).detail;
    if (d.kimlik !== kimlik) return;
    const yuzde = Math.min(100, Math.floor((d.alinan / Math.max(1, d.toplam)) * 100));
    ciz("iniyor", d.arkaPlan ? boyutMetni(d.alinan) : `%${yuzde}`);
    if (serit && dolu) {
      serit.setAttribute("aria-valuenow", String(yuzde));
      serit.setAttribute("aria-valuetext", `${boyutMetni(d.alinan)} / ${boyutMetni(d.toplam)}`);
      dolu.style.width = `${yuzde}%`;
    }
    if (bilgi) {
      bilgi.hidden = false;
      bilgi.textContent = `${boyutMetni(d.alinan)} / ${boyutMetni(d.toplam)}`;
    }
  });
  window.addEventListener(CEVRIMDISI_OLAYI, () => void yenile());
  addEventListener("online", () => void yenile());

  dugme.addEventListener("click", async () => {
    if (simdiki === "iniyor") return;
    if (simdiki === "hazir") {
      location.assign("/cevrimdisi/");
      return;
    }
    if (!navigator.onLine) {
      bildir({ metin: "İndirmek için bağlantı gerekiyor. Bağlanınca yeniden dene." });
      return;
    }
    try {
      const m = await indir(uni, ders, ad);
      if (m?.durum === "tamam") bildir({ metin: `${m.ad} bu cihazda. İnternet olmadan da açılır.` });
    } catch (hata) {
      bildir({ metin: hata instanceof Error && hata.name !== "AbortError" ? `İndirme durdu: ${hata.message}` : "İndirme durdu." });
    } finally {
      await yenile();
    }
  });

  dugme.hidden = false;
  void yenile();
}

/** Label of the menu action, the chip's current text. */
export const dersDugmesiEtiketi = (): string =>
  document.querySelector("#cevrimdisi-indir [data-etiket]")?.textContent?.trim() || ETIKET.yok;
