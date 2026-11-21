// Study material of a topic inside the drawer (docs/konu-anlatimi.md stage 9): a thin strip above the text
// (Özet · Temel noktalar · Kavramlar) and, after the text, example, analogy, cause and effect, discussion
// and the "Kendini dene" mini test. Only fields that exist are drawn; with no `calisma` nothing is shown.
import type { Calisma, MiniTestSorusu } from "../lib/konu/calisma";

const norm = (s: string): string => s.toLocaleLowerCase("tr").trim().replace(/[.\s]+$/u, "");

function el<K extends keyof HTMLElementTagNameMap>(ad: K, sinif?: string, metin?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(ad);
  if (sinif) e.className = sinif;
  if (metin !== undefined) e.textContent = metin;
  return e;
}

// ---- Strip ----

type Parca = { ad: string; ciz: () => HTMLElement };

export function seritCiz(c: Calisma | undefined, serit: HTMLElement, panel: HTMLElement): void {
  serit.hidden = true;
  panel.hidden = true;
  panel.replaceChildren();
  serit.querySelector(".konu-serit-ciplar")?.remove();
  if (!c) return;
  const parcalar: Parca[] = [];
  if (c.ozet) parcalar.push({ ad: "Özet", ciz: () => el("p", undefined, c.ozet) });
  if (c.temelNoktalar?.length)
    parcalar.push({
      ad: "Temel noktalar",
      ciz: () => {
        const ul = el("ul");
        for (const n of c.temelNoktalar ?? []) ul.append(el("li", undefined, n));
        return ul;
      },
    });
  if (c.kavramlar?.length)
    parcalar.push({
      ad: "Kavramlar",
      ciz: () => {
        const dl = el("dl", "konu-kavramlar");
        for (const k of c.kavramlar ?? []) dl.append(el("dt", undefined, k.terim), el("dd", undefined, k.tanim));
        return dl;
      },
    });
  if (parcalar.length === 0) return;

  const ciplar = el("div", "konu-serit-ciplar katman-ciplar");
  ciplar.setAttribute("role", "group");
  ciplar.setAttribute("aria-label", "Konu çalışma özeti");
  const dugmeler = parcalar.map((p) => {
    const d = el("button", "katman-cip");
    d.type = "button";
    d.setAttribute("aria-pressed", "false");
    d.append(el("span", undefined, p.ad));
    return d;
  });
  dugmeler.forEach((d, i) =>
    d.addEventListener("click", () => {
      const acik = d.getAttribute("aria-pressed") === "true";
      dugmeler.forEach((x) => x.setAttribute("aria-pressed", "false"));
      panel.replaceChildren();
      panel.hidden = acik;
      if (!acik) {
        d.setAttribute("aria-pressed", "true");
        panel.append(parcalar[i].ciz());
      }
    }),
  );
  ciplar.append(...dugmeler);
  serit.prepend(ciplar);
  serit.hidden = false;
}

// ---- After the text ----

function bolum(ad: string): HTMLElement {
  const s = el("section", "katman-grup konu-bolum");
  s.append(el("h3", "katman-grup-ad", ad));
  return s;
}

const secenekler = (s: MiniTestSorusu): string[] =>
  s.tur === "dogruYanlis" ? ["Doğru", "Yanlış"] : (s.secenekler ?? []);

/** Index of the right option, or -1 when the answer does not match any. */
export function dogruSecenek(s: MiniTestSorusu): number {
  const liste = secenekler(s);
  const c = norm(s.cevap);
  if (s.tur === "dogruYanlis") {
    if (["doğru", "true", "d", "evet"].includes(c)) return 0;
    if (["yanlış", "false", "y", "hayır"].includes(c)) return 1;
    return -1;
  }
  const ad = liste.findIndex((x) => norm(x) === c);
  if (ad >= 0) return ad;
  const harf = /^[a-e]$/.exec(c);
  return harf ? "abcde".indexOf(harf[0]) : -1;
}

