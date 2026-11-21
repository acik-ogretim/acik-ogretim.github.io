// Çalışma odası: YouTube video + zaman kodlu döküm + "Şu an" paneli + konu anlatımı + mini test + vurgular.
// Veri: sayfadaki #co-veri (src/data/calisma-odasi/<ders>.json). Saf mantık: src/lib/calisma-odasi/.
import { katmanAc, katmanlariBagla } from "../lib/katman";
import { kavramMotoru } from "../lib/calisma-odasi/kavram";
import { PaketSemasi, saatYaz, satirBul, type CalismaKonu, type CalismaPaketi } from "../lib/calisma-odasi/sema";
import { demirBul, demirle, vurgulariOku, vurgulariYaz, type Vurgu } from "../lib/calisma-odasi/vurgu";

type YTOynatici = {
  getCurrentTime: () => number;
  seekTo: (sn: number, ileri: boolean) => void;
  playVideo: () => void;
  getPlayerState?: () => number;
};
type YTAyar = { videoId: string; playerVars?: Record<string, number | string>; events?: { onReady?: () => void; onError?: () => void } };
type YTGlobal = { Player: new (el: string | HTMLElement, ayar: YTAyar) => YTOynatici };
declare global {
  interface Window {
    YT?: YTGlobal;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const SEKMELER = ["dokum", "su-an", "icindekiler", "vurgular"] as const;
type Sekme = (typeof SEKMELER)[number];

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const tr = (s: string): string => s.toLocaleLowerCase("tr");
const azaltilmis = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;
const genis = (): boolean => matchMedia("(min-width: 1024px)").matches;

export function calismaOdasiBaslat(): void {
  const kok = document.getElementById("co");
  const veriEl = document.getElementById("co-veri");
  if (!kok || !veriEl) return;
  katmanlariBagla();
  const paket: CalismaPaketi = PaketSemasi.parse(JSON.parse(veriEl.textContent ?? "{}"));
  const ders = paket.ders;
  const dersYolu = kok.dataset.dersYolu ?? "/";
  const motor = kavramMotoru(paket.kavramlar);
  const konuHaritasi = new Map(paket.konular.map((k, i) => [k.no, { k, i }]));
  const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
  const ikon = (ad: string): string => document.querySelector(`#co-simgeler [data-simge="${ad}"]`)?.innerHTML ?? "";

  // Konusuz satırlar önceki konuyu sürdürür
  const etkinKonu: (string | null)[] = [];
  let son: string | null = null;
  for (const s of paket.satirlar) {
    if (s.konu) son = s.konu;
    etkinKonu.push(son);
  }

  let vurgular: Vurgu[] = vurgulariOku(ders);
  let simdiSatir = -1;
  let simdiKonu: string | null = null;
  let aktif: Sekme = "dokum";
  let sonSag: Sekme = "dokum";
  let otoDurak = 0;
  let oynatici: YTOynatici | null = null;
  let acikKonu: string | null = null;

  // ---------- Kavram bağlantıları ----------
  function kavramSar(koku: HTMLElement, ilkTek: boolean): void {
    const goruldu = new Set<number>();
    const dugumler: Text[] = [];
    const yurume = document.createTreeWalker(koku, NodeFilter.SHOW_TEXT);
    for (let n = yurume.nextNode(); n; n = yurume.nextNode()) {
      if (!(n.parentElement?.closest(".co-kavram, h3, h4, h5, mark.co-vurgu"))) dugumler.push(n as Text);
    }
    for (const d of dugumler) {
      let eslesmeler = motor.eslestir(d.data);
      if (!ilkTek) eslesmeler = eslesmeler.filter((m) => !goruldu.has(m.kavram) && (goruldu.add(m.kavram), true)); // once per line
      if (ilkTek) eslesmeler = eslesmeler.filter((m) => !goruldu.has(m.kavram) && (goruldu.add(m.kavram), true));
      if (!eslesmeler.length) continue;
      const parca = document.createDocumentFragment();
      let imlec = 0;
      for (const m of eslesmeler) {
        if (m.bas < imlec) continue;
        parca.append(d.data.slice(imlec, m.bas));
        const b = document.createElement("button");
        b.type = "button";
        b.className = "co-kavram";
        b.dataset.k = String(m.kavram);
        b.textContent = d.data.slice(m.bas, m.son);
        parca.append(b);
        imlec = m.son;
      }
      parca.append(d.data.slice(imlec));
      d.replaceWith(parca);
    }
  }

  // ---------- Vurgular ----------
  function vurguUygula(koku: HTMLElement, v: Vurgu): boolean {
    if (koku.querySelector(`mark[data-vid="${CSS.escape(v.id)}"]`)) return true;
    const bulunan = demirBul(koku.textContent ?? "", v);
    if (!bulunan) return false;
    const parcalar: [Text, number, number][] = [];
    let konum = 0;
    const yurume = document.createTreeWalker(koku, NodeFilter.SHOW_TEXT);
    for (let n = yurume.nextNode(); n; n = yurume.nextNode()) {
      const t = n as Text;
      const s = Math.max(bulunan[0], konum);
      const e = Math.min(bulunan[1], konum + t.data.length);
      if (s < e) parcalar.push([t, s - konum, e - konum]);
      konum += t.data.length;
    }
    for (const [t, s, e] of parcalar) {
      const r = document.createRange();
      r.setStart(t, s);
      r.setEnd(t, e);
      const m = document.createElement("mark");
      m.className = "co-vurgu";
      m.dataset.vid = v.id;
      r.surroundContents(m);
    }
    return true;
  }
  function vurgulariUygula(koku: HTMLElement): void {
    const hedef = koku.dataset.hedef;
    for (const v of vurgular) if (v.hedef === hedef) vurguUygula(koku, v);
  }
  function vurguKaldir(id: string): void {
    document.querySelectorAll(`mark[data-vid="${CSS.escape(id)}"]`).forEach((m) => {
      const ebeveyn = m.parentNode;
      m.replaceWith(...Array.from(m.childNodes));
      ebeveyn?.normalize();
    });
  }

  // ---------- Döküm ----------
  function dokumCiz(): void {
    const liste = $("co-dokum");
    let onceki: string | null = null;
    const parcalar: string[] = [];
    for (const s of paket.satirlar) {
      if (s.konu && s.konu !== onceki) {
        const k = konuHaritasi.get(s.konu)?.k;
        if (k) parcalar.push(`<li class="co-grup"><button type="button" data-konu-ac="${esc(k.no)}"><span>${esc(k.no)}</span><span>${esc(k.baslik)}</span></button></li>`);
        onceki = s.konu;
      }
      parcalar.push(
        `<li class="co-satir" id="co-s-${s.i}" data-i="${s.i}" tabindex="0"><span class="co-zaman">${saatYaz(s.bas)}</span><div class="co-satir-ic"><span class="co-konusmaci">${esc(s.k)}</span><p class="co-satir-metin" data-vurgu-kok data-hedef="s${s.i}">${esc(s.m)}</p></div></li>`,
      );
    }
    liste.innerHTML = parcalar.join("");
    liste.querySelectorAll<HTMLElement>(".co-satir-metin").forEach((p) => {
      kavramSar(p, false);
      vurgulariUygula(p);
    });
  }

  // ---------- Şu an ----------
  function suAnCiz(): void {
    const p = $("co-su-an");
    const kayit = simdiKonu ? konuHaritasi.get(simdiKonu) : null;
    if (!kayit) {
      p.innerHTML = `<h2>Şu an</h2><p class="co-bos">Videoyu başlat ya da dökümde bir satıra dokun; konunun özeti burada belirir.</p>`;
      return;
    }
    const k = kayit.k;
    const c = k.calisma;
    const ozet = c?.ozet ?? k.metin.split("\n").slice(0, 2).join(" ").slice(0, 320);
    const sorular = paket.sorular[String(k.unite)]?.length ?? 0;
    const noktalar = c?.temelNoktalar?.length ? `<h3 class="co-alt-baslik">Temel noktalar</h3><ul class="co-noktalar">${c.temelNoktalar.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
    const kav = c?.kavramlar?.length ? `<h3 class="co-alt-baslik">Kavramlar</h3><dl class="co-tanimlar">${c.kavramlar.map((x) => `<div><dt>${esc(x.terim)}</dt><dd>${esc(x.tanim)}</dd></div>`).join("")}</dl>` : "";
    p.innerHTML =
      `<span class="co-no">${esc(k.no)}</span><h2>${esc(k.baslik)}</h2>` +
      `<p class="co-ozet">${esc(ozet)}</p>${noktalar}${kav}` +
      `<div class="co-eylemler">` +
      `<button type="button" class="co-dugme co-dugme-birincil" data-konu-ac="${esc(k.no)}">${ikon("BookOpen")}Konu anlatımı</button>` +
      (c?.miniTest?.length ? `<button type="button" class="co-dugme" data-dene="${esc(k.no)}">${ikon("CircleHelp")}Kendini dene</button>` : "") +
      `<a class="co-dugme" href="${esc(dersYolu)}">${ikon("FileText")}Çıkmış sorular${sorular ? `, ${sorular}` : ""}</a>` +
      `</div><p class="co-bos">Çıkmış sorular ders sayfasında ünite ünite durur (Ünite ${k.unite}).</p>`;
  }

  // ---------- İçindekiler ----------
  function icindekilerCiz(): void {
    const p = document.getElementById("co-p-icindekiler");
    if (!p) return;
    p.innerHTML = paket.uniteler
      .map((u) => {
        const satirlar = u.konular
          .map((no) => {
            const k = konuHaritasi.get(no)?.k;
            if (!k) return "";
            const v = k.video ? paket.satirlar[k.video.ilk] : null;
            return `<div class="co-konu-bolum"><button type="button" class="co-konu-satir" data-git-konu="${esc(no)}"${v ? " data-videoda" : ""}><span class="co-no">${esc(no)}</span><span class="co-konu-adi">${esc(k.baslik)}</span><span class="co-video-durum">${v ? `Videoda ${saatYaz(v.bas)}` : "Videoda yok"}</span></button><button type="button" class="co-konu-yan" data-konu-ac="${esc(no)}" aria-label="${esc(k.baslik)} konu anlatımı">${ikon("BookOpen")}</button></div>`;
          })
          .join("");
        return `<h3 class="co-unite">Ünite ${u.no}${u.baslik ? `: ${esc(u.baslik)}` : ""}</h3>${satirlar}`;
      })
      .join("");
    isaretleKonu();
  }
  function isaretleKonu(): void {
    document.querySelectorAll<HTMLElement>(".co-konu-satir").forEach((b) => b.toggleAttribute("data-simdi", b.dataset.gitKonu === simdiKonu));
  }

  // ---------- Vurgularım ----------
  function vurguListesiCiz(): void {
    const p = document.getElementById("co-p-vurgular");
    if (!p) return;
    const sayac = document.querySelector<HTMLElement>('[data-sayac="vurgular"]');
    if (sayac) {
      sayac.hidden = vurgular.length === 0;
      sayac.textContent = String(vurgular.length);
    }
    if (!vurgular.length) {
      p.innerHTML = `<p class="co-bos">Henüz vurgu yok. Dökümde ya da konu metninde bir yeri seç ve Vurgula düğmesine dokun.</p>`;
      return;
    }
    p.innerHTML = [...vurgular]
      .sort((a, b) => b.zaman - a.zaman)
      .map((v) => {
        const k = v.konu ? konuHaritasi.get(v.konu)?.k : null;
        const yer = v.hedef.startsWith("s") ? `Döküm${v.sn !== null ? `, ${saatYaz(v.sn)}` : ""}` : `Konu metni`;
        return `<div class="co-vurgu-kart" data-vid="${esc(v.id)}"><blockquote>${esc(v.exact)}</blockquote><span class="co-vurgu-meta">${yer}${k ? ` · ${esc(k.no)} ${esc(k.baslik)}` : ""}</span><div class="co-vurgu-eylem"><button type="button" class="co-dugme" data-vurgu-git="${esc(v.id)}">${ikon("ArrowRight")}Git</button><button type="button" class="co-dugme" data-vurgu-sil="${esc(v.id)}">${ikon("Trash2")}Sil</button></div></div>`;
      })
      .join("");
  }

  // ---------- Sekmeler ----------
  function sekmeUygula(): void {
    kok!.querySelectorAll<HTMLElement>(".co-panel").forEach((el) => {
      const ad = el.dataset.panel as Sekme;
      el.toggleAttribute("data-aktif", ad === aktif || (genis() && ad === sonSag));
    });
    document.querySelectorAll<HTMLElement>("#co-sekmeler [data-sekme]").forEach((b) => {
      const sec = b.dataset.sekme === aktif || (genis() && aktif === "su-an" && b.dataset.sekme === sonSag);
      b.setAttribute("aria-selected", String(sec));
      b.tabIndex = sec ? 0 : -1;
    });
  }
  function sekmeGoster(ad: Sekme): void {
    aktif = ad;
    if (ad !== "su-an") sonSag = ad;
    sekmeUygula();
    if (ad === "dokum" && simdiSatir >= 0) satiriGoster(simdiSatir, true);
    else if (!genis()) scrollTo({ top: 0, behavior: "auto" }); // other panels start at their top
  }

  // ---------- Zaman ----------
  function satiriGoster(i: number, zorla = false): void {
    const el = document.getElementById(`co-s-${i}`);
    if (!el) return;
    if (!zorla && (Date.now() < otoDurak || aktif !== "dokum")) return;
    if (!zorla && aktif !== "dokum" && !genis()) return;
    const davranis: ScrollBehavior = azaltilmis() ? "auto" : "smooth";
    const r = el.getBoundingClientRect();
    if (!genis()) {
      const ust = $("co-video-kab").offsetHeight + $("co-sekmeler").offsetHeight;
      if (zorla || r.top < ust + 8 || r.bottom > innerHeight - 16) window.scrollTo({ top: scrollY + r.top - ust - (innerHeight - ust) * 0.25, behavior: davranis });
    } else {
      const sc = kok!.querySelector<HTMLElement>(".co-sag")!;
      const sr = sc.getBoundingClientRect();
      const ust = $("co-sekmeler").offsetHeight;
      if (zorla || r.top < sr.top + ust + 8 || r.bottom > sr.bottom - 16) sc.scrollTo({ top: sc.scrollTop + r.top - sr.top - ust - sr.height * 0.25, behavior: davranis });
    }
  }
  function guncelle(sn: number): void {
    const i = satirBul(paket.satirlar, sn);
    if (i === simdiSatir) return;
    document.getElementById(`co-s-${simdiSatir}`)?.removeAttribute("data-simdi");
    simdiSatir = i;
    document.getElementById(`co-s-${i}`)?.setAttribute("data-simdi", "");
    if (i >= 0) satiriGoster(i);
    const k = i >= 0 ? etkinKonu[i] : null;
    if (k !== simdiKonu) {
      simdiKonu = k;
      suAnCiz();
      isaretleKonu();
    }
  }
  function git(sn: number): void {
    if (oynatici) {
      try {
        oynatici.seekTo(sn, true);
        oynatici.playVideo();
      } catch {
        /* player not ready */
      }
    }
    otoDurak = 0;
    guncelle(sn);
  }

  // ---------- Video ----------
  function bildirim(goster: boolean): void {
    $("co-bildirim").hidden = !goster;
  }
  function videoKur(): void {
    if (!paket.video || !document.getElementById("co-oynatici")) return;
    const id = paket.video.id;
    if (navigator.onLine === false) bildirim(true);
    const olustur = (): void => {
      if (!window.YT?.Player || oynatici) return;
      oynatici = new window.YT.Player("co-oynatici", {
        videoId: id,
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: { onReady: () => bildirim(false), onError: () => bildirim(true) },
      });
    };
    if (window.YT?.Player) olustur();
    else {
      const onceki = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        onceki?.();
        olustur();
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      s.onerror = () => bildirim(true);
      document.head.append(s);
      setTimeout(() => {
        if (!oynatici) bildirim(true);
      }, 8000);
    }
    setInterval(() => {
      if (!oynatici || document.hidden) return;
      try {
        const sn = oynatici.getCurrentTime();
        if (Number.isFinite(sn)) guncelle(sn);
      } catch {
        /* not ready */
      }
    }, 300);
    addEventListener("online", () => bildirim(false));
    addEventListener("offline", () => bildirim(true));
  }

  // ---------- Katman yardımcıları ----------
  function yerlestir(el: HTMLElement, hedef: DOMRect, genislik: number): void {
    const katman = document.querySelector<HTMLDialogElement>("dialog[open]");
    const ebeveyn: HTMLElement = katman ?? kok!;
    if (el.parentElement !== ebeveyn) ebeveyn.append(el);
    el.hidden = false;
    const sol0 = katman ? katman.getBoundingClientRect().left : 0;
    const ust0 = katman ? katman.getBoundingClientRect().top : 0;
    el.style.position = katman ? "absolute" : "fixed";
    const vw = innerWidth;
    const sol = Math.min(Math.max(8, hedef.left), vw - genislik - 8);
    let ust = hedef.bottom + 8;
    const yuk = el.offsetHeight;
    if (ust + yuk > innerHeight - 8) ust = Math.max(8, hedef.top - yuk - 8);
    el.style.left = `${sol - sol0}px`;
    el.style.top = `${ust - ust0}px`;
  }
  function katmanSifirla(el: HTMLElement): void {
    el.hidden = true;
    if (el.parentElement !== kok) kok!.append(el);
  }

  // ---------- Kavram baloncuğu ----------
  const balon = $("co-balon");
  function balonAc(b: HTMLElement): void {
    const k = paket.kavramlar[Number(b.dataset.k)];
    if (!k) return;
    const konu = konuHaritasi.get(k.konu)?.k;
    balon.innerHTML = `<strong>${esc(k.terim)}</strong><p>${esc(k.tanim)}</p><button type="button" data-konu-ac="${esc(k.konu)}" data-balon-kapat>${ikon("ArrowRight")}Konuya git${konu ? `: ${esc(konu.no)}` : ""}</button>`;
    balon.hidden = false;
    yerlestir(balon, b.getBoundingClientRect(), Math.min(320, innerWidth - 24));
  }

  // ---------- Konu anlatımı ----------
  const konuKatman = $<HTMLDialogElement>("co-konu-katman");
  function konuAc(no: string): void {
    const kayit = konuHaritasi.get(no);
    if (!kayit) return;
    const k: CalismaKonu = kayit.k;
    acikKonu = no;
    $("co-konu-ad").textContent = `${k.no} ${k.baslik}`;
    $("co-konu-bilgi").textContent = `Ünite ${k.unite} · Kitap s. ${k.sayfa}`;
    const govde = $("co-konu-govde");
    govde.innerHTML = `<article class="co-konu-metin" lang="tr" data-vurgu-kok data-hedef="k${esc(k.no)}">${k.html || `<p>${esc(k.metin)}</p>`}</article>`;
    const makale = govde.firstElementChild as HTMLElement;
    kavramSar(makale, true);
    vurgulariUygula(makale);
    govde.scrollTop = 0;
    $<HTMLButtonElement>("co-onceki").disabled = kayit.i === 0;
    $<HTMLButtonElement>("co-sonraki").disabled = kayit.i === paket.konular.length - 1;
    $("co-konu-dene").hidden = !k.calisma?.miniTest?.length;
    katmanSifirla(balon);
    if (!konuKatman.open) katmanAc("co-konu-katman");
  }
  function konuGez(yon: number): void {
    const i = (acikKonu ? (konuHaritasi.get(acikKonu)?.i ?? 0) : 0) + yon;
    const k = paket.konular[i];
    if (k) konuAc(k.no);
  }

  // ---------- Kendini dene ----------
  const testKatman = $<HTMLDialogElement>("co-test-katman");
  const dogruMu = (soru: NonNullable<CalismaKonu["calisma"]>["miniTest"] extends (infer T)[] | undefined ? T : never, verilen: string): boolean => {
    const norm = (s: string): string => tr(s.trim().replace(/[.!?]+$/u, ""));
    let cevap = String(soru.cevap);
    if (soru.tur === "dogruYanlis") {
      const d = (s: string): string => (/^(true|doğru|dogru|evet)$/i.test(s.trim()) ? "doğru" : "yanlış");
      return d(cevap) === d(verilen);
    }
    if (soru.tur === "coktan" && /^[A-Ea-e]$/.test(cevap.trim()) && soru.secenekler) cevap = soru.secenekler["ABCDE".indexOf(cevap.trim().toUpperCase())] ?? cevap;
    return norm(cevap) === norm(verilen);
  };
  function testAc(no: string): void {
    const k = konuHaritasi.get(no)?.k;
    const sorular = k?.calisma?.miniTest ?? [];
    if (!k || !sorular.length) return;
    $("co-test-bilgi").textContent = `${k.no} ${k.baslik}`;
    $("co-test-govde").innerHTML =
      `<div class="co-sorular">` +
      sorular
        .map((s, i) => {
          const secenekler = s.tur === "dogruYanlis" ? ["Doğru", "Yanlış"] : (s.secenekler ?? []);
          const girdi =
            s.tur === "bosluk"
              ? `<div class="co-bosluk"><input type="text" aria-label="Cevap" autocomplete="off" autocapitalize="off" /><button type="button" class="co-dugme" data-kontrol="${i}">Kontrol et</button></div>`
              : secenekler.map((o) => `<button type="button" class="co-secenek" data-cevap="${i}" data-deger="${esc(o)}"><span>${esc(o)}</span></button>`).join("");
          return `<section class="co-soru" data-soru="${i}"><p class="co-soru-metin">${esc(s.soru)}</p>${girdi}<div class="co-cikti" aria-live="polite"></div></section>`;
        })
        .join("") +
      `</div>`;
    testKatman.dataset.konu = no;
    if (!testKatman.open) katmanAc("co-test-katman");
  }
  function cevapla(kart: HTMLElement, verilen: string): void {
    const no = testKatman.dataset.konu ?? "";
    const soru = konuHaritasi.get(no)?.k.calisma?.miniTest?.[Number(kart.dataset.soru)];
    if (!soru || kart.dataset.bitti) return;
    kart.dataset.bitti = "1";
    const dogru = dogruMu(soru, verilen);
    kart.querySelectorAll<HTMLButtonElement>(".co-secenek").forEach((b) => {
      b.disabled = true;
      const bu = b.dataset.deger ?? "";
      if (dogruMu(soru, bu)) {
        b.dataset.dogru = "";
        b.insertAdjacentHTML("beforeend", ikon("Check"));
      } else if (bu === verilen) {
        b.dataset.yanlis = "";
        b.insertAdjacentHTML("beforeend", ikon("X"));
      }
    });
    kart.querySelectorAll<HTMLElement>(".co-bosluk input, .co-bosluk button").forEach((x) => ((x as HTMLInputElement | HTMLButtonElement).disabled = true));
    const cikti = kart.querySelector<HTMLElement>(".co-cikti")!;
    cikti.innerHTML =
      `<p class="co-sonuc" ${dogru ? "data-dogru" : "data-yanlis"}>${dogru ? "Doğru" : `Yanlış. Doğru cevap: ${esc(String(soru.cevap))}`}</p>` +
      (soru.dayanak ? `<p class="co-dayanak"><b>Kitaptaki dayanak</b>${esc(soru.dayanak.replace(/\s*\[\d+\]/g, ""))}</p>` : "");
  }

  // ---------- Vurgula düğmesi ----------
  const vurgulaDugme = $<HTMLButtonElement>("co-vurgula");
  let bekleyen: { koku: HTMLElement; bas: number; son: number } | null = null;
  let secimZamani = 0;
  function secimiKontrol(): void {
    const sel = getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      bekleyen = null;
      katmanSifirla(vurgulaDugme);
      return;
    }
    const r = sel.getRangeAt(0);
    const baslangic = r.startContainer instanceof Element ? r.startContainer : r.startContainer.parentElement;
    const koku = baslangic?.closest<HTMLElement>("[data-vurgu-kok]");
    if (!koku || !kok!.contains(koku)) {
      bekleyen = null;
      katmanSifirla(vurgulaDugme);
      return;
    }
    const once = document.createRange();
    once.setStart(koku, 0);
    once.setEnd(r.startContainer, r.startOffset);
    let bas = once.toString().length;
    let son = bas + r.toString().length;
    const tam = koku.textContent ?? "";
    if (!koku.contains(r.endContainer)) son = tam.length; // selection ran past this block: clamp to its end
    son = Math.min(son, tam.length);
    while (bas < son && /\s/.test(tam[bas])) bas++;
    while (son > bas && /\s/.test(tam[son - 1])) son--;
    if (son - bas < 2) {
      bekleyen = null;
      katmanSifirla(vurgulaDugme);
      return;
    }
    bekleyen = { koku, bas, son };
    const rects = r.getClientRects();
    const hedef = rects.length ? rects[rects.length - 1] : r.getBoundingClientRect();
    yerlestir(vurgulaDugme, hedef, 120);
  }
  document.addEventListener("selectionchange", () => {
    clearTimeout(secimZamani);
    secimZamani = window.setTimeout(secimiKontrol, 180);
  });
  const basma = (e: Event): void => e.preventDefault();
  vurgulaDugme.addEventListener("mousedown", basma);
  vurgulaDugme.addEventListener("pointerdown", basma);
  vurgulaDugme.addEventListener("click", () => {
    if (!bekleyen) return;
    const { koku, bas, son: bitis } = bekleyen;
    const tam = koku.textContent ?? "";
    const hedef = koku.dataset.hedef ?? "";
    const satirNo = hedef.startsWith("s") ? Number(hedef.slice(1)) : -1;
    const v: Vurgu = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      hedef,
      konu: satirNo >= 0 ? (paket.satirlar[satirNo]?.konu ?? etkinKonu[satirNo] ?? null) : hedef.slice(1),
      ...demirle(tam, bas, bitis),
      sn: satirNo >= 0 ? (paket.satirlar[satirNo]?.bas ?? null) : null,
      zaman: Date.now(),
    };
    vurgular = [...vurgular, v];
    vurgulariYaz(ders, vurgular);
    getSelection()?.removeAllRanges();
    bekleyen = null;
    katmanSifirla(vurgulaDugme);
    vurguUygula(koku, v);
    vurguListesiCiz();
  });

  // ---------- Olaylar ----------
  kok.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const kav = t.closest<HTMLElement>(".co-kavram");
    if (kav) {
      e.stopPropagation();
      if (!balon.hidden && balon.dataset.kaynak === kav.dataset.k) katmanSifirla(balon);
      else {
        balonAc(kav);
        balon.dataset.kaynak = kav.dataset.k ?? "";
      }
      return;
    }
    const sekme = t.closest<HTMLElement>("[data-sekme]");
    if (sekme) return sekmeGoster(sekme.dataset.sekme as Sekme);
    const ac = t.closest<HTMLElement>("[data-konu-ac]");
    if (ac) {
      katmanSifirla(balon);
      return konuAc(ac.dataset.konuAc ?? "");
    }
    const dene = t.closest<HTMLElement>("[data-dene]");
    if (dene) return testAc(dene.dataset.dene ?? "");
    const gitKonu = t.closest<HTMLElement>("[data-git-konu]");
    if (gitKonu) {
      const k = konuHaritasi.get(gitKonu.dataset.gitKonu ?? "")?.k;
      if (k?.video) {
        git(paket.satirlar[k.video.ilk].bas);
        if (!genis()) {
          sekmeGoster("su-an");
          scrollTo({ top: 0, behavior: azaltilmis() ? "auto" : "smooth" });
        }
      } else if (k) konuAc(k.no);
      return;
    }
    const vg = t.closest<HTMLElement>("[data-vurgu-git]");
    if (vg) return vurguyaGit(vg.dataset.vurguGit ?? "");
    const vs = t.closest<HTMLElement>("[data-vurgu-sil]");
    if (vs) {
      const id = vs.dataset.vurguSil ?? "";
      vurgular = vurgular.filter((v) => v.id !== id);
      vurgulariYaz(ders, vurgular);
      vurguKaldir(id);
      return vurguListesiCiz();
    }
    const kapat = t.closest<HTMLElement>("[data-kapat]");
    if (kapat) return void kapat.closest("dialog")?.close();
    const secenek = t.closest<HTMLElement>(".co-secenek");
    if (secenek) return cevapla(secenek.closest<HTMLElement>(".co-soru")!, secenek.dataset.deger ?? "");
    const kontrol = t.closest<HTMLElement>("[data-kontrol]");
    if (kontrol) {
      const kart = kontrol.closest<HTMLElement>(".co-soru")!;
      return cevapla(kart, kart.querySelector("input")?.value ?? "");
    }
    const satir = t.closest<HTMLElement>(".co-satir");
    if (satir && !getSelection()?.toString()) {
      katmanSifirla(balon);
      git(paket.satirlar[Number(satir.dataset.i)].bas);
    }
  });
  kok.addEventListener("keydown", (e) => {
    const t = e.target as HTMLElement;
    if ((e.key === "Enter" || e.key === " ") && t.classList.contains("co-satir")) {
      e.preventDefault();
      git(paket.satirlar[Number(t.dataset.i)].bas);
    }
    if (e.key === "Enter" && t.matches(".co-bosluk input")) t.closest(".co-soru")?.querySelector<HTMLElement>("[data-kontrol]")?.click();
  });
  document.addEventListener("pointerdown", (e) => {
    const t = e.target as Element;
    if (!balon.hidden && !t.closest(".co-balon, .co-kavram")) katmanSifirla(balon);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") katmanSifirla(balon);
  });
  $("co-onceki").addEventListener("click", () => konuGez(-1));
  $("co-sonraki").addEventListener("click", () => konuGez(1));
  $("co-konu-dene").addEventListener("click", () => acikKonu && testAc(acikKonu));
  konuKatman.addEventListener("close", () => {
    katmanSifirla(balon);
    katmanSifirla(vurgulaDugme);
  });
  addEventListener("wheel", () => (otoDurak = Date.now() + 6000), { passive: true });
  addEventListener("touchmove", () => (otoDurak = Date.now() + 6000), { passive: true });
  matchMedia("(min-width: 1024px)").addEventListener("change", sekmeUygula);

  function vurguyaGit(id: string): void {
    const v = vurgular.find((x) => x.id === id);
    if (!v) return;
    if (v.hedef.startsWith("s")) {
      sekmeGoster("dokum");
      const i = Number(v.hedef.slice(1));
      requestAnimationFrame(() => {
        satiriGoster(i, true);
        document.querySelector(`mark[data-vid="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest" });
      });
    } else {
      konuAc(v.hedef.slice(1));
      requestAnimationFrame(() => document.querySelector(`#co-konu-govde mark[data-vid="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "center", behavior: azaltilmis() ? "auto" : "smooth" }));
    }
  }

  // Yapışık video yüksekliği sekmelerin yapışma konumunu belirler
  const videoKab = $("co-video-kab");
  const yukseklik = (): void => kok.style.setProperty("--co-video-h", `${videoKab.offsetHeight}px`);
  new ResizeObserver(yukseklik).observe(videoKab);
  yukseklik();

  dokumCiz();
  icindekilerCiz();
  vurguListesiCiz();
  suAnCiz();
  sekmeUygula();
  videoKur();
  // Test ve ileri kullanım için: dışarıdan zaman vermek
  (window as unknown as { coZaman?: (sn: number) => void }).coZaman = guncelle;
}
