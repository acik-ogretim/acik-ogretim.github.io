// Topic drawer behaviour (components/KonuCekmece.astro). Opens on the "konu:ac" window event
// (detail: { konu: "1.1" }), fetches the topic file lazily, offers previous/next topic, linked topics,
// the questions of the topic and read-aloud (konu-okuma.ts).
import { IndeksSemasi, KonuSemasi, type Indeks, type Konu } from "../lib/konu/sema";
import { katmanAc } from "../lib/katman";
import { KonuOkuma, sesDestekli } from "./konu-okuma";
import { seritCiz, sonCiz } from "./konu-calisma";

export const KONU_AC_OLAYI = "konu:ac";
const ICINDEKILER_OLAYI = "icindekiler:ac";

export function konuCekmeceBagla(): void {
  const bulunan = document.getElementById("konu-cekmece");
  if (!(bulunan instanceof HTMLDialogElement) || bulunan.dataset.bagli) return;
  const dlg: HTMLDialogElement = bulunan;
  dlg.dataset.bagli = "1";
  const uni = dlg.dataset.uni ?? "";
  const ders = dlg.dataset.ders ?? "";
  const kok = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/konu/${uni}/${ders}`;

  const q = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const baslik = q("konu-baslik");
  const bilgi = q("konu-bilgi");
  const govde = q("konu-govde");
  const yukleniyor = q("konu-yukleniyor");
  const yok = q("konu-yok");
  const metin = q("konu-metin");
  const serit = q("konu-serit");
  const seritPanel = q("konu-serit-panel");
  const calismaSon = q("konu-calisma-son");
  const baglar = q("konu-baglantilar");
  const baglarListe = q("konu-baglantilar-liste");
  const okuDugme = q<HTMLButtonElement>("konu-oku");
  const onceki = q<HTMLButtonElement>("konu-onceki");
  const sonraki = q<HTMLButtonElement>("konu-sonraki");
  const sorular = q<HTMLButtonElement>("konu-sorular");

  const onbellek = new Map<string, Konu | null>();
  let indeks: Promise<Indeks | null> | null = null;
  let simdiki: string | null = null;
  let istek = 0;

  const okuma = new KonuOkuma(govde, (calisiyor) => {
    okuDugme.setAttribute("aria-pressed", String(calisiyor));
    okuDugme.setAttribute("aria-label", calisiyor ? "Okumayı durdur" : "Konuyu sesli oku");
    okuDugme.querySelector<HTMLElement>('[data-simge="oku"]')!.hidden = calisiyor;
    okuDugme.querySelector<HTMLElement>('[data-simge="durdur"]')!.hidden = !calisiyor;
  });

  async function json(yol: string): Promise<unknown | null> {
    try {
      const r = await fetch(yol);
      if (!r.ok || !(r.headers.get("content-type") ?? "").includes("json")) return null;
      return await r.json();
    } catch {
      return null;
    }
  }

  async function konuGetir(no: string): Promise<Konu | null> {
    if (onbellek.has(no)) return onbellek.get(no) ?? null;
    const ham = await json(`${kok}/${encodeURIComponent(no)}.json`);
    const p = KonuSemasi.safeParse(ham);
    const k = p.success ? p.data : null;
    onbellek.set(no, k);
    return k;
  }

  function indeksGetir(): Promise<Indeks | null> {
    indeks ??= json(`${kok}/index.json`).then((h) => {
      const p = IndeksSemasi.safeParse(h);
      return p.success ? p.data : null;
    });
    return indeks;
  }

  function durumGoster(d: "yukleniyor" | "yok" | "metin"): void {
    yukleniyor.hidden = d !== "yukleniyor";
    yok.hidden = d !== "yok";
    metin.hidden = d !== "metin";
    govde.setAttribute("aria-busy", String(d === "yukleniyor"));
  }

  const kartlar = (no: string): HTMLElement[] =>
    [...document.querySelectorAll<HTMLElement>(".question-card[data-konu]")].filter((c) => {
      const k = c.dataset.konu ?? "";
      return k === no || k.startsWith(`${no}.`);
    });

  function gezinme(k: Konu | null, no: string): void {
    onceki.disabled = !k?.onceki;
    sonraki.disabled = !k?.sonraki;
    onceki.dataset.hedef = k?.onceki?.no ?? "";
    sonraki.dataset.hedef = k?.sonraki?.no ?? "";
    onceki.title = k?.onceki ? `Önceki: ${k.onceki.no} ${k.onceki.baslik}` : "";
    sonraki.title = k?.sonraki ? `Sonraki: ${k.sonraki.no} ${k.sonraki.baslik}` : "";
    const n = kartlar(no).length;
    sorular.hidden = n === 0;
    sorular.textContent = n > 0 ? `Bu konudan sorular (${n})` : "Bu konudan sorular";
  }

  async function baglantilariCiz(k: Konu, sira: number): Promise<void> {
    baglar.hidden = true;
    baglarListe.replaceChildren();
    const komsu = k.baglantilar
      .filter((id) => id.startsWith(`${uni}/${ders}/`))
      .map((id) => id.slice(`${uni}/${ders}/`.length))
      .filter((no) => no !== k.onceki?.no && no !== k.sonraki?.no);
    if (komsu.length === 0) return;
    const ind = await indeksGetir();
    if (sira !== istek || !ind) return;
    const adlar = new Map(ind.uniteler.flatMap((u) => u.konular.map((x) => [x.no, x.baslik] as const)));
    for (const no of komsu) {
      const ad = adlar.get(no);
      if (!ad) continue;
      const d = document.createElement("button");
      d.type = "button";
      d.className = "katman-satir";
      d.dataset.konuGit = no;
      const a = document.createElement("span");
      a.className = "katman-satir-ad";
      a.textContent = ad;
      const n = document.createElement("span");
      n.className = "katman-satir-sag";
      n.textContent = no;
      d.append(a, n);
      baglarListe.append(d);
    }
    baglar.hidden = baglarListe.childElementCount === 0;
  }

  async function ac(no: string): Promise<void> {
    okuma.dur(true);
    simdiki = no;
    const sira = ++istek;
    baslik.textContent = `Konu ${no}`;
    bilgi.textContent = "";
    baglar.hidden = true;
    gezinme(null, no);
    seritCiz(undefined, serit, seritPanel);
    sonCiz(undefined, calismaSon);
    okuDugme.hidden = true;
    durumGoster("yukleniyor");
    katmanAc("konu-cekmece");
    govde.scrollTop = 0;
    const k = await konuGetir(no);
    if (sira !== istek) return;
    if (!k) {
      durumGoster("yok");
      return;
    }
    baslik.textContent = `${k.no} ${k.baslik}`;
    metin.innerHTML = k.html; // build output of scripts/konu-parcala.mjs: raw HTML is already dropped there
    durumGoster("metin");
    seritCiz(k.calisma, serit, seritPanel);
    sonCiz(k.calisma, calismaSon);
    gezinme(k, no);
    okuma.yukle(metin);
    okuDugme.hidden = !sesDestekli();
    okuDugme.disabled = !okuma.var;
    const ind = await indeksGetir();
    if (sira !== istek) return;
    const unite = ind?.uniteler.find((u) => u.no === k.unite);
    bilgi.textContent = [`Ünite ${k.unite}${unite ? ` ${unite.baslik}` : ""}`, `Kitap s. ${k.sayfa}`].join(" · ");
    void baglantilariCiz(k, sira);
  }

  function icindekilereGit(): void {
    const konu = simdiki;
    dlg.close();
    dispatchEvent(new CustomEvent(ICINDEKILER_OLAYI, { detail: konu ? { konu } : null }));
  }

  addEventListener(KONU_AC_OLAYI, (e) => {
    const no = (e as CustomEvent<{ konu?: string } | null>).detail?.konu;
    if (no) void ac(no);
  });
  q("konu-kapat").addEventListener("click", () => dlg.close());
  q("konu-icindekiler").addEventListener("click", icindekilereGit);
  q("konu-yok-icindekiler").addEventListener("click", icindekilereGit);
  okuDugme.addEventListener("click", () => (okuma.calisiyor ? okuma.dur() : okuma.baslat()));
  onceki.addEventListener("click", () => onceki.dataset.hedef && void ac(onceki.dataset.hedef));
  sonraki.addEventListener("click", () => sonraki.dataset.hedef && void ac(sonraki.dataset.hedef));
  baglarListe.addEventListener("click", (e) => {
    const no = (e.target as Element).closest<HTMLElement>("[data-konu-git]")?.dataset.konuGit;
    if (no) void ac(no);
  });
  sorular.addEventListener("click", () => {
    const ilk = simdiki ? kartlar(simdiki)[0] : undefined;
    dlg.close();
    if (!ilk) return;
    const sakin = matchMedia("(prefers-reduced-motion: reduce)").matches;
    ilk.scrollIntoView({ block: "start", behavior: sakin ? "auto" : "smooth" });
  });
  dlg.addEventListener("close", () => okuma.dur());
}