function soruCiz(s: MiniTestSorusu, no: number, bitti: (dogru: boolean) => void): HTMLElement {
  const kutu = el("div", "konu-soru");
  const baslik = el("p", "konu-soru-metin");
  baslik.append(el("span", "konu-soru-no", `${no}. `), document.createTextNode(s.soru));
  const geri = el("p", "konu-geri");
  geri.hidden = true;
  geri.setAttribute("role", "status");
  const sonuc = (dogru: boolean) => {
    geri.hidden = false;
    geri.dataset.durum = dogru ? "dogru" : "yanlis";
    geri.replaceChildren(el("strong", undefined, dogru ? "Doğru. " : `Yanlış. Doğru cevap: ${s.cevap === "true" ? "Doğru" : s.cevap === "false" ? "Yanlış" : s.cevap}. `));
    if (s.dayanak) geri.append(document.createTextNode(`Kitapta: ${s.dayanak}`));
    bitti(dogru);
  };
  kutu.append(baslik);
  const liste = secenekler(s);
  if (liste.length > 0 && !(s.tur === "bosluk" && dogruSecenek(s) < 0)) {
    const dogru = dogruSecenek(s);
    const dugmeler = liste.map((ad, i) => {
      const d = el("button", "konu-secenek");
      d.type = "button";
      d.append(el("span", "konu-secenek-harf", "ABCDE"[i] ?? ""), el("span", undefined, ad));
      d.addEventListener("click", () => {
        dugmeler.forEach((x, j) => {
          x.disabled = true;
          if (j === dogru) x.classList.add("dogru");
          else if (x === d) x.classList.add("yanlis");
        });
        d.setAttribute("aria-label", `${ad}${dogru === i ? ", doğru" : ", yanlış"}`);
        sonuc(dogru === i);
      });
      return d;
    });
    kutu.append(...dugmeler);
  } else {
    const satir = el("div", "konu-bosluk");
    const girdi = el("input", "konu-girdi");
    girdi.type = "text";
    girdi.setAttribute("aria-label", "Cevabın");
    girdi.autocomplete = "off";
    const kontrol = el("button", "katman-dugme", "Kontrol et");
    kontrol.type = "button";
    const sina = () => {
      if (!girdi.value.trim() || girdi.disabled) return;
      girdi.disabled = true;
      kontrol.disabled = true;
      sonuc(norm(girdi.value) === norm(s.cevap));
    };
    kontrol.addEventListener("click", sina);
    girdi.addEventListener("keydown", (e) => e.key === "Enter" && sina());
    satir.append(girdi, kontrol);
    kutu.append(satir);
  }
  kutu.append(geri);
  return kutu;
}

function miniTestCiz(sorular: MiniTestSorusu[]): HTMLElement {
  const b = bolum("Kendini dene");
  const kap = el("div", "konu-test");
  const ozet = el("p", "konu-test-ozet");
  ozet.hidden = true;
  ozet.setAttribute("role", "status");
  let cevaplanan = 0;
  let dogru = 0;
  const kur = () => {
    cevaplanan = 0;
    dogru = 0;
    ozet.hidden = true;
    kap.replaceChildren(
      ...sorular.map((s, i) =>
        soruCiz(s, i + 1, (d) => {
          cevaplanan++;
          if (d) dogru++;
          if (cevaplanan === sorular.length) {
            ozet.hidden = false;
            ozet.replaceChildren(el("strong", undefined, `${dogru} / ${sorular.length} doğru`));
            const tekrar = el("button", "katman-metin-dugme", "Yeniden dene");
            tekrar.type = "button";
            tekrar.addEventListener("click", kur);
            ozet.append(document.createTextNode(" "), tekrar);
          }
        }),
      ),
      ozet,
    );
  };
  kur();
  b.append(kap);
  return b;
}

export function sonCiz(c: Calisma | undefined, hedef: HTMLElement): void {
  hedef.replaceChildren();
  hedef.hidden = true;
  if (!c) return;
  const ogeler: HTMLElement[] = [];
  const duz = (ad: string, metin: string) => {
    const b = bolum(ad);
    b.append(el("p", "konu-bolum-metin", metin));
    ogeler.push(b);
  };
  if (c.ornek) duz("Örnek", c.ornek);
  if (c.benzetme) duz("Benzetme", c.benzetme);
  if (c.sebepSonuc?.length) {
    const b = bolum("Sebep ve sonuç");
    const liste = el("div", "katman-liste");
    for (const s of c.sebepSonuc) {
      const satir = el("div", "katman-satir konu-sebep");
      satir.append(el("span", undefined, s.sebep), el("span", "konu-sebep-ok", "→"), el("span", undefined, s.sonuc));
      liste.append(satir);
    }
    b.append(liste);
    ogeler.push(b);
  }
  if (c.tartisma) duz("Üzerine düşün", c.tartisma);
  if (c.miniTest?.length) ogeler.push(miniTestCiz(c.miniTest));
  if (ogeler.length === 0) return;
  hedef.append(...ogeler);
  hedef.hidden = false;
}
