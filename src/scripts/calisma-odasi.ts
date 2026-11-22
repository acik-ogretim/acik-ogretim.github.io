// Çalışma odası: YouTube video + zaman kodlu döküm + "Şu an" paneli + konu anlatımı + mini test + vurgular.
// Veri: sayfadaki #co-veri (src/data/calisma-odasi/<ders>.json). Saf mantık: src/lib/calisma-odasi/.
import { katmanAc, katmanlariBagla } from "../lib/katman";
import { kavramMotoru } from "../lib/calisma-odasi/kavram";
import { CESIT_ADI, PaketSemasi, medyaAdi, medyaCipEtiketi, saatYaz, satirBul, type CalismaKonu, type CalismaPaketi, type CalismaMedyasi, type CalismaSatiri, type CalismaVideosu } from "../lib/calisma-odasi/sema";
import { cevaplarOku, cevaplarYaz } from "../lib/calisma-durumu";
import { demirBul, demirle, vurgulariOku, vurgulariYaz, type Vurgu } from "../lib/calisma-odasi/vurgu";
import { anlatimHtml, aramaYap, mdHtml, dusunHtml, kitaptaParagraf, konuDurumu, sorulariKonuyaDagit, uniteBaskiHtml, zayifKonular, type AkisSoru } from "../lib/calisma-odasi/akis";
import { yildizKimligi, yildizlariOku, yildizlariYaz, type Yildiz } from "../lib/calisma-odasi/yildiz";
import { KonuOkuma, sesDestekli } from "./konu-okuma";
import { pipAcKapat, pipDestekli } from "./calisma-pip";

