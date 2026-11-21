// List of downloaded courses, drawn on /cevrimdisi/ (with update and delete) and on /offline/ (links only).
import { bildir } from "../bildirim";
import { boyutMetni } from "./anahtar";
import { CEVRIMDISI_OLAYI, ILERLEME_OLAYI, durum, indir, listele, sil, type DersDurumu, type IlerlemeOlayi } from "./istemci";
import type { DersMeta } from "./sema";

const SIL_SVG =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';

const el = <K extends keyof HTMLElementTagNameMap>(etiket: K, sinif = "", metin = ""): HTMLElementTagNameMap[K] => {
  const e = document.createElement(etiket);
  if (sinif) e.className = sinif;
  if (metin) e.textContent = metin;
  return e;
};

/** "21 Kasım", with the year only when it is not this year (the meta line stays on one line on phones). */
const tarih = (iso: string) => {
  const d = new Date(iso);
  const buYil = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("tr-TR", buYil ? { day: "numeric", month: "long" } : { day: "numeric", month: "long", year: "numeric" });
};

const DURUM_METNI: Partial<Record<DersDurumu, string>> = {
  guncelleme: "Güncelleme var",
  yarim: "Yarım kaldı",
  iniyor: "İndiriliyor",
};

export type ListeSecenek = { yonetim: boolean; bos: string };

export function indirilenListesi(kok: HTMLElement, s: ListeSecenek): { ciz: () => Promise<DersMeta[]> } {
  let son: DersMeta[] = [];
  const satir = async (m: DersMeta) => {
    const d = await durum(m, m.uni, m.ders);
    const kutu = el("div", "liste-satir");
    kutu.dataset.ders = `${m.uni}/${m.ders}`;
    kutu.dataset.durum = d;
    const govde = el("a", "liste-satir-govde") as HTMLAnchorElement;
    govde.href = m.yol;
    govde.append(el("div", "liste-baslik", m.ad));
    govde.append(el("div", "liste-meta", [m.uniAd ?? m.uni, boyutMetni(m.boyut), tarih(m.tarih)].join(" · ")));
    // Second line: the state when there is one, else (management only) the content version of the copy
    const durumMetni = DURUM_METNI[d] ?? (s.yonetim ? `Sürüm ${m.hash.slice(0, 6)}` : undefined);
    if (durumMetni) {
      const satir2 = el("div", "liste-meta", durumMetni);
      if (d === "guncelleme") satir2.style.color = "var(--primary-text)";
      govde.append(satir2);
    }
    kutu.append(govde);
    if (!s.yonetim) return kutu;
    if (d === "guncelleme" || d === "yarim") {
      const g = el("button", "eylem-cip shrink-0", d === "guncelleme" ? "Güncelle" : "Sürdür") as HTMLButtonElement;
      g.type = "button";
      g.dataset.eylem = "guncelle";
      g.addEventListener("click", async () => {
        g.disabled = true;
        g.textContent = "İndiriliyor";
        try {
          await indir(m.uni, m.ders, m.ad);
          bildir({ metin: `${m.ad} güncellendi.` });
        } catch {
          bildir({ metin: "Güncelleme durdu. Bağlantını denetleyip yeniden dene." });
        }
      });
      kutu.append(g);
    }
    const x = el("button", "q-ikon text-bad shrink-0") as HTMLButtonElement;
    x.type = "button";
    x.dataset.eylem = "sil";
    x.setAttribute("aria-label", `${m.ad} dersini cihazdan sil`);
    x.innerHTML = SIL_SVG;
    x.addEventListener("click", async () => {
      await sil(m.uni, m.ders);
      bildir({ metin: `${m.ad} cihazdan silindi. Cevapların ve kaldığın yer duruyor.` });
    });
    kutu.append(x);
    return kutu;
  };
  const ciz = async () => {
    son = await listele();
    if (!son.length) {
      const b = el("div", "bos-durum");
      b.append(el("strong", "", "Henüz indirilen ders yok"), el("span", "", s.bos));
      kok.replaceChildren(b);
      return son;
    }
    kok.replaceChildren(...(await Promise.all(son.map(satir))));
    return son;
  };
  window.addEventListener(CEVRIMDISI_OLAYI, () => void ciz());
  addEventListener("online", () => void ciz());
  window.addEventListener(ILERLEME_OLAYI, (e) => {
    const d = (e as CustomEvent<IlerlemeOlayi>).detail;
    const dugme = kok.querySelector<HTMLButtonElement>(`[data-ders="${d.kimlik}"] [data-eylem="guncelle"]`);
    if (dugme) dugme.textContent = `%${Math.min(100, Math.floor((d.alinan / Math.max(1, d.toplam)) * 100))}`;
  });
  return { ciz };
}