type YTOynatici = {
  getCurrentTime: () => number;
  seekTo: (sn: number, ileri: boolean) => void;
  playVideo: () => void;
  loadVideoById?: (id: string, bas?: number) => void;
  cueVideoById?: (id: string, bas?: number) => void;
  pauseVideo?: () => void;
  getPlayerState?: () => number;
  setPlaybackRate?: (hiz: number) => void;
  getPlaybackRate?: () => number;
};
type YTAyar = { videoId: string; playerVars?: Record<string, number | string>; events?: { onReady?: () => void; onError?: () => void } };
type YTGlobal = { Player: new (el: string | HTMLElement, ayar: YTAyar) => YTOynatici };
declare global {
  interface Window {
    YT?: YTGlobal;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const SEKMELER = ["akis", "dokum", "su-an", "icindekiler", "sinav", "vurgular"] as const;
type Sekme = (typeof SEKMELER)[number];

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const tr = (s: string): string => s.toLocaleLowerCase("tr");
type Soru = AkisSoru;
const SORU_ONBELLEGI = "calisma-sorular"; // own cache name: the service worker keeps names without its prefix
const KANAL_ADRESI = "https://quiz.zeki.website/duzenle";
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

  const videolar = paket.medyalar;
  const uni = kok.dataset.uni ?? paket.uni;
  const dersKodu = `${uni}/${ders}`; // ders sayfasıyla aynı cevap kaydı: cevaplar-<uni>-<ders>
  const videoAnahtari = `calisma-video-${ders}`;
  let istenen: string | null = new URLSearchParams(location.search).get("video");
  if (!istenen) {
    try {
      istenen = localStorage.getItem(videoAnahtari);
    } catch {
      /* storage unavailable */
    }
  }
  let vi = Math.max(0, videolar.findIndex((v) => v.id === istenen));
  let video: CalismaVideosu | null = videolar[vi] ?? null;
  let satirlar: CalismaSatiri[] = video?.satirlar ?? [];
  // Konusuz satırlar önceki konuyu sürdürür
  let etkinKonu: (string | null)[] = [];
  function etkinHesapla(): void {
    let son: string | null = null;
    etkinKonu = satirlar.map((s) => (s.konu ? (son = s.konu) : son));
  }
  etkinHesapla();
  // Vurgu hedefi: ilk video "s<i>" (eski kayıtlarla uyumlu), diğerleri "s<kod>:<i>"
  const satirHedefi = (i: number): string => (vi === 0 || !video ? `s${i}` : `s${video.id}:${i}`);
  const satirCoz = (h: string): { kod: string; i: number } | null => {
    const m = /^s(?:([^:]+):)?(\d+)$/.exec(h);
    return m ? { kod: m[1] ?? videolar[0]?.id ?? "", i: Number(m[2]) } : null;
  };

  let vurgular: Vurgu[] = vurgulariOku(ders);
  let yildizlar: Yildiz[] = yildizlariOku(uni, ders);
  let simdiSatir = -1;
  let simdiKonu: string | null = null;
  let secKonu: string | null = null; // elle seçilen konu (videoda olmayan konular ya da videosuz ders)
  const akisVar = paket.konular.length > 0;
  if (akisVar) kok.dataset.akis = "";
  let aktif: Sekme = akisVar ? "akis" : satirlar.length ? "dokum" : "su-an"; // konu konu akışı birincil görünümdür
  let sonSag: Sekme = akisVar ? "akis" : satirlar.length ? "dokum" : "icindekiler";
  let otoDurak = 0;
  let oynatici: YTOynatici | null = null; // geçerli medyanın oynatıcısı (YouTube ya da ses)
  let acikKonu: string | null = null;
  const gorunenKonu = (): string | null => secKonu ?? simdiKonu;

  // ---------- Kavram bağlantıları ----------
  function kavramSar(koku: HTMLElement, ilkTek: boolean): void {
    // once per paragraph or list item, in every view: a name met again three paragraphs later is underlined again
    // (Zeki, 21 Nov 2026: Max Weber looked untagged because only its first occurrence in the topic was)
    void ilkTek;
    const paragraflar = new WeakMap<Element, Set<number>>();
    const gorulduKumesi = (d: Text): Set<number> => {
      const p = d.parentElement?.closest("p, li, dd, td, blockquote") ?? koku;
      let k = paragraflar.get(p);
      if (!k) paragraflar.set(p, (k = new Set<number>()));
      return k;
    };
    const dugumler: Text[] = [];
    const yurume = document.createTreeWalker(koku, NodeFilter.SHOW_TEXT);
    for (let n = yurume.nextNode(); n; n = yurume.nextNode()) {
      if (!(n.parentElement?.closest(".co-kavram, h3, h4, h5, dt, mark.co-vurgu"))) dugumler.push(n as Text);
    }
    for (const d of dugumler) {
      let eslesmeler = motor.eslestir(d.data);
      const goruldu = gorulduKumesi(d);
      eslesmeler = eslesmeler.filter((m) => !goruldu.has(m.kavram) && (goruldu.add(m.kavram), true));
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
      if (v.not) m.title = v.not;
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
    if (!satirlar.length) {
      liste.innerHTML = `<li class="co-bos">${video ? "Bu video için döküm yok." : "Bu ders için video ve döküm yok. Konular sekmesinden konu anlatımına geç."}</li>`;
      return;
    }
    // Reads like prose: consecutive lines of one speaker form a paragraph with a listen button; each sentence stays
    // its own element (id co-s-<i>) so the playing line lights up, a click seeks there and highlights keep their keys.
    let onceki: string | null = null;
    const parcalar: string[] = [];
    let paragraf: string[] = [];
    let paragrafKonusmaci: string | null = null;
    let paragrafUzunluk = 0;
    const paragrafiKapat = (): void => {
      if (paragraf.length) parcalar.push(`${paragraf.join(" ")}</li>`);
      paragraf = [];
      paragrafKonusmaci = null;
      paragrafUzunluk = 0;
    };
    for (const s of satirlar) {
      if (s.konu && s.konu !== onceki) {
        paragrafiKapat();
        const k = konuHaritasi.get(s.konu)?.k;
        if (k) parcalar.push(`<li class="co-grup"><button type="button" data-git-konu="${esc(k.no)}"><span>${esc(k.goster ?? k.no)}</span><span>${esc(k.baslik)}</span></button></li>`);
        onceki = s.konu;
      }
      if (s.k !== paragrafKonusmaci || paragrafUzunluk > 900) {
        paragrafiKapat();
        paragrafKonusmaci = s.k;
        paragraf.push(`<li class="co-paragraf"><button type="button" class="co-dinle" data-dinle="${s.i}" aria-label="${esc(s.k)}, ${saatYaz(s.bas)} noktasından dinle" title="${saatYaz(s.bas)}">${ikon("Headphones")}</button>`);
      }
      const soruBag = s.q ? ` <button type="button" class="co-soru-bag" data-soru-git="${esc(s.q)}" data-unite="${s.u ?? ""}">${ikon("ListChecks")}Soruya git</button>` : "";
      paragraf.push(`<span class="co-satir" id="co-s-${s.i}" data-i="${s.i}" tabindex="0"><span class="co-satir-metin" data-vurgu-kok data-hedef="${satirHedefi(s.i)}">${esc(s.m)}</span></span>${soruBag}`);
      paragrafUzunluk += s.m.length;
    }
    paragrafiKapat();
    liste.innerHTML = parcalar.join("");
    liste.querySelectorAll<HTMLElement>(".co-satir-metin").forEach((p) => {
      kavramSar(p, false);
      vurgulariUygula(p);
    });
  }

  // ---------- Şu an ----------
  const sonKonuAnahtari = `calisma-konu-${ders}`;
  function varsayilanKonu(): { no: string; kaldigin: boolean } | null {
    let kayitli: string | null = null;
    try {
      kayitli = localStorage.getItem(sonKonuAnahtari);
    } catch {
      /* storage unavailable */
    }
    if (kayitli && konuHaritasi.has(kayitli)) return { no: kayitli, kaldigin: true };
    const ilk = paket.konular[0]?.no;
    return ilk ? { no: ilk, kaldigin: false } : null;
  }
  function suAnCiz(): void {
    const p = $("co-su-an");
    const secili = secKonu !== null;
    const calan = !secili && simdiKonu !== null;
    const varsayilan = !secili && !calan ? varsayilanKonu() : null;
    const gk = secKonu ?? simdiKonu ?? varsayilan?.no ?? null;
    const kayit = gk ? konuHaritasi.get(gk) : null;
    // Telefondaki sekme adı da duruma göre değişir
    const sekmeDugme = document.querySelector<HTMLElement>('#co-sekmeler [data-sekme="su-an"]');
    if (sekmeDugme?.firstChild) sekmeDugme.firstChild.textContent = calan || !kayit ? "Şu an" : "Konu";
    if (!kayit) {
      p.setAttribute("aria-label", "Şu an");
      p.innerHTML = `<h2>Şu an</h2><p class="co-bos">Konular sekmesinden bir konu seç; özeti ve temel noktaları burada belirir.</p>`;
      return;
    }
    const k = kayit.k;
    p.setAttribute("aria-label", calan ? "Şu an" : k.baslik);
    if (secili) {
      try {
        localStorage.setItem(sonKonuAnahtari, k.no);
      } catch {
        /* storage unavailable */
      }
    }
    const etiket = calan ? "Şu an" : secili ? "Seçtiğin konu" : varsayilan?.kaldigin ? "Kaldığın konu" : "İlk konu";
    const c = k.calisma;
    const ozet = c?.ozet ?? "";
    const sorular = paket.sorular[String(k.unite)]?.length ?? 0;
    const noktalar = c?.temelNoktalar?.length ? `<h3 class="co-alt-baslik">Temel noktalar</h3><ul class="co-noktalar">${c.temelNoktalar.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
    const kav = c?.kavramlar?.length ? `<h3 class="co-alt-baslik">Kavramlar</h3><dl class="co-tanimlar">${c.kavramlar.map((x) => `<div><dt>${esc(x.terim)}</dt><dd>${esc(x.tanim)}</dd></div>`).join("")}</dl>` : "";
    // Serbest uzunlukta listeler (0..n): boş olan bölüm hiç görünmez
    const maddeler = (baslik: string, liste: string[] | undefined): string =>
      liste?.length ? `<h3 class="co-alt-baslik">${baslik}</h3><ul class="co-noktalar">${liste.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
    const sebepSonuc = c?.sebepSonuclar?.length
      ? `<h3 class="co-alt-baslik">Sebep ve sonuç</h3><ul class="co-noktalar">${c.sebepSonuclar.map((x) => `<li><b>Sebep:</b> ${esc(x.sebep)} <b>Sonuç:</b> ${esc(x.sonuc)}</li>`).join("")}</ul>`
      : "";
    const ekler = sebepSonuc + maddeler("Örnekler", c?.ornekler) + maddeler("Benzetmeler", c?.benzetmeler) + maddeler("Üzerine düşün", c?.tartismaSorulari);
    // Çalışma malzemesi olmayan konuda kitabın kendi metni gösterilir
    const kitap = !c
      ? `<h3 class="co-alt-baslik">Kitaptan</h3>${k.metin
          .split("\n")
          .filter((x) => x.trim())
          .reduce<string[]>((acc, x) => (acc.join("").length < 1400 ? [...acc, x] : acc), [])
          .map((x) => `<p class="co-ozet">${esc(x)}</p>`)
          .join("")}`
      : "";
    const don = video && !calan ? `<button type="button" class="co-dugme" data-videoya-don>${ikon("Play")}Videoya dön</button>` : "";
    p.innerHTML =
      `<div class="co-su-ust"><span class="co-etiket">${etiket}</span>${don}</div>` +
      `<span class="co-no">${esc(k.goster ?? k.no)}</span><h2>${esc(k.baslik)}</h2>` +
      `<div class="co-su-metin" data-vurgu-kok data-hedef="o${esc(k.no)}">` +
      (ozet ? `<p class="co-ozet">${esc(ozet)}</p>` : "") +
      `${noktalar}${kav}${ekler}${kitap}</div>` +
      `<div class="co-eylemler">` +
      `<button type="button" class="co-dugme co-dugme-birincil" data-konu-ac="${esc(k.no)}">${ikon("BookOpen")}Konu anlatımı</button>` +
      (c?.miniTest?.length ? `<button type="button" class="co-dugme" data-dene="${esc(k.no)}">${ikon("CircleHelp")}Kendini dene</button>` : "") +
      (sorular ? `<button type="button" class="co-dugme" data-sinav-konu="${esc(k.no)}">${ikon("ListChecks")}Bu konunun soruları</button>` : "") +
      `<a class="co-dugme" href="${esc(dersYolu)}">${ikon("FileText")}Ders sayfası</a>` +
      `</div>`;
    // Dökümdekiyle aynı kavram bileşeni: altı çizili terimler, tanım balonu, "Konuya git"
    const metin = p.querySelector<HTMLElement>(".co-su-metin");
    if (metin) {
      kavramSar(metin, true);
      vurgulariUygula(metin);
    }
  }

  // ---------- İçindekiler ----------
  function icindekilerCiz(): void {
    const p = document.getElementById("co-p-icindekiler");
    if (!p) return;
    p.innerHTML = paket.uniteler
      .map((u) => {
        const konuSatirlari = u.konular
          .map((no) => {
            const k = konuHaritasi.get(no)?.k;
            if (!k) return "";
            const m = dizidekiMedya(no);
            const kv = m ? k.video[m.id] : undefined;
            const v = m && kv ? m.satirlar[kv.ilk] : null;
            const yer = video?.tur === "ses" ? "Anlatımda" : "Videoda";
            return `<div class="co-konu-bolum"><button type="button" class="co-konu-satir" data-git-konu="${esc(no)}"${v ? " data-videoda" : ""}><span class="co-no">${esc(k.goster ?? no)}</span><span class="co-konu-adi">${esc(k.baslik)}</span>${video ? `<span class="co-video-durum">${v ? `${yer} ${m !== video && m?.unite ? `${m.unite}. ünite · ` : ""}${saatYaz(v.bas)}` : `${yer} yok`}</span>` : ""}</button><button type="button" class="co-konu-yan" data-konu-ac="${esc(no)}" aria-label="${esc(k.baslik)} konu anlatımı">${ikon("BookOpen")}</button></div>`;
          })
          .join("");
        return `<h3 class="co-unite">Ünite ${u.no}${u.baslik ? `: ${esc(u.baslik)}` : ""}</h3>${konuSatirlari}`;
      })
      .join("");
    isaretleKonu();
  }
  function isaretleKonu(): void {
    if (aktif === "sinav" && sinavIzle) void sinavCiz(); // konu değişti: Sınav sekmesi de değişir
    document.querySelectorAll<HTMLElement>(".co-konu-satir").forEach((b) => b.toggleAttribute("data-simdi", b.dataset.gitKonu === gorunenKonu()));
    document.querySelectorAll<HTMLElement>(".co-ak-blok").forEach((b) => b.toggleAttribute("data-simdi", b.dataset.akKonu === gorunenKonu()));
    videoSecCiz();
  }

  // ---------- Vurgularım ----------
  function vurguListesiCiz(): void {
    const p = document.getElementById("co-p-vurgular");
    if (!p) return;
    const sayac = document.querySelector<HTMLElement>('[data-sayac="vurgular"]');
    const toplam = vurgular.length + yildizlar.length;
    if (sayac) {
      sayac.hidden = toplam === 0;
      sayac.textContent = String(toplam);
    }
    if (!toplam) {
      p.innerHTML = `<p class="co-bos">Henüz vurgu ya da yıldızlı kavram yok. Dökümde, konu metninde ya da Şu an panelinde bir yeri seç ve Vurgula düğmesine dokun; bir kavrama dokunup yıldız koyabilirsin.</p>`;
      return;
    }
    const yildizHtml = yildizlar.length
      ? `<h3 class="co-alt-baslik" id="co-yildizli">Yıldızlı kavramlar</h3>` +
        [...yildizlar]
          .sort((a, b) => b.zaman - a.zaman)
          .map((y) => {
            const kv = paket.kavramlar.find((x) => x.terim === y.terim && x.konu === y.konu);
            const k = konuHaritasi.get(y.konu)?.k;
            return `<div class="co-vurgu-kart" data-yildiz-kart="${esc(yildizKimligi(y))}"><strong>${esc(y.terim)}</strong>${kv ? `<p class="co-ozet">${esc(kv.tanim)}</p>` : ""}<span class="co-vurgu-meta">${k ? `${esc(k.goster ?? k.no)} ${esc(k.baslik)}` : esc(y.konu)}</span><div class="co-vurgu-eylem"><button type="button" class="co-dugme" data-git-konu="${esc(y.konu)}">${ikon("ArrowRight")}Konuya git</button><button type="button" class="co-dugme" data-yildiz-kaldir="${esc(yildizKimligi(y))}">${ikon("Star")}Yıldızı kaldır</button></div></div>`;
          })
          .join("")
      : "";
    const vurguHtml = vurgular.length
      ? (yildizlar.length ? `<h3 class="co-alt-baslik">Vurgularım</h3>` : "") +
        [...vurgular]
          .sort((a, b) => b.zaman - a.zaman)
          .map((v) => {
            const k = v.konu ? konuHaritasi.get(v.konu)?.k : null;
            const yer = satirCoz(v.hedef) ? `Döküm${v.sn !== null ? `, ${saatYaz(v.sn)}` : ""}` : v.hedef.startsWith("o") ? "Konu özeti" : `Konu metni`;
            return `<div class="co-vurgu-kart" data-vid="${esc(v.id)}"><blockquote>${esc(v.exact)}</blockquote>${v.not ? `<p class="co-vurgu-not">${esc(v.not)}</p>` : ""}<span class="co-vurgu-meta">${yer}${k ? ` · ${esc(k.goster ?? k.no)} ${esc(k.baslik)}` : ""}</span><div class="co-vurgu-eylem"><button type="button" class="co-dugme" data-vurgu-git="${esc(v.id)}">${ikon("ArrowRight")}Git</button><button type="button" class="co-dugme" data-vurgu-sil="${esc(v.id)}">${ikon("Trash2")}Sil</button></div></div>`;
          })
          .join("")
      : "";
    p.innerHTML = yildizHtml + vurguHtml;
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
    if (ad === "sinav" && (sinavIzle || !document.querySelector("#co-p-sinav .co-cip"))) void sinavCiz();
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
    const i = satirBul(satirlar, sn);
    if (i === simdiSatir) return;
    document.getElementById(`co-s-${simdiSatir}`)?.removeAttribute("data-simdi");
    simdiSatir = i;
    document.getElementById(`co-s-${i}`)?.setAttribute("data-simdi", "");
    if (i >= 0) satiriGoster(i);
    const k = i >= 0 ? etkinKonu[i] : null;
    if (k !== simdiKonu) {
      simdiKonu = k;
      secKonu = null; // video yeni konuya geçti: elle seçim biter
      suAnCiz();
      isaretleKonu();
      akisIzle();
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

  // ---------- Konuya git: çekmece yok, Şu an paneli konuya geçer ----------
  // Konu videoda geçiyorsa video o saniyeye konumlanır (otomatik oynatma yok) ve döküm oraya kayar.
  function konuyaGit(no: string, itme = true): void {
    const k = konuHaritasi.get(no)?.k;
    if (!k) return;
    katmanSifirla(balon);
    document.querySelectorAll<HTMLDialogElement>("dialog[open]").forEach((d) => d.close());
    const calarken = caliyorMu();
    medyaKonuyaUydur(no);
    const kv = video ? k.video[video.id] : undefined;
    const satir = kv ? satirlar[kv.ilk] : undefined;
    if (kv && satir) {
      secKonu = null;
      if (oynatici) {
        try {
          oynatici.seekTo(satir.bas, true);
          // Jumping while listening keeps playing from the new place; a paused player stays paused there.
          if (calarken) oynatici.playVideo();
          else oynatici.pauseVideo?.();
        } catch {
          /* player not ready */
        }
      }
      otoDurak = 0;
      guncelle(satir.bas);
    } else secKonu = k.no; // videoda yok ya da videosuz ders
    suAnCiz();
    isaretleKonu();
    if (itme) {
      const url = new URL(location.href);
      url.searchParams.set("konu", no);
      url.searchParams.delete("sekme");
      history.pushState({ konu: no }, "", url);
    }
    if (akisVar) {
      elleKaydirdi = false;
      sekmeGoster("akis");
      akisKaydir(no);
    } else if (!genis()) {
      sekmeGoster("su-an");
      scrollTo({ top: 0, behavior: azaltilmis() ? "auto" : "smooth" });
    } else if (kv && satir && sonSag === "dokum") satiriGoster(kv.ilk, true);
  }
  addEventListener("popstate", () => {
    const no = new URLSearchParams(location.search).get("konu");
    if (no) konuyaGit(no, false);
    else {
      secKonu = null;
      suAnCiz();
      isaretleKonu();
    }
  });

  // ---------- Medya: YouTube videosu ve ses, konuya göre seçici ----------
  function bildirim(goster: boolean): void {
    $("co-bildirim").hidden = !goster;
  }
  const cesitAnahtari = `calisma-cesit-${ders}`;
  let tercihCesit: string | null = null; // kullanıcının en son elle seçtiği medya çeşidi
  let tercihMedya: string | null = istenen; // kullanıcının en son elle seçtiği medya
  try {
    tercihCesit = localStorage.getItem(cesitAnahtari);
  } catch {
    /* storage unavailable */
  }
  let otoMedya = false; // medya konuya göre kendiliğinden değişti
  let ytOynatici: YTOynatici | null = null;
  let okuma: KonuOkuma | null = null;
  let okuyan = "";
  let sesOynatici: YTOynatici | null = null;
  let sonOynaticiSn = 0;
  const sesEl = (): HTMLAudioElement | null => document.querySelector<HTMLAudioElement>("#co-ses audio");

  function ytKur(): void {
    if (ytOynatici || !video || video.tur !== "youtube" || !document.getElementById("co-oynatici")) return;
    if (navigator.onLine === false) bildirim(true);
    const olustur = (): void => {
      if (!window.YT?.Player || ytOynatici) return;
      ytOynatici = new window.YT.Player("co-oynatici", {
        videoId: video?.tur === "youtube" ? video.kaynak : "",
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            bildirim(false);
            ytHizUygula(kayitliHiz());
          },
          onError: () => bildirim(true),
        },
      });
      if (video?.tur === "youtube") oynatici = ytOynatici;
    };
    if (window.YT?.Player) olustur();
    else {
      const onceki = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        onceki?.();
        olustur();
      };
      const sc = document.createElement("script");
      sc.src = "https://www.youtube.com/iframe_api";
      sc.async = true;
      sc.onerror = () => bildirim(true);
      document.head.append(sc);
      setTimeout(() => {
        if (!ytOynatici) bildirim(true);
      }, 8000);
    }
  }

  // Ses: HTML audio, kapak, dalga biçimli ilerleme çubuğu; YouTube oynatıcısıyla aynı küçük arayüz
  const SES_HIZLARI = [1, 1.25, 1.5, 1.75, 2, 0.85];
  const HIZ_ANAHTARI = "calisma-ses-hizi";
  // video speed without opening YouTube's settings: one chip on the player, same remembered speed as the audio
  function ytHizUygula(hiz: number): void {
    try {
      ytOynatici?.setPlaybackRate?.(hiz);
    } catch {
      /* player not ready */
    }
    const d = document.getElementById("co-yt-hiz");
    if (d) {
      d.textContent = `${hiz}×`;
      d.setAttribute("aria-label", `Oynatma hızı ${hiz}, değiştir`);
    }
  }
  const kayitliHiz = (): number => {
    try {
      const h = Number(localStorage.getItem(HIZ_ANAHTARI));
      return SES_HIZLARI.includes(h) ? h : 1;
    } catch {
      return 1;
    }
  };
  function dalgaCubuklari(m: CalismaMedyasi): number[] {
    const N = 120;
    if (m.dalga?.length) return m.dalga;
    const sure = m.sure ?? m.satirlar[m.satirlar.length - 1]?.bit ?? 1;
    const kutu = new Array<number>(N).fill(0);
    for (const s of m.satirlar) {
      const sn = Math.max(0.5, s.bit - s.bas);
      const yog = s.m.length / sn;
      const a = Math.floor((s.bas / sure) * N);
      const z = Math.min(N - 1, Math.floor((s.bit / sure) * N));
      for (let i = a; i <= z; i++) kutu[i] = Math.max(kutu[i], yog);
    }
    const en = Math.max(...kutu, 1);
    return kutu.map((x) => Math.max(0.12, x / en));
  }
  function sesKur(): void {
    const kap = document.getElementById("co-ses");
    if (!kap || sesOynatici) return;
    kap.innerHTML =
      `<audio preload="metadata" playsinline></audio>` +
      // One compact row so the text below keeps the screen: play, title + time over the waveform, then -15 / +15 / speed.
      `<div class="co-ses-satir"><button type="button" class="co-ses-oynat" data-ses="oynat" aria-label="Oynat">${ikon("Play")}</button>` +
      `<div class="co-ses-orta"><div class="co-ses-bilgi"><strong id="co-ses-baslik"></strong><span id="co-ses-zaman" class="co-ses-zaman">0:00 / 0:00</span></div>` +
      `<div class="co-dalga" id="co-dalga" role="slider" tabindex="0" aria-label="Ses konumu" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0"><div class="co-dalga-cubuklar" id="co-dalga-bos"></div><div class="co-dalga-cubuklar co-dalga-dolu" id="co-dalga-dolu"></div></div></div>` +
      `<div class="co-ses-kontrol"><button type="button" class="co-ses-dugme" data-ses="geri" aria-label="15 saniye geri" title="15 saniye geri">${ikon("RotateCcw")}</button><button type="button" class="co-ses-dugme" data-ses="ileri" aria-label="15 saniye ileri" title="15 saniye ileri">${ikon("RotateCw")}</button><button type="button" class="co-ses-hiz" data-ses="hiz" aria-label="Oynatma hızı">1×</button></div></div>`;
    const el = sesEl()!;
    let bekleyen: number | null = null;
    el.addEventListener("loadedmetadata", () => {
      if (bekleyen !== null) {
        el.currentTime = bekleyen;
        bekleyen = null;
      }
      sesZamaniYaz();
    });
    for (const ad of ["timeupdate", "play", "pause", "ended", "seeked"]) el.addEventListener(ad, sesZamaniYaz);
    // The chosen speed survives new sources and visits: setting src resets playbackRate to defaultPlaybackRate.
    const hizUygula = (): void => {
      const hiz = kayitliHiz();
      el.defaultPlaybackRate = hiz;
      el.playbackRate = hiz;
      const d = document.querySelector<HTMLElement>('[data-ses="hiz"]');
      if (d) d.textContent = `${hiz}×`;
    };
    hizUygula();
    el.addEventListener("loadedmetadata", hizUygula);
    // A unit's narration ends: the next unit's narration starts by itself.
    el.addEventListener("ended", () => {
      const sonraki = video?.cesit === "uzun-anlatim" && video.unite ? videolar.find((v) => v.tur === "ses" && v.cesit === "uzun-anlatim" && v.unite === (video?.unite ?? 0) + 1) : undefined;
      if (!sonraki) return;
      videoDegistir(sonraki.id);
      elleKaydirdi = false;
      sesOynatici?.seekTo(0, true);
      sesOynatici?.playVideo();
    });
    el.addEventListener("error", () => bildirim(true));
    el.addEventListener("loadeddata", () => bildirim(false));
    sesOynatici = {
      getCurrentTime: () => bekleyen ?? el.currentTime,
      seekTo: (sn) => {
        if (el.readyState >= 1) el.currentTime = sn;
        else bekleyen = sn;
        sesZamaniYaz();
      },
      playVideo: () => void el.play().catch(() => undefined),
      pauseVideo: () => el.pause(),
      loadVideoById: (kaynak) => {
        bekleyen = null;
        el.src = kaynak;
        el.load();
      },
    };
    const dalga = $("co-dalga");
    const konumdan = (e: PointerEvent): void => {
      const r = dalga.getBoundingClientRect();
      const sure = video?.sure ?? el.duration;
      if (!Number.isFinite(sure) || sure <= 0) return;
      const oran = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      sesOynatici?.seekTo(oran * sure, true);
      guncelle(oran * sure);
    };
    let surukle = false;
    dalga.addEventListener("pointerdown", (e) => {
      surukle = true;
      dalga.setPointerCapture(e.pointerId);
      konumdan(e);
    });
    dalga.addEventListener("pointermove", (e) => surukle && konumdan(e));
    dalga.addEventListener("pointerup", () => (surukle = false));
    dalga.addEventListener("keydown", (e) => {
      const adim = { ArrowLeft: -5, ArrowRight: 5, PageDown: -30, PageUp: 30 }[e.key];
      if (adim === undefined && e.key !== "Home" && e.key !== "End") return;
      e.preventDefault();
      const sure = video?.sure ?? el.duration ?? 0;
      const hedef = e.key === "Home" ? 0 : e.key === "End" ? sure : Math.min(sure, Math.max(0, el.currentTime + (adim ?? 0)));
      sesOynatici?.seekTo(hedef, true);
      guncelle(hedef);
    });
  }
  function sesZamaniYaz(): void {
    const el = sesEl();
    if (!el || video?.tur !== "ses") return;
    const sure = video.sure ?? (Number.isFinite(el.duration) ? el.duration : 0);
    const t = sesOynatici?.getCurrentTime() ?? el.currentTime;
    $("co-ses-zaman").textContent = `${saatYaz(t)} / ${saatYaz(sure)}`;
    const oran = sure ? Math.min(1, t / sure) : 0;
    $("co-dalga-dolu").style.clipPath = `inset(0 ${(100 - oran * 100).toFixed(2)}% 0 0)`;
    const d = $("co-dalga");
    d.setAttribute("aria-valuemax", String(Math.round(sure)));
    d.setAttribute("aria-valuenow", String(Math.round(t)));
    d.setAttribute("aria-valuetext", `${saatYaz(t)} / ${saatYaz(sure)}`);
    const oyn = document.querySelector<HTMLElement>('[data-ses="oynat"]');
    if (oyn) {
      const calar = !el.paused;
      oyn.innerHTML = ikon(calar ? "Pause" : "Play");
      oyn.setAttribute("aria-label", calar ? "Duraklat" : "Oynat");
    }
  }
  function sesAc(m: CalismaMedyasi): void {
    sesKur();
    const el = sesEl();
    if (!el || !sesOynatici) return;
    if (el.getAttribute("src") !== m.kaynak) sesOynatici.loadVideoById?.(m.kaynak);
    $("co-ses-baslik").textContent = `${medyaAdi(m)}`;
    const bars = dalgaCubuklari(m).map((x) => `<i style="height:${Math.round(x * 100)}%"></i>`).join("");
    $("co-dalga-bos").innerHTML = bars;
    $("co-dalga-dolu").innerHTML = bars;
    sesZamaniYaz();
  }
  function medyaGoster(m: CalismaMedyasi | null): void {
    const yt = m?.tur === "youtube";
    document.getElementById("co-oynatici-kap")?.toggleAttribute("hidden", !yt);
    document.getElementById("co-ses")?.toggleAttribute("hidden", m?.tur !== "ses");
    $("co-video-kab").dataset.ortam = m?.tur ?? "";
  }
  function medyaAktifEt(m: CalismaMedyasi): void {
    medyaGoster(m);
    if (m.tur === "youtube") {
      try {
        sesEl()?.pause();
      } catch {
        /* audio not ready */
      }
      if (ytOynatici) {
        oynatici = ytOynatici;
        const y = ytOynatici as YTOynatici & { cueVideoById?: (id: string) => void };
        try {
          (y.cueVideoById ?? y.loadVideoById)?.call(y, m.kaynak);
        } catch {
          /* player not ready */
        }
      } else ytKur();
    } else {
      try {
        ytOynatici?.pauseVideo?.();
      } catch {
        /* player not ready */
      }
      sesAc(m);
      oynatici = sesOynatici;
    }
  }
  // Where listening stopped: media id and second, written while it plays, put back (paused) on the next visit.
  const konumAnahtari = `calisma-konum-${ders}`;
  let geriYukle: { id: string; t: number } | null = null;
  try {
    const k = JSON.parse(localStorage.getItem(konumAnahtari) ?? "null") as { id?: string; t?: number } | null;
    const parametre = new URLSearchParams(location.search);
    if (k?.id && typeof k.t === "number" && k.t > 5 && !parametre.has("konu") && (!parametre.get("video") || parametre.get("video") === k.id) && videolar.some((v) => v.id === k.id)) geriYukle = { id: k.id, t: k.t };
  } catch {
    /* storage unavailable */
  }
  let sonKayit = 0;
  function videoKur(): void {
    if (geriYukle && geriYukle.id !== video?.id) videoDegistir(geriYukle.id);
    if (video) medyaAktifEt(video);
    setInterval(() => {
      if (!oynatici || document.hidden || !video) return;
      try {
        if (geriYukle) {
          const { t } = geriYukle;
          geriYukle = null;
          oynatici.seekTo(t, true);
          elleKaydirdi = false;
          guncelle(t);
          return;
        }
        const sn = oynatici.getCurrentTime();
        if (Number.isFinite(sn) && sn > 5 && Date.now() - sonKayit > 3000 && caliyorMu()) {
          sonKayit = Date.now();
          try {
            localStorage.setItem(konumAnahtari, JSON.stringify({ id: video.id, t: Math.round(sn) }));
          } catch {
            /* storage unavailable */
          }
        }
        // Zaman değişmedikçe (medya henüz başlamadı) elle seçilen konu bozulmaz
        if (Number.isFinite(sn) && sn !== sonOynaticiSn) {
          sonOynaticiSn = sn;
          guncelle(sn);
        }
      } catch {
        /* not ready */
      }
    }, 300);
    addEventListener("online", () => bildirim(false));
    addEventListener("offline", () => bildirim(true));
  }

  // Seçici yalnız açık konunun geçtiği medyaları gösterir
  function videoSecCiz(): void {
    const kab = $("co-video-sec");
    const konu = gorunenKonu();
    // Unit parts of one series (uzun anlatım ünite 1..7) are one continuous piece: one button. It opens the part
    // that covers the open topic (or the part already playing) and the parts follow each other on their own.
    const dizi = (v: CalismaMedyasi): string => (v.unite ? `${v.tur}:${v.cesit}` : v.id);
    const gruplar = new Map<string, CalismaMedyasi[]>();
    for (const v of videolar) gruplar.set(dizi(v), [...(gruplar.get(dizi(v)) ?? []), v]);
    const secenekler = [...gruplar.values()].filter((g) => !konu || g.some((v) => v.konuAraliklari[konu]));
    kab.hidden = gruplar.size < 2 || !secenekler.length;
    if (kab.hidden) return;
    kab.innerHTML = secenekler
      .map((g) => {
        const etkin = g.some((v) => v.id === video?.id);
        const hedef = (etkin && video) || (konu && g.find((v) => v.konuAraliklari[konu])) || g[0];
        const ad = g.length > 1 ? CESIT_ADI[g[0].cesit] : medyaAdi(g[0]);
        return `<button type="button" data-video-sec="${esc(hedef.id)}" aria-pressed="${etkin}" title="${esc(g.length > 1 ? `${ad}, ${g.length} bölüm` : g[0].baslik)}">${ikon(g[0].tur === "ses" ? "Headphones" : "Play")}${esc(ad)}</button>`;
      })
      .join("");
  }
  function medyaBilgisi(metin: string): void {
    const el = document.getElementById("co-medya-bilgi");
    if (!el) return;
    el.textContent = metin;
    el.hidden = !metin;
  }
  function videoDegistir(kod: string, oto = false): void {
    const yeni = videolar.findIndex((v) => v.id === kod);
    if (yeni < 0 || yeni === vi) return;
    vi = yeni;
    video = videolar[vi];
    satirlar = video.satirlar;
    etkinHesapla();
    simdiSatir = -1;
    simdiKonu = null;
    secKonu = null;
    otoMedya = oto;
    if (!oto) {
      tercihMedya = video.id;
      tercihCesit = video.cesit;
      try {
        localStorage.setItem(videoAnahtari, video.id);
        localStorage.setItem(cesitAnahtari, video.cesit);
      } catch {
        /* storage unavailable */
      }
    }
    const url = new URL(location.href);
    url.searchParams.set("video", video.id);
    history.replaceState(null, "", url);
    medyaAktifEt(video);
    videoSecCiz();
    dokumCiz();
    icindekilerCiz();
    suAnCiz();
    if (aktif === "dokum") scrollTo({ top: 0, behavior: "auto" });
  }
  // Açılan konuya göre medya: geçerli medyada varsa kalır; yoksa en uygun medyaya geçer ve tek satırla söyler
  const CESIT_SIRASI: string[] = ["uzun-anlatim", "kisa-ozet", "soru-cozum", "diger"];
  // A series split by unit (uzun anlatım ünite 1..7) behaves as one piece: a topic is "in" the series when any part covers it.
  const diziKodu = (v: CalismaMedyasi): string => (v.unite ? `${v.tur}:${v.cesit}` : v.id);
  function dizidekiMedya(no: string, m: CalismaMedyasi | null = video): CalismaMedyasi | undefined {
    if (!m) return undefined;
    if (m.konuAraliklari[no]) return m;
    const kod = diziKodu(m);
    return videolar.find((v) => diziKodu(v) === kod && v.konuAraliklari[no]);
  }
  function caliyorMu(): boolean {
    try {
      if (video?.tur === "ses") return !(sesEl()?.paused ?? true);
      return (oynatici as YTOynatici | null)?.getPlayerState?.() === 1;
    } catch {
      return false;
    }
  }
  function medyaKonuyaUydur(no: string): boolean {
    const adaylar = videolar.filter((v) => v.konuAraliklari[no]);
    document.getElementById("co")?.classList.toggle("co-videosuz", adaylar.length === 0);
    if (!adaylar.length) {
      if (videolar.length) {
        try {
          oynatici?.pauseVideo?.();
        } catch {
          /* player not ready */
        }
        medyaBilgisi("");
      }
      return false;
    }
    if (!videolar.length) return false;
    const tercih = tercihMedya ? adaylar.find((v) => v.id === tercihMedya) : undefined;
    let hedef: CalismaMedyasi | undefined;
    const ayniDizi = dizidekiMedya(no);
    if (ayniDizi) {
      hedef = ayniDizi;
    } else if (video && adaylar.includes(video)) {
      // kendiliğinden geçilmişse ve elle seçilen medya bu konuyu da kapsıyorsa ona dön
      hedef = otoMedya && tercih && tercih !== video ? tercih : video;
    } else {
      hedef =
        (tercihCesit ? adaylar.find((v) => v.cesit === tercihCesit) : undefined) ??
        CESIT_SIRASI.map((c) => adaylar.find((v) => v.cesit === c)).find(Boolean) ??
        adaylar[0];
    }
    if (hedef && hedef !== video) {
      videoDegistir(hedef.id, !ayniDizi);
    }
    medyaBilgisi("");
    return true;
  }

  // ---------- Sınav ----------
  const soruOnbellek = new Map<number, Soru[]>();
  const soruIstegi = new Map<number, Promise<Soru[] | null>>();
  let sinavUnite: number | null = null;
  let sinavKonu: string | null = null;
  let sinavKapsam: "konu" | "unite" = "unite";
  let sinavIzle = true; // "Şu anki konuyu izle": açıkken Sınav sekmesi konuyla birlikte değişir
  try {
    sinavIzle = localStorage.getItem("calisma-sinav-izle") !== "0";
  } catch {
    /* storage unavailable */
  }
  const sinavIzleYaz = (d: boolean): void => {
    sinavIzle = d;
    try {
      localStorage.setItem("calisma-sinav-izle", d ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  };
  let sinavSayac = 0;
  const soruAdresi = (u: number): string => `/calisma-veri/${uni}/${ders}/sorular-${u}.json`;
  async function soruYukle(u: number): Promise<Soru[] | null> {
    const var0 = soruOnbellek.get(u);
    if (var0) return var0;
    const bekleyen = soruIstegi.get(u);
    if (bekleyen) return bekleyen;
    const istek = (async (): Promise<Soru[] | null> => {
      const depo = "caches" in window ? await caches.open(SORU_ONBELLEGI).catch(() => null) : null;
      let liste: unknown = null;
      try {
        const r = await fetch(soruAdresi(u));
        if (r.ok) {
          if (depo) await depo.put(soruAdresi(u), r.clone()).catch(() => undefined);
          liste = await r.json();
        }
      } catch {
        const r = await depo?.match(soruAdresi(u));
        if (r) liste = await r.json().catch(() => null);
      }
      if (!Array.isArray(liste)) return null;
      soruOnbellek.set(u, liste as Soru[]);
      return liste as Soru[];
    })();
    soruIstegi.set(u, istek);
    const sonuc = await istek;
    if (!sonuc) soruIstegi.delete(u);
    return sonuc;
  }
  const konuyaUyar = (q: Soru, no: string): boolean => !!q.konu && (q.konu === no || q.konu.startsWith(`${no}.`));
  function enYakinKonu(bolum: string | undefined): CalismaKonu | null {
    let b = bolum ?? "";
    while (b) {
      const k = konuHaritasi.get(b)?.k;
      if (k) return k;
      b = b.includes(".") ? b.slice(0, b.lastIndexOf(".")) : "";
    }
    return null;
  }
  function soruKartiHtml(q: Soru, n: number): string {
    const secenekler = Object.entries(q.options)
      .map(([k, t]) => `<button type="button" class="co-secenek co-sq-sec" data-sq-id="${esc(q.id)}" data-sq-sec="${esc(k)}"><span><b>${esc(k)}</b> ${esc(t)}</span></button>`)
      .join("");
    const meta = q.sinav ?? "";
    return `<article class="co-sq" data-sq="${esc(q.id)}"><div class="co-sq-ust"><span class="co-no">${n}</span>${meta ? `<span class="co-sq-meta" title="${esc(q.sinavlar ?? meta)}">${esc(meta)}</span>` : ""}</div><p class="co-soru-metin">${esc(q.text)}</p><div class="co-sq-secenekler">${secenekler}</div><div class="co-cikti" aria-live="polite"></div></article>`;
  }
  function sinavKartDurumu(kart: HTMLElement, q: Soru, c: { secim: string | null; dogru: boolean }): void {
    kart.dataset.cevaplandi = "1";
    kart.querySelectorAll<HTMLButtonElement>(".co-sq-sec").forEach((b) => {
      b.disabled = true;
      b.querySelector("svg")?.remove();
      if (b.dataset.sqSec === q.answer) {
        b.dataset.dogru = "";
        b.insertAdjacentHTML("beforeend", ikon("Check"));
      } else if (b.dataset.sqSec === c.secim) {
        b.dataset.yanlis = "";
        b.insertAdjacentHTML("beforeend", ikon("X"));
      }
    });
    const konu = enYakinKonu(q.konu);
    const dayanak = konu ? kitaptaParagraf(konu.metin, q) : null;
    kart.querySelector<HTMLElement>(".co-cikti")!.innerHTML =
      `<p class="co-sonuc" ${c.dogru ? "data-dogru" : "data-yanlis"}>${c.dogru ? "Doğru" : `Yanlış. Doğru cevap: ${esc(q.answer)}`}</p>` +
      (q.explanation ? `<p class="co-dayanak"><b>Açıklama</b>${esc(q.explanation)}</p>` : "") +
      (dayanak ? `<details class="co-ak-kitap"><summary>${ikon("ChevronDown")}Kitapta bu paragraf</summary><p class="co-dayanak">${esc(dayanak)}</p></details>` : "") +
      (konu ? `<button type="button" class="co-dugme" data-git-konu="${esc(konu.no)}">${ikon("ArrowRight")}Konuya git: ${esc(konu.goster ?? konu.no)} ${esc(konu.baslik)}</button>` : "");
  }
  function sinavCevapla(id: string, secim: string, kart: HTMLElement | null): void {
    const q = [...soruOnbellek.values()].flat().find((x) => x.id === id);
    if (!q || !kart || kart.dataset.cevaplandi || !/^[A-E]$/.test(secim)) return;
    const c = { secim: secim as "A" | "B" | "C" | "D" | "E", dogru: secim === q.answer, zaman: Date.now() };
    cevaplarYaz(dersKodu, { ...cevaplarOku(dersKodu), [id]: c });
    sinavKartDurumu(kart, q, c);
    // Aynı soru hem akışta hem Sınav sekmesinde olabilir
    document.querySelectorAll<HTMLElement>(`.co-sq[data-sq="${CSS.escape(id)}"]`).forEach((k) => {
      if (k !== kart && !k.dataset.cevaplandi) sinavKartDurumu(k, q, c);
    });
    sinavOzetiniYaz();
    akisDurumlariniYaz();
  }
  function sinavOzetiniYaz(): void {
    const el = document.getElementById("co-sq-ozet");
    if (!el) return;
    const idler = [...document.querySelectorAll<HTMLElement>("#co-p-sinav .co-sq")].map((k) => k.dataset.sq ?? "");
    const kayit = cevaplarOku(dersKodu);
    const verilen = idler.filter((i) => kayit[i]);
    const dogru = verilen.filter((i) => kayit[i].dogru).length;
    el.textContent = `${verilen.length} / ${idler.length} soru çözüldü${verilen.length ? `, ${dogru} doğru` : ""}`;
  }
  async function sinavCiz(hedefSoru?: string): Promise<void> {
    const p = document.getElementById("co-p-sinav");
    if (!p) return;
    const sira = ++sinavSayac;
    if (sinavIzle) {
      const ref = gorunenKonu() ?? acikKonu;
      const k = ref ? konuHaritasi.get(ref)?.k : null;
      if (k) {
        sinavUnite = k.unite;
        sinavKonu = k.no;
      } else if (sinavUnite === null) sinavUnite = paket.uniteler[0]?.no ?? 1;
    }
    const unite = sinavUnite ?? 1;
    const uniteChip = paket.uniteler
      .map((u) => `<button type="button" class="co-cip" data-sinav-unite="${u.no}" aria-pressed="${u.no === unite}">${u.no}</button>`)
      .join("");
    const izleHtml = `<button type="button" class="co-cip co-izle" data-sinav-izle aria-pressed="${sinavIzle}">Şu anki konuyu izle</button>`;
    const ustHtml = `<h2>Çıkmış sorular</h2><div class="co-cipler" role="group" aria-label="Ünite">${uniteChip}</div><div class="co-cipler">${izleHtml}</div>`;
    p.innerHTML = `${ustHtml}<p class="co-bos">Sorular yükleniyor.</p>`;
    const liste = await soruYukle(unite);
    if (sira !== sinavSayac) return;
    if (!liste) {
      p.innerHTML = `${ustHtml}<p class="co-bos">Bu ünitenin soruları açılamadı. Bağlantı gelince bir kez açman yeter; sonra çevrimdışı da çalışır.</p><div class="co-eylemler"><a class="co-dugme" href="${esc(dersYolu)}">${ikon("FileText")}Ders sayfasında çöz</a></div>`;
      return;
    }
    // Konunun sorusu yoksa üst konuya (1.3.9 -> 1.3), o da yoksa üniteye çıkılır ve tek satırla söylenir
    const ustKonu = (no: string): string => (no.includes(".") ? no.slice(0, no.lastIndexOf(".")) : "");
    let kapsamNo = sinavKonu;
    let konuSorulari: Soru[] = [];
    let kapsamNotu = "";
    if (sinavKonu) {
      konuSorulari = liste.filter((q) => konuyaUyar(q, sinavKonu!));
      if (!konuSorulari.length) {
        for (let a = ustKonu(sinavKonu); a.includes("."); a = ustKonu(a)) {
          const m = liste.filter((q) => konuyaUyar(q, a));
          if (m.length) {
            konuSorulari = m;
            kapsamNo = a;
            kapsamNotu = `${sinavKonu} için çıkmış soru yok; üst konu ${a} sorusu (${m.length}) gösteriliyor.`;
            break;
          }
        }
        if (!konuSorulari.length) kapsamNotu = `${sinavKonu} için çıkmış soru yok; ünite soruları gösteriliyor.`;
      }
    }
    if (!konuSorulari.length && sinavKapsam === "konu") sinavKapsam = "unite";
    if (konuSorulari.length && sinavIzle) sinavKapsam = "konu";
    const goster = sinavKapsam === "konu" && konuSorulari.length ? konuSorulari : liste;
    const kayit = cevaplarOku(dersKodu);
    const konuBilgi = kapsamNo ? konuHaritasi.get(kapsamNo)?.k : null;
    const kapsamHtml =
      (konuSorulari.length
        ? `<div class="co-cipler" role="group" aria-label="Kapsam"><button type="button" class="co-cip" data-sinav-kapsam="konu" aria-pressed="${goster === konuSorulari}">${kapsamNo === sinavKonu ? "Bu konu" : "Üst konu"}, ${konuSorulari.length}${konuBilgi ? ` (${esc(konuBilgi.no)})` : ""}</button><button type="button" class="co-cip" data-sinav-kapsam="unite" aria-pressed="${goster !== konuSorulari}">Ünite ${unite}, ${liste.length}</button></div>`
        : "") + (kapsamNotu && (goster === konuSorulari || !konuSorulari.length) ? `<p class="co-sq-ozet">${esc(kapsamNotu)}</p>` : "");
    const kartlar = goster
      .map((q, i) => soruKartiHtml(q, i + 1))
      .join("");
    const ids = liste.map((q) => encodeURIComponent(q.id)).join(",");
    const canli = `${KANAL_ADRESI}?kaynak=acik-ogretim&uni=${encodeURIComponent(uni)}&ders=${encodeURIComponent(ders)}&unite=${unite}&sorular=${ids}`;
    p.innerHTML =
      `${ustHtml}${kapsamHtml}<p class="co-sq-ozet" id="co-sq-ozet"></p><div class="co-sq-liste">${kartlar || `<p class="co-bos">Bu ünite için çıkmış soru yok.</p>`}</div>` +
      `<div class="co-eylemler"><a class="co-dugme co-dugme-birincil" href="${esc(canli)}" target="_blank" rel="noopener">${ikon("ExternalLink")}Canlı quiz olarak aç</a><a class="co-dugme" href="${esc(dersYolu)}">${ikon("FileText")}Ders sayfasında çöz</a></div>`;
    for (const q of goster) {
      const c = kayit[q.id];
      const kart = p.querySelector<HTMLElement>(`.co-sq[data-sq="${CSS.escape(q.id)}"]`);
      if (c && kart) sinavKartDurumu(kart, q, c);
    }
    sinavOzetiniYaz();
    if (hedefSoru) {
      const kart = p.querySelector<HTMLElement>(`.co-sq[data-sq="${CSS.escape(hedefSoru)}"]`);
      if (kart) {
        kart.dataset.vurgula = "";
        kart.scrollIntoView({ block: "center", behavior: azaltilmis() ? "auto" : "smooth" });
        setTimeout(() => kart.removeAttribute("data-vurgula"), 2400);
      }
    }
  }
  function sinavKonuAc(no: string): void {
    const k = konuHaritasi.get(no)?.k;
    if (!k) return;
    sinavUnite = k.unite;
    sinavKonu = k.no;
    sinavKapsam = "konu";
    sekmeGoster("sinav");
    void sinavCiz();
  }
  async function sinavSoruyaGit(id: string, unite: number): Promise<void> {
    if (!Number.isFinite(unite) || unite < 1) return;
    sinavIzleYaz(false);
    sinavUnite = unite;
    sinavKonu = null;
    sinavKapsam = "unite";
    sekmeGoster("sinav");
    await sinavCiz(id);
  }
  function sorulariOnceden(): void {
    const sira = paket.uniteler.map((u) => u.no);
    const bos = (f: () => void): void => void ("requestIdleCallback" in window ? window.requestIdleCallback(f) : setTimeout(f, 2500));
    bos(() => {
      void (async () => {
        for (const u of sira) await soruYukle(u);
      })();
    });
  }

  // ---------- Konu konu akışı ----------
  // Ünite > konu sırasıyla tek dikey akış: anlatım, kavramlar, çıkmış sorular, mini test ve durum bir arada.
  let akisKonuSoru = new Map<string, Soru[]>();
  let akisSorular: Soru[] = [];
  let akisHazir = false;
  let elleKaydirdi = false;
  let akisKaydirmaBitis = 0;
  const kavramKonuya = new Map<string, number[]>();
  paket.kavramlar.forEach((v, i) => kavramKonuya.set(v.konu, [...(kavramKonuya.get(v.konu) ?? []), i]));
  const akisGorunurMu = (): boolean => akisVar && (aktif === "akis" || (genis() && sonSag === "akis"));
  const yildizliMi = (i: number): boolean => {
    const v = paket.kavramlar[i];
    return !!v && yildizlar.some((y) => yildizKimligi(y) === yildizKimligi(v));
  };

  function akisBlokIskeleti(no: string): string {
    const k = konuHaritasi.get(no)?.k;
    if (!k) return "";
    const cipler = videolar
      .map((v) => {
        const kv = k.video[v.id];
        const satir = kv ? v.satirlar[kv.ilk] : null;
        return satir ? `<button type="button" class="co-cip" data-ak-medya="${esc(v.id)}" data-no="${esc(no)}">${ikon(v.tur === "ses" ? "Headphones" : "Play")}${esc(medyaCipEtiketi(v, saatYaz(satir.bas)))}</button>` : "";
      })
      .join("") + (k.anlatim && sesDestekli() ? `<button type="button" class="co-cip" data-ak-oku="${esc(no)}" aria-pressed="false">${ikon("AudioLines")}<span>Sesli oku</span></button>` : "");
    return `<article class="co-ak-blok" id="ak-${esc(no)}" data-ak-konu="${esc(no)}" aria-labelledby="ak-b-${esc(no)}"><header class="co-ak-baslik"><button type="button" class="co-ak-ad" id="ak-b-${esc(no)}" data-ak-sar="${esc(no)}"><span class="co-no">${esc(k.goster ?? no)}</span><span>${esc(k.baslik)}</span></button>${cipler ? `<div class="co-ak-cipler">${cipler}</div>` : ""}</header><div class="co-ak-govde" data-ak-govde></div></article>`;
  }
  function akisBlokDoldur(el: HTMLElement): void {
    if (el.dataset.dolu) return;
    el.dataset.dolu = "1";
    const no = el.dataset.akKonu ?? "";
    const k = konuHaritasi.get(no)?.k;
    const govde = el.querySelector<HTMLElement>("[data-ak-govde]");
    if (!k || !govde) return;
    const c = k.calisma;
    const uzunlar = videolar.filter((v) => v.cesit === "uzun-anlatim" && k.video[v.id]);
    // Body: the written topic explanation. Everything else (notes, book, concepts, names, questions) is a closed row.
    const kapali = (baslik: string, icerik: string, sinif = ""): string => (icerik ? `<details class="co-ak-kat${sinif}"><summary>${ikon("ChevronDown")}${baslik}</summary><div class="co-ak-kat-ic">${icerik}</div></details>` : "");
    const kitapParcalari = k.metin.split("\n").filter((x) => x.trim());
    const kitapHtml = kitapParcalari.map((x) => `<p>${esc(x)}</p>`).join("");
    const notlar = anlatimHtml(k);
    const govdeHtml = k.anlatim ? `<div class="co-ak-anlatim">${mdHtml(k.anlatim)}</div>` : notlar ? `<div class="co-ak-anlatim">${notlar}</div>` : kitapHtml ? `<div class="co-ak-anlatim co-ak-kitapmetni">${kitapHtml}</div>` : "";
    // Proper names: every one the topic's explanation, book text or narration mentions, not only those first seen here.
    const anlatimMetni = uzunlar.map((v) => v.satirlar.slice(k.video[v.id].ilk, k.video[v.id].ilk + k.video[v.id].say).map((x) => x.m).join(" ")).join(" ");
    const adSirasi = [...new Set(motor.eslestir(`${k.anlatim ?? ""} ${k.metin} ${anlatimMetni}`).map((m) => m.kavram))].filter((i) => paket.kavramlar[i]?.tur);
    const tanimSatiri = (i: number): string => {
      const v = paket.kavramlar[i];
      return `<div><dt><button type="button" class="co-kavram" data-k="${i}"${yildizliMi(i) ? " data-yildizli" : ""}>${esc(v.terim)}</button></dt><dd>${esc(v.tanim)}</dd></div>`;
    };
    const kavSira = (kavramKonuya.get(no) ?? []).filter((i) => !paket.kavramlar[i]?.tur);
    const gorselHtml = k.gorsel ? `<figure class="co-ak-gorsel"><img src="${esc(k.gorsel)}" alt="${esc(k.baslik)} konusunun çizimi" width="1376" height="768" loading="lazy" decoding="async"></figure>` : "";
    govde.innerHTML =
      gorselHtml +
      `<div class="co-ak-metin" data-vurgu-kok data-hedef="o${esc(no)}">${govdeHtml}</div>` +
      `<div class="co-ak-katlar">` +
      kapali(`Kavramlar (${kavSira.length})`, kavSira.length ? `<dl class="co-tanimlar co-ak-kavramlar">${kavSira.map(tanimSatiri).join("")}</dl>` : "") +
      kapali(`Kişiler ve adlar (${adSirasi.length})`, adSirasi.length ? `<dl class="co-tanimlar co-ak-kavramlar">${adSirasi.map(tanimSatiri).join("")}</dl>` : "") +
      `<div data-ak-sorular></div>` +
      (k.anlatim || !notlar ? kapali("Özet ve çalışma notları", notlar) : "") +
      (govdeHtml.includes("co-ak-kitapmetni") ? "" : kapali("Kitaptan oku", kitapHtml)) +
      kapali("Üzerine düşün", dusunHtml(k).replace(/^<h4[^>]*>[^<]*<\/h4>/, "")) +
      `</div>` +
      `<footer class="co-ak-alt"><p class="co-ak-durum" data-ak-durum></p><div class="co-ak-eylem">` +
      (c?.miniTest?.length ? `<button type="button" class="co-dugme" data-dene="${esc(no)}">${ikon("CircleHelp")}Kendini dene</button>` : "") +
      (konuHaritasi.get(no)!.i < paket.konular.length - 1 ? `<button type="button" class="co-dugme co-dugme-birincil" data-ak-sonraki="${esc(no)}">${ikon("ArrowDown")}Sonraki konu</button>` : "") +
      `</div></footer>`;
    const metin = govde.querySelector<HTMLElement>(".co-ak-metin");
    if (metin) {
      kavramSar(metin, true);
      vurgulariUygula(metin);
    }
    akisSorulariYaz(el);
    akisDurumYaz(el);
  }
  function akisSorulariYaz(el: HTMLElement): void {
    const kab = el.querySelector<HTMLElement>("[data-ak-sorular]");
    if (!kab) return;
    const no = el.dataset.akKonu ?? "";
    if (!akisHazir) {
      kab.innerHTML = `<p class="co-sq-ozet">Çıkmış sorular yükleniyor.</p>`;
      return;
    }
    const liste = akisKonuSoru.get(no) ?? [];
    if (!liste.length) {
      kab.innerHTML = "";
      return;
    }
    const kayit = cevaplarOku(dersKodu);
    const acik = kab.querySelector("details")?.open ?? false;
    kab.innerHTML = `<details class="co-ak-kat co-ak-sorular"${acik ? " open" : ""}><summary>${ikon("ChevronDown")}Çıkmış sorular (${liste.length})</summary><div class="co-ak-kat-ic"><div class="co-sq-liste">${liste.map((q, i) => soruKartiHtml(q, i + 1)).join("")}</div></div></details>`;
    for (const q of liste) {
      const c = kayit[q.id];
      const kart = kab.querySelector<HTMLElement>(`.co-sq[data-sq="${CSS.escape(q.id)}"]`);
      if (c && kart) sinavKartDurumu(kart, q, c);
    }
  }
  function akisDurumYaz(el: HTMLElement): void {
    const yer = el.querySelector<HTMLElement>("[data-ak-durum]");
    if (!yer) return;
    const no = el.dataset.akKonu ?? "";
    const liste = akisKonuSoru.get(no) ?? [];
    const d = konuDurumu(no, liste, cevaplarOku(dersKodu));
    const yildiz = yildizlar.filter((y) => y.konu === no).length;
    const soru = !akisHazir ? "" : d.toplam ? `${d.toplam} sorudan ${d.cozulen} tanesini çözdün, ${d.dogru} doğru` : "Bu konuda çıkmış soru yok";
    yer.textContent = [soru, yildiz ? `${yildiz} yıldızlı kavram` : ""].filter(Boolean).join(". ");
    el.toggleAttribute("data-tamam", d.toplam > 0 && d.cozulen === d.toplam && d.yanlis === 0);
  }
  function akisDurumlariniYaz(): void {
    document.querySelectorAll<HTMLElement>(".co-ak-blok[data-dolu]").forEach(akisDurumYaz);
    if (!akisHazir) return;
    const kayit = cevaplarOku(dersKodu);
    const ilerleme = document.getElementById("co-ak-ilerleme");
    if (ilerleme) {
      ilerleme.innerHTML = paket.uniteler
        .map((u) => {
          const liste = (soruOnbellek.get(u.no) ?? []).filter((q) => konuyaDagitilmis(q));
          const cozulen = liste.filter((q) => kayit[q.id]).length;
          const yuzde = liste.length ? Math.round((cozulen / liste.length) * 100) : 0;
          return `<button type="button" class="co-ak-u" data-ak-unite="${u.no}" aria-label="Ünite ${u.no}: ${liste.length} sorudan ${cozulen} tanesi çözüldü"><span class="co-ak-u-ad">Ünite ${u.no}</span><span class="co-ilerleme" aria-hidden="true"><i style="width:${yuzde}%"></i></span><span class="co-ak-u-sayi">${cozulen}/${liste.length}</span></button>`;
        })
        .join("");
    }
    const zayif = zayifKonular(paket.konular.map((k) => konuDurumu(k.no, akisKonuSoru.get(k.no) ?? [], kayit)));
    const liste = document.getElementById("co-ak-zayif-liste");
    const baslik = document.getElementById("co-ak-zayif-baslik");
    if (baslik) baslik.textContent = `Zayıf konularım (${zayif.length})`;
    if (liste) {
      liste.innerHTML = zayif.length
        ? zayif
            .slice(0, 30)
            .map((d) => {
              const k = konuHaritasi.get(d.no)?.k;
              const not = d.yanlis ? `${d.yanlis} yanlış, ${d.toplam} soru` : `${d.toplam} soru, hiç çözülmedi`;
              return `<button type="button" class="co-ak-zayif" data-ak-git="${esc(d.no)}"><span class="co-no">${esc(k?.goster ?? d.no)}</span><span class="co-ak-zayif-ad">${esc(k?.baslik ?? "")}</span><span class="co-ak-zayif-not">${not}</span></button>`;
            })
            .join("")
        : `<p class="co-bos">Yanlış yaptığın ya da henüz çözmediğin konu kalmadı.</p>`;
    }
  }
  const konuyaDagitilmis = (q: Soru): boolean => akisSorular.includes(q);

  async function akisSorulariYukle(): Promise<void> {
    const gruplar = await Promise.all(paket.uniteler.map((u) => soruYukle(u.no)));
    akisSorular = gruplar.flat().filter((q): q is Soru => !!q);
    akisKonuSoru = sorulariKonuyaDagit(akisSorular, paket.konular.map((k) => k.no));
    akisHazir = true;
    document.querySelectorAll<HTMLElement>(".co-ak-blok[data-dolu]").forEach(akisSorulariYaz);
    akisDurumlariniYaz();
  }

  function akisCiz(): void {
    const p = document.getElementById("co-p-akis");
    if (!p) return;
    const uniteler = paket.uniteler
      .map(
        (u) =>
          `<section class="co-ak-unite" id="ak-u-${u.no}" aria-label="Ünite ${u.no}"><div class="co-ak-unite-ust"><h3 class="co-unite">Ünite ${u.no}${u.baslik ? `: ${esc(u.baslik)}` : ""}</h3><button type="button" class="co-dugme" data-ak-yazdir="${u.no}">${ikon("Printer")}Bu üniteyi yazdır</button></div>${u.konular.map(akisBlokIskeleti).join("")}</section>`,
      )
      .join("");
    p.innerHTML =
      `<div class="co-ak-ust"><div class="co-ak-ara"><label class="co-ak-ara-etiket" for="co-ak-ara">${ikon("Search")}<span class="co-gizli">Konu, kavram ya da soru ara</span></label><input type="search" id="co-ak-ara" placeholder="Konu, kavram ya da soru ara" autocomplete="off" enterkeyhint="search"></div><div class="co-ak-sonuc" id="co-ak-sonuc" aria-live="polite"></div>` +
      `<div class="co-ak-ilerleme" id="co-ak-ilerleme" role="group" aria-label="Ünite ilerlemesi"></div>` +
      `<details class="co-ak-zayifkab"><summary id="co-ak-zayif-baslik">Zayıf konularım</summary><div class="co-ak-zayif-liste" id="co-ak-zayif-liste"><p class="co-bos">Sorular yükleniyor.</p></div></details></div>` +
      `<div id="co-ak-liste">${uniteler}</div>` +
      `<button type="button" class="co-dugme co-dugme-birincil co-ak-simdi" id="co-ak-simdi" hidden>${ikon("ArrowDown")}Şu ana dön</button>`;
    const bloklar = [...p.querySelectorAll<HTMLElement>(".co-ak-blok")];
    bloklar.slice(0, 4).forEach(akisBlokDoldur);
    const bos = (f: () => void): void => void ("requestIdleCallback" in window ? window.requestIdleCallback(f) : setTimeout(f, 300));
    let sira = 4;
    const parti = (): void => {
      const bitis = Math.min(bloklar.length, sira + 8);
      for (; sira < bitis; sira++) akisBlokDoldur(bloklar[sira]);
      if (sira < bloklar.length) bos(parti);
    };
    bos(parti);
    void akisSorulariYukle();
  }
  function akisHepsiniDoldur(no: string): void {
    for (const el of document.querySelectorAll<HTMLElement>(".co-ak-blok")) {
      akisBlokDoldur(el);
      if (el.dataset.akKonu === no) break;
    }
  }
  function akisKaydir(no: string, anlik = false): void {
    const el = document.getElementById(`ak-${no}`);
    if (!el) return;
    akisHepsiniDoldur(no);
    akisKaydirmaBitis = Date.now() + 1200;
    const davranis: ScrollBehavior = anlik || azaltilmis() ? "auto" : "smooth";
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      if (!genis()) {
        const ust = $("co-video-kab").offsetHeight + $("co-sekmeler").offsetHeight;
        scrollTo({ top: scrollY + r.top - ust - 8, behavior: davranis });
      } else {
        const sc = kok!.querySelector<HTMLElement>(".co-sag")!;
        const sr = sc.getBoundingClientRect();
        sc.scrollTo({ top: sc.scrollTop + r.top - sr.top - $("co-sekmeler").offsetHeight - 8, behavior: davranis });
      }
    });
  }
  // Is a topic's block on screen (between the sticky player/tabs and the bottom edge)?
  function blokEkranda(no: string | null): boolean {
    const el = no ? document.getElementById(`ak-${no}`) : null;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const ust = genis() ? (kok?.querySelector<HTMLElement>(".co-sag")?.getBoundingClientRect().top ?? 0) : $("co-video-kab").offsetHeight + $("co-sekmeler").offsetHeight;
    return r.bottom > ust + 40 && r.top < innerHeight - 40;
  }
  let izlenenKonu: string | null = null;
  function akisIzle(): void {
    if (!akisVar) return;
    const gorunur = akisGorunurMu();
    // Scrolling inside the topic being read is still following: when the narration moves on, the page moves with it.
    if (elleKaydirdi && simdiKonu !== izlenenKonu && blokEkranda(izlenenKonu)) elleKaydirdi = false;
    izlenenKonu = simdiKonu;
    if (gorunur && simdiKonu && !elleKaydirdi) akisKaydir(simdiKonu);
    const dugme = document.getElementById("co-ak-simdi");
    // "Şu ana dön" only when the playing topic is really off screen, not after a small scroll within it
    if (dugme) dugme.hidden = !(gorunur && elleKaydirdi && simdiKonu && !blokEkranda(simdiKonu));
  }
  function medyaSar(no: string, oynat = false): void {
    // asking to listen from a topic opens the closed player again
    if (oynat && document.getElementById("co")?.hasAttribute("data-medyasiz")) document.getElementById("co-medya-gizle")?.click();
    const k = konuHaritasi.get(no)?.k;
    const calarken = oynat || caliyorMu();
    medyaKonuyaUydur(no);
    const kv = k && video ? k.video[video.id] : undefined;
    const satir = kv ? satirlar[kv.ilk] : undefined;
    if (!satir) return;
    try {
      oynatici?.seekTo(satir.bas, true);
      if (calarken) oynatici?.playVideo();
      else oynatici?.pauseVideo?.();
    } catch {
      /* player not ready */
    }
    otoDurak = 0;
    guncelle(satir.bas);
  }
  function akisAra(sorgu: string): void {
    const yer = document.getElementById("co-ak-sonuc");
    if (!yer) return;
    const sonuc = aramaYap(paket.konular, paket.kavramlar, akisSorular, sorgu);
    if (sorgu.trim().length < 2) {
      yer.innerHTML = "";
      return;
    }
    yer.innerHTML = sonuc.length
      ? sonuc
          .map((r) => {
            const k = konuHaritasi.get(r.konu)?.k;
            const tur = { konu: "Konu", kavram: "Kavram", soru: "Soru" }[r.tur];
            return `<button type="button" class="co-ak-bulgu" data-ak-git="${esc(r.konu)}"${r.id ? ` data-soru="${esc(r.id)}"` : ""}><span class="co-ak-bulgu-tur">${tur}</span><span class="co-ak-bulgu-metin">${esc(r.metin)}</span><span class="co-ak-bulgu-konu">${esc(r.konu)}${k ? ` ${esc(k.baslik)}` : ""}</span></button>`;
          })
          .join("")
      : `<p class="co-bos">“${esc(sorgu.trim())}” için sonuç bulunamadı.</p>`;
  }
  function akisBulguyaGit(no: string, soruId?: string): void {
    const yer = document.getElementById("co-ak-sonuc");
    if (yer) yer.innerHTML = "";
    const girdi = document.getElementById("co-ak-ara") as HTMLInputElement | null;
    if (girdi) girdi.value = "";
    elleKaydirdi = false;
    akisKaydir(no);
    if (soruId) {
      setTimeout(() => {
        const kart = document.querySelector<HTMLElement>(`#ak-${CSS.escape(no)} .co-sq[data-sq="${CSS.escape(soruId)}"]`);
        if (!kart) return;
        kart.dataset.vurgula = "";
        kart.scrollIntoView({ block: "center", behavior: azaltilmis() ? "auto" : "smooth" });
        setTimeout(() => kart.removeAttribute("data-vurgula"), 2400);
      }, 450);
    }
  }
  async function uniteyiYazdir(u: number): Promise<void> {
    const liste = await soruYukle(u);
    const bilgi = paket.uniteler.find((x) => x.no === u);
    if (!bilgi) return;
    const konular = bilgi.konular.map((n) => konuHaritasi.get(n)?.k).filter((k): k is CalismaKonu => !!k);
    const dagitim = sorulariKonuyaDagit(liste ?? [], konular.map((k) => k.no));
    document.getElementById("co-baski")?.remove();
    const kap = document.createElement("div");
    kap.id = "co-baski";
    kap.lang = "tr";
    kap.innerHTML = uniteBaskiHtml(u, bilgi.baslik, konular, paket.kavramlar, dagitim);
    document.body.append(kap);
    document.documentElement.classList.add("co-baskida");
    const temizle = (): void => {
      document.documentElement.classList.remove("co-baskida");
      kap.remove();
      removeEventListener("afterprint", temizle);
    };
    addEventListener("afterprint", temizle);
    setTimeout(() => print(), 50);
  }

  // ---------- Katman yardımcıları ----------
  function yerlestir(el: HTMLElement, hedef: DOMRect, genislik: number, yukari = false): void {
    const katman = document.querySelector<HTMLDialogElement>("dialog[open]");
    const ebeveyn: HTMLElement = katman ?? kok!;
    if (el.parentElement !== ebeveyn) ebeveyn.append(el);
    el.hidden = false;
    const sol0 = katman ? katman.getBoundingClientRect().left : 0;
    const ust0 = katman ? katman.getBoundingClientRect().top : 0;
    el.style.position = katman ? "absolute" : "fixed";
    const vw = innerWidth;
    const sol = Math.min(Math.max(8, hedef.left), vw - genislik - 8);
    const yuk = el.offsetHeight;
    let ust = yukari ? hedef.top - yuk - 8 : hedef.bottom + 8;
    if (yukari && ust < 8) ust = hedef.bottom + 8;
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
    const yildizli = yildizlar.some((y) => yildizKimligi(y) === yildizKimligi(k));
    const digerler = [...new Set(paket.kavramlar.filter((x) => tr(x.terim) === tr(k.terim) && x.konu !== k.konu).map((x) => x.konu))].filter((n) => konuHaritasi.has(n)).slice(0, 4);
    const digerKonular = digerler.length ? `<p class="co-balon-diger">Başka konularda da geçiyor: ${digerler.map((n) => `<button type="button" class="co-balon-konu" data-git-konu="${esc(n)}" data-balon-kapat>${esc(konuHaritasi.get(n)?.k.goster ?? n)}</button>`).join(" ")}</p>` : "";
    balon.innerHTML = `<div class="co-balon-ust"><strong>${esc(k.terim)}</strong><button type="button" class="co-yildiz" data-yildiz="${esc(b.dataset.k ?? "")}" aria-pressed="${yildizli}" aria-label="${yildizli ? "Yıldızı kaldır" : "Yıldızla"}" title="${yildizli ? "Yıldızı kaldır" : "Yıldızla"}">${ikon("Star")}</button></div><p>${esc(k.tanim)}</p>${digerKonular}<button type="button" data-git-konu="${esc(k.konu)}" data-balon-kapat>${ikon("ArrowRight")}Konuya git${konu ? `: ${esc(konu.goster ?? konu.no)}` : ""}</button>`;
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
    $("co-konu-ad").textContent = `${k.goster ?? k.no} ${k.baslik}`;
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
    $("co-test-bilgi").textContent = `${k.goster ?? k.no} ${k.baslik}`;
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

  // ---------- Seçim araç çubuğu: Vurgula, Not ekle, Kopyala ----------
  // Masaüstünde seçimin üstünde balon, dokunmatik ekranda alt kenarda sabit çubuk (yerel seçim menüsüyle çakışmaz).
  // Klavye: Alt+V vurgula, Alt+N not ekle, Alt+K kopyala, Esc kapat.
  const vurgulaDugme = $("co-arac");
  const notForm = $<HTMLFormElement>("co-arac-not");
  const notGirdi = $<HTMLInputElement>("co-arac-girdi");
  let bekleyen: { koku: HTMLElement; bas: number; son: number } | null = null;
  let secimZamani = 0;
  let notAcik = false;
  const dokunmatik = (): boolean => matchMedia("(pointer: coarse)").matches;
  function aracGizle(): void {
    notAcik = false;
    notForm.hidden = true;
    notGirdi.value = "";
    katmanSifirla(vurgulaDugme);
  }
  function secimiKontrol(): void {
    if (notAcik) return; // not yazarken seçim girdiye odaklanınca kaybolur; çubuk açık kalır
    const sel = getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      bekleyen = null;
      aracGizle();
      return;
    }
    const r = sel.getRangeAt(0);
    const baslangic = r.startContainer instanceof Element ? r.startContainer : r.startContainer.parentElement;
    const koku = baslangic?.closest<HTMLElement>("[data-vurgu-kok]");
    if (!koku || !kok!.contains(koku)) {
      bekleyen = null;
      aracGizle();
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
      aracGizle();
      return;
    }
    bekleyen = { koku, bas, son };
    const rects = r.getClientRects();
    const hedef = rects.length ? rects[rects.length - 1] : r.getBoundingClientRect();
    const alt = dokunmatik();
    vurgulaDugme.toggleAttribute("data-alt", alt);
    if (alt) {
      const katman = document.querySelector<HTMLDialogElement>("dialog[open]");
      const ebeveyn: HTMLElement = katman ?? kok!;
      if (vurgulaDugme.parentElement !== ebeveyn) ebeveyn.append(vurgulaDugme);
      vurgulaDugme.hidden = false;
      for (const o of ["left", "top", "position"] as const) vurgulaDugme.style[o] = "";
    } else {
      vurgulaDugme.hidden = false;
      yerlestir(vurgulaDugme, hedef, vurgulaDugme.offsetWidth || 300, true);
    }
  }
  document.addEventListener("selectionchange", () => {
    clearTimeout(secimZamani);
    secimZamani = window.setTimeout(secimiKontrol, 180);
  });
  addEventListener(
    "scroll",
    () => {
      if (vurgulaDugme.hidden || vurgulaDugme.hasAttribute("data-alt")) return;
      clearTimeout(secimZamani);
      secimZamani = window.setTimeout(secimiKontrol, 80);
    },
    { passive: true, capture: true },
  );
  vurgulaDugme.addEventListener("mousedown", (e) => {
    if (!(e.target as HTMLElement).closest("input")) e.preventDefault(); // seçimi koru
  });
  vurgulaDugme.addEventListener("pointerdown", (e) => {
    if (!(e.target as HTMLElement).closest("input")) e.preventDefault();
  });
  function vurguOlustur(not?: string): void {
    if (!bekleyen) return;
    const { koku, bas, son: bitis } = bekleyen;
    const tam = koku.textContent ?? "";
    const hedef = koku.dataset.hedef ?? "";
    const cozulen = satirCoz(hedef);
    const satirNo = cozulen && cozulen.kod === (video?.id ?? "") ? cozulen.i : -1;
    const v: Vurgu = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      hedef,
      konu: satirNo >= 0 ? (satirlar[satirNo]?.konu ?? etkinKonu[satirNo] ?? null) : hedef.slice(1),
      ...demirle(tam, bas, bitis),
      sn: satirNo >= 0 ? (satirlar[satirNo]?.bas ?? null) : null,
      zaman: Date.now(),
      ...(not ? { not: not.slice(0, 500) } : {}),
    };
    vurgular = [...vurgular, v];
    vurgulariYaz(ders, vurgular);
    getSelection()?.removeAllRanges();
    bekleyen = null;
    aracGizle();
    vurguUygula(koku, v);
    vurguListesiCiz();
  }
  function metniKopyala(): void {
    const metin = getSelection()?.toString() ?? "";
    if (!metin) return;
    const bitir = (): void => {
      const d = vurgulaDugme.querySelector<HTMLElement>('[data-arac="kopyala"] span');
      if (d) {
        d.textContent = "Kopyalandı";
        setTimeout(() => {
          d.textContent = "Kopyala";
          getSelection()?.removeAllRanges();
          bekleyen = null;
          aracGizle();
        }, 900);
      }
    };
    const yedekKopya = (): void => {
      document.execCommand?.("copy");
      bitir();
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(metin).then(bitir, yedekKopya);
    else yedekKopya();
  }
  function notAc(): void {
    if (!bekleyen) return;
    notAcik = true;
    notForm.hidden = false;
    notGirdi.focus({ preventScroll: true });
  }
  function aracEylemi(ad: string): void {
    if (ad === "vurgula") vurguOlustur();
    else if (ad === "not") notAc();
    else if (ad === "kopyala") metniKopyala();
  }
  notForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const metin = notGirdi.value.trim();
    notAcik = false;
    vurguOlustur(metin || undefined);
  });
  document.addEventListener("keydown", (e) => {
    if (vurgulaDugme.hidden) return;
    if (e.key === "Escape") {
      getSelection()?.removeAllRanges();
      bekleyen = null;
      aracGizle();
      return;
    }
    if (!e.altKey || e.ctrlKey || e.metaKey || !bekleyen) return;
    const ad = { KeyV: "vurgula", KeyN: "not", KeyK: "kopyala" }[e.code];
    if (ad) {
      e.preventDefault();
      aracEylemi(ad);
    }
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
    const sesDugme = t.closest<HTMLElement>("[data-ses]");
    if (sesDugme) {
      const el = sesEl();
      if (!el) return;
      const ad = sesDugme.dataset.ses;
      if (ad === "oynat") return void (el.paused ? el.play().catch(() => undefined) : el.pause());
      if (ad === "geri" || ad === "ileri") {
        const hedef = Math.max(0, el.currentTime + (ad === "geri" ? -15 : 15));
        el.currentTime = hedef;
        return guncelle(hedef);
      }
      if (ad === "hiz") {
        const sira = (SES_HIZLARI.indexOf(el.playbackRate) + 1) % SES_HIZLARI.length;
        el.playbackRate = SES_HIZLARI[sira];
        el.defaultPlaybackRate = SES_HIZLARI[sira];
        sesDugme.textContent = `${SES_HIZLARI[sira]}×`;
        try {
          localStorage.setItem(HIZ_ANAHTARI, String(SES_HIZLARI[sira]));
        } catch {
          /* storage unavailable */
        }
      }
      return;
    }
    const akOku = t.closest<HTMLElement>("[data-ak-oku]");
    if (akOku) {
      // read the written topic explanation aloud (browser speech, Turkish voice), sentence by sentence with highlight
      const no = akOku.dataset.akOku ?? "";
      const govde = document.querySelector<HTMLElement>(`#ak-${CSS.escape(no)} .co-ak-anlatim`);
      if (!govde) return;
      if (okuyan === no && okuma?.calisiyor) {
        okuma.dur();
        return;
      }
      try {
        sesEl()?.pause();
        ytOynatici?.pauseVideo?.();
      } catch {
        /* player not ready */
      }
      const kaydirma = getComputedStyle($("co-p-akis")).overflowY === "auto" ? $("co-p-akis") : (document.scrollingElement as HTMLElement);
      okuma?.dur(true);
      okuma = new KonuOkuma(kaydirma, (calisiyor) => {
        document.querySelectorAll<HTMLElement>("[data-ak-oku]").forEach((d) => {
          const bu = d.dataset.akOku === okuyan && calisiyor;
          d.setAttribute("aria-pressed", String(bu));
          const yazi = d.querySelector("span");
          if (yazi) yazi.textContent = bu ? "Durdur" : "Sesli oku";
        });
      }, () => $("co-video-kab").offsetHeight + $("co-sekmeler").offsetHeight);
      okuyan = no;
      okuma.yukle(govde);
      okuma.baslat();
      return;
    }
    const akMedya = t.closest<HTMLElement>("[data-ak-medya]");
    if (akMedya) {
      const kodM = akMedya.dataset.akMedya ?? "";
      if (video?.id !== kodM) videoDegistir(kodM);
      elleKaydirdi = false;
      return medyaSar(akMedya.dataset.no ?? "", true); // a listen/watch chip means "play from here"
    }
    const akSar = t.closest<HTMLElement>("[data-ak-sar]");
    if (akSar) {
      elleKaydirdi = false;
      return medyaSar(akSar.dataset.akSar ?? "");
    }
    const akSon = t.closest<HTMLElement>("[data-ak-sonraki]");
    if (akSon) {
      const sira = konuHaritasi.get(akSon.dataset.akSonraki ?? "")?.i ?? -1;
      const sonraki = paket.konular[sira + 1];
      if (sonraki && dizidekiMedya(sonraki.no)) {
        // the narration moves with the reader: next topic means the player jumps there too (playing stays playing)
        konuyaGit(sonraki.no);
      } else if (sonraki) {
        elleKaydirdi = true;
        akisKaydir(sonraki.no);
        akisIzle();
      }
      return;
    }
    const akGit = t.closest<HTMLElement>("[data-ak-git]");
    if (akGit) return akisBulguyaGit(akGit.dataset.akGit ?? "", akGit.dataset.soru);
    const akUnite = t.closest<HTMLElement>("[data-ak-unite]");
    if (akUnite) {
      const ilk = paket.uniteler.find((u) => u.no === Number(akUnite.dataset.akUnite))?.konular[0];
      if (ilk) {
        elleKaydirdi = true;
        akisKaydir(ilk);
      }
      return;
    }
    const akYaz = t.closest<HTMLElement>("[data-ak-yazdir]");
    if (akYaz) return void uniteyiYazdir(Number(akYaz.dataset.akYazdir));
    if (t.closest("#co-ak-simdi")) {
      elleKaydirdi = false;
      if (simdiKonu) akisKaydir(simdiKonu);
      return akisIzle();
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
    if (gitKonu) return konuyaGit(gitKonu.dataset.gitKonu ?? "");
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
    if (t.closest("[data-videoya-don]")) {
      secKonu = null;
      suAnCiz();
      isaretleKonu();
      try {
        oynatici?.playVideo();
      } catch {
        /* player not ready */
      }
      if (!genis()) scrollTo({ top: 0, behavior: azaltilmis() ? "auto" : "smooth" });
      return;
    }
    const ar = t.closest<HTMLElement>("[data-arac]");
    if (ar) return aracEylemi(ar.dataset.arac ?? "");
    const yb = t.closest<HTMLElement>("[data-yildiz]");
    if (yb) {
      const kv = paket.kavramlar[Number(yb.dataset.yildiz)];
      if (!kv) return;
      const kim = yildizKimligi(kv);
      const var0 = yildizlar.some((y) => yildizKimligi(y) === kim);
      yildizlar = var0 ? yildizlar.filter((y) => yildizKimligi(y) !== kim) : [...yildizlar, { terim: kv.terim, konu: kv.konu, zaman: Date.now() }];
      yildizlariYaz(uni, ders, yildizlar);
      yb.setAttribute("aria-pressed", String(!var0));
      yb.setAttribute("aria-label", var0 ? "Yıldızla" : "Yıldızı kaldır");
      yb.title = var0 ? "Yıldızla" : "Yıldızı kaldır";
      document.querySelectorAll<HTMLElement>(`.co-ak-blok .co-kavram[data-k="${CSS.escape(yb.dataset.yildiz ?? "")}"]`).forEach((c) => c.toggleAttribute("data-yildizli", !var0));
      akisDurumlariniYaz();
      return vurguListesiCiz();
    }
    const yk = t.closest<HTMLElement>("[data-yildiz-kaldir]");
    if (yk) {
      yildizlar = yildizlar.filter((y) => yildizKimligi(y) !== yk.dataset.yildizKaldir);
      yildizlariYaz(uni, ders, yildizlar);
      return vurguListesiCiz();
    }
    const sv = t.closest<HTMLElement>("[data-video-sec]");
    if (sv) return videoDegistir(sv.dataset.videoSec ?? "");
    const sg = t.closest<HTMLElement>("[data-soru-git]");
    if (sg) return void sinavSoruyaGit(sg.dataset.soruGit ?? "", Number(sg.dataset.unite));
    const sk = t.closest<HTMLElement>("[data-sinav-konu]");
    if (sk) return sinavKonuAc(sk.dataset.sinavKonu ?? "");
    if (t.closest("[data-sinav-izle]")) {
      sinavIzleYaz(!sinavIzle);
      return void sinavCiz();
    }
    const su = t.closest<HTMLElement>("[data-sinav-unite]");
    if (su) {
      sinavIzleYaz(false);
      sinavUnite = Number(su.dataset.sinavUnite);
      sinavKonu = null;
      sinavKapsam = "unite";
      return void sinavCiz();
    }
    const sc = t.closest<HTMLElement>("[data-sinav-kapsam]");
    if (sc) {
      sinavIzleYaz(false);
      sinavKapsam = sc.dataset.sinavKapsam === "konu" ? "konu" : "unite";
      return void sinavCiz();
    }
    const sq = t.closest<HTMLElement>(".co-sq-sec");
    if (sq) return sinavCevapla(sq.dataset.sqId ?? "", sq.dataset.sqSec ?? "", sq.closest<HTMLElement>(".co-sq"));
    const secenek = t.closest<HTMLElement>(".co-secenek");
    if (secenek) return cevapla(secenek.closest<HTMLElement>(".co-soru")!, secenek.dataset.deger ?? "");
    const kontrol = t.closest<HTMLElement>("[data-kontrol]");
    if (kontrol) {
      const kart = kontrol.closest<HTMLElement>(".co-soru")!;
      return cevapla(kart, kart.querySelector("input")?.value ?? "");
    }
    const dinle = t.closest<HTMLElement>("[data-dinle]");
    if (dinle) {
      katmanSifirla(balon);
      git(satirlar[Number(dinle.dataset.dinle)].bas);
      return;
    }
    const satir = t.closest<HTMLElement>(".co-satir");
    if (satir && !getSelection()?.toString()) {
      katmanSifirla(balon);
      git(satirlar[Number(satir.dataset.i)].bas);
    }
  });
  kok.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.id === "co-ak-ara") akisAra(t.value);
  });
  kok.addEventListener("keydown", (e) => {
    const t = e.target as HTMLElement;
    if ((e.key === "Enter" || e.key === " ") && t.classList.contains("co-satir")) {
      e.preventDefault();
      git(satirlar[Number(t.dataset.i)].bas);
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
    aracGizle();
  });
  const kullaniciKaydirdi = (): void => {
    otoDurak = Date.now() + 6000;
    if (Date.now() > akisKaydirmaBitis && akisGorunurMu()) {
      elleKaydirdi = true;
      akisIzle();
    }
  };
  addEventListener("wheel", kullaniciKaydirdi, { passive: true });
  addEventListener("touchmove", kullaniciKaydirdi, { passive: true });
  addEventListener("scroll", () => elleKaydirdi && akisIzle(), { passive: true });
  kok.querySelector(".co-sag")?.addEventListener("wheel", kullaniciKaydirdi, { passive: true });
  matchMedia("(min-width: 1024px)").addEventListener("change", sekmeUygula);

  function vurguyaGit(id: string): void {
    const v = vurgular.find((x) => x.id === id);
    if (!v) return;
    const c = satirCoz(v.hedef);
    if (c) {
      if (video?.id !== c.kod) videoDegistir(c.kod);
      sekmeGoster("dokum");
      const i = c.i;
      requestAnimationFrame(() => {
        satiriGoster(i, true);
        document.querySelector(`mark[data-vid="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest" });
      });
    } else if (v.hedef.startsWith("o") && akisVar) {
      const no = v.hedef.slice(1);
      sekmeGoster("akis");
      elleKaydirdi = true;
      akisKaydir(no, true);
      setTimeout(() => document.querySelector(`#ak-${CSS.escape(no)} mark[data-vid="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "center", behavior: azaltilmis() ? "auto" : "smooth" }), 250);
    } else if (v.hedef.startsWith("o")) {
      secKonu = v.hedef.slice(1);
      suAnCiz();
      isaretleKonu();
      sekmeGoster("su-an");
      requestAnimationFrame(() => document.querySelector(`#co-su-an mark[data-vid="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "center", behavior: azaltilmis() ? "auto" : "smooth" }));
    } else {
      konuAc(v.hedef.slice(1));
      requestAnimationFrame(() => document.querySelector(`#co-konu-govde mark[data-vid="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "center", behavior: azaltilmis() ? "auto" : "smooth" }));
    }
  }

  // Yapışık video yüksekliği sekmelerin yapışma konumunu belirler
  const videoKab = $("co-video-kab");
  // small video: remembered per browser; only the YouTube player shrinks (audio already has a one-row player)
  const kucukAnahtar = "calisma-video-kucuk";
  const kucukUygula = (k: boolean): void => {
    videoKab.toggleAttribute("data-kucuk", k);
    requestAnimationFrame(() => yukseklik());
    const d = document.getElementById("co-kucult");
    d?.setAttribute("aria-pressed", String(k));
    d?.setAttribute("aria-label", k ? "Videoyu büyüt" : "Videoyu küçült");
  };
  try {
    kucukUygula(localStorage.getItem(kucukAnahtar) === "1");
  } catch {
    /* storage blocked */
  }
  // media closed entirely: pause whatever plays and hide the player; remembered per browser
  const gizliAnahtar = "calisma-medya-gizli";
  const medyaGizle = (g: boolean): void => {
    kok.toggleAttribute("data-medyasiz", g);
    const d = document.getElementById("co-medya-gizle");
    d?.setAttribute("aria-pressed", String(g));
    d?.setAttribute("aria-label", g ? "Videoyu ve sesi aç" : "Videoyu ve sesi kapat, yalnız metni oku");
    if (g) {
      try {
        sesEl()?.pause();
        ytOynatici?.pauseVideo?.();
      } catch {
        /* player not ready */
      }
    }
    try {
      localStorage.setItem(gizliAnahtar, g ? "1" : "0");
    } catch {
      /* storage blocked */
    }
  };
  try {
    if (localStorage.getItem(gizliAnahtar) === "1") medyaGizle(true);
  } catch {
    /* storage blocked */
  }
  document.getElementById("co-medya-gizle")?.addEventListener("click", () => medyaGizle(!kok.hasAttribute("data-medyasiz")));
  document.getElementById("co-yt-hiz")?.addEventListener("click", () => {
    const simdiki = kayitliHiz();
    const hiz = SES_HIZLARI[(SES_HIZLARI.indexOf(simdiki) + 1) % SES_HIZLARI.length];
    try {
      localStorage.setItem(HIZ_ANAHTARI, String(hiz));
    } catch {
      /* storage blocked */
    }
    ytHizUygula(hiz);
  });
  document.getElementById("co-kucult")?.addEventListener("click", () => {
    const k = !videoKab.hasAttribute("data-kucuk");
    kucukUygula(k);
    try {
      localStorage.setItem(kucukAnahtar, k ? "1" : "0");
    } catch {
      /* storage blocked */
    }
  });
  // floor of the real (fractional) height: offsetHeight rounds, and a rounded-up value left a hairline gap under the
  // player on high-density phones where the text behind showed through; the tabs now tuck under the player instead.
  // a floating small video (phone picture-in-picture) takes no room at the top, so the sticky tabs go to the very top
  const yukseklik = (): void =>
    kok.style.setProperty("--co-video-h", `${getComputedStyle(videoKab).position === "fixed" ? 0 : Math.floor(videoKab.getBoundingClientRect().height)}px`);
  new ResizeObserver(yukseklik).observe(videoKab);
  yukseklik();

  videoSecCiz();
  dokumCiz();
  icindekilerCiz();
  vurguListesiCiz();
  suAnCiz();
  akisCiz();
  sekmeUygula();
  videoKur();
  sorulariOnceden();
  // Üst çubuktaki Konular: ünite > konu ağacı tek dokunuşla (sekme ya da masaüstünde sağ sütun)
  $("co-konular-ac").addEventListener("click", () => {
    sekmeGoster("icindekiler");
    if (!genis()) scrollTo({ top: 0, behavior: azaltilmis() ? "auto" : "smooth" });
    document.getElementById("co-p-icindekiler")?.scrollIntoView({ block: "start" });
  });
  const istenenKonu = new URLSearchParams(location.search).get("konu");
  if (istenenKonu) konuyaGit(istenenKonu, false); // ders sayfasındaki "Konuya git" ve "Videoda izle"
  const ilkSekme = new URLSearchParams(location.search).get("sekme");
  if (ilkSekme && (SEKMELER as readonly string[]).includes(ilkSekme)) sekmeGoster(ilkSekme as Sekme);
  // Test ve ileri kullanım için: dışarıdan zaman vermek
  (window as unknown as { coZaman?: (sn: number) => void }).coZaman = guncelle;

  // Document Picture-in-Picture: the YouTube player moves to an always-on-top window, the page keeps the text (Zeki, 23 Nov 2026)
  const pipDugme = document.getElementById("co-pip-ac");
  const oynaticiKap = document.getElementById("co-oynatici-kap");
  const oynaticiYuva = oynaticiKap?.parentElement;
  if (pipDugme && oynaticiKap && oynaticiYuva && pipDestekli()) {
    pipDugme.hidden = false;
    const pipYer = document.createElement("div");
    pipYer.className = "co-pip-yer";
    pipYer.hidden = true;
    pipYer.innerHTML = '<span>Video ayrı pencerede oynuyor.</span><button type="button" class="co-pip-geri">Sayfaya geri al</button>';
    oynaticiYuva.prepend(pipYer);
    const ac = (): void =>
      void pipAcKapat({
        kap: oynaticiKap,
        yuva: oynaticiYuva,
        konum: () => {
          try {
            return { sn: ytOynatici?.getCurrentTime() ?? 0, caliyor: caliyorMu() };
          } catch {
            return { sn: 0, caliyor: false };
          }
        },
        surdur: (sn, cal) => {
          const id = video?.tur === "youtube" ? video.kaynak : "";
          if (!ytOynatici || !id) return;
          try {
            if (cal) ytOynatici.loadVideoById?.(id, sn);
            else ytOynatici.cueVideoById?.(id, sn);
            ytHizUygula(kayitliHiz());
          } catch {
            /* player not ready */
          }
        },
        degisti: (acik) => {
          videoKab.toggleAttribute("data-pip", acik);
          pipYer.hidden = !acik;
          pipDugme.setAttribute("aria-pressed", String(acik));
          requestAnimationFrame(() => yukseklik());
        },
      }).catch(() => {
        /* window refused (no user gesture or blocked) */
      });
    pipDugme.addEventListener("click", ac);
    pipYer.querySelector("button")?.addEventListener("click", ac);
  }

  // WebMCP: study room tools for browser agents; loaded only when the browser has a model context
  if ("modelContext" in document) {
    import("./calisma-ajan")
      .then((m) =>
        m.calismaAraclariniKaydet({
          ders: paket.ders,
          konular: () => paket.konular.map((k) => ({ no: k.no, baslik: k.baslik, unite: k.unite })),
          konuyaGit: (no) => {
            if (!konuHaritasi.has(no)) return false;
            konuyaGit(no);
            return true;
          },
          zamanaGit: git,
          suAn: () => {
            let sn = 0;
            try {
              sn = oynatici?.getCurrentTime() ?? 0;
            } catch {
              /* player not ready */
            }
            const i = satirBul(satirlar, sn);
            return { sn, konu: i >= 0 ? (etkinKonu[i] ?? null) : null, satir: i >= 0 ? (satirlar[i]?.m ?? null) : null };
          },
          dokum: () => satirlar.map((x, i) => ({ bas: x.bas, m: x.m, konu: x.konu ?? etkinKonu[i] ?? null })),
        }),
      )
      .catch(() => {});
  }
}
