// Çalışma odası: YouTube video + zaman kodlu döküm + "Şu an" paneli + konu anlatımı + mini test + vurgular.
// Veri: sayfadaki #co-veri (src/data/calisma-odasi/<ders>.json). Saf mantık: src/lib/calisma-odasi/.
import { katmanAc, katmanlariBagla } from "../lib/katman";
import { kavramMotoru } from "../lib/calisma-odasi/kavram";
import { PaketSemasi, TUR_ADI, saatYaz, satirBul, type CalismaKonu, type CalismaPaketi, type CalismaSatiri, type CalismaVideosu } from "../lib/calisma-odasi/sema";
import { cevaplarOku, cevaplarYaz } from "../lib/calisma-durumu";
import { demirBul, demirle, vurgulariOku, vurgulariYaz, type Vurgu } from "../lib/calisma-odasi/vurgu";
import { yildizKimligi, yildizlariOku, yildizlariYaz, type Yildiz } from "../lib/calisma-odasi/yildiz";

type YTOynatici = {
  getCurrentTime: () => number;
  seekTo: (sn: number, ileri: boolean) => void;
  playVideo: () => void;
  loadVideoById?: (id: string) => void;
  pauseVideo?: () => void;
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

const SEKMELER = ["dokum", "su-an", "icindekiler", "sinav", "vurgular"] as const;
type Sekme = (typeof SEKMELER)[number];

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const tr = (s: string): string => s.toLocaleLowerCase("tr");
type Soru = { id: string; no: number; text: string; options: Record<string, string>; answer: string; explanation: string; sinav?: string; sinavlar?: string; konu?: string };
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

  const videolar = paket.videolar;
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
  let vi = Math.max(0, videolar.findIndex((v) => v.kod === istenen));
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
  const satirHedefi = (i: number): string => (vi === 0 || !video ? `s${i}` : `s${video.kod}:${i}`);
  const satirCoz = (h: string): { kod: string; i: number } | null => {
    const m = /^s(?:([^:]+):)?(\d+)$/.exec(h);
    return m ? { kod: m[1] ?? videolar[0]?.kod ?? "", i: Number(m[2]) } : null;
  };

  let vurgular: Vurgu[] = vurgulariOku(ders);
  let yildizlar: Yildiz[] = yildizlariOku(uni, ders);
  let simdiSatir = -1;
  let simdiKonu: string | null = null;
  let secKonu: string | null = null; // elle seçilen konu (videoda olmayan konular ya da videosuz ders)
  let aktif: Sekme = satirlar.length ? "dokum" : "su-an"; // dökümsüz derste konu özeti ile başla
  let sonSag: Sekme = satirlar.length ? "dokum" : "icindekiler";
  let otoDurak = 0;
  let oynatici: YTOynatici | null = null;
  let acikKonu: string | null = null;
  const gorunenKonu = (): string | null => secKonu ?? simdiKonu;

  // ---------- Kavram bağlantıları ----------
  function kavramSar(koku: HTMLElement, ilkTek: boolean): void {
    const goruldu = new Set<number>();
    const dugumler: Text[] = [];
    const yurume = document.createTreeWalker(koku, NodeFilter.SHOW_TEXT);
    for (let n = yurume.nextNode(); n; n = yurume.nextNode()) {
      if (!(n.parentElement?.closest(".co-kavram, h3, h4, h5, dt, mark.co-vurgu"))) dugumler.push(n as Text);
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
    let onceki: string | null = null;
    const parcalar: string[] = [];
    for (const s of satirlar) {
      if (s.konu && s.konu !== onceki) {
        const k = konuHaritasi.get(s.konu)?.k;
        if (k) parcalar.push(`<li class="co-grup"><button type="button" data-git-konu="${esc(k.no)}"><span>${esc(k.no)}</span><span>${esc(k.baslik)}</span></button></li>`);
        onceki = s.konu;
      }
      const soruBag = s.q ? `<button type="button" class="co-soru-bag" data-soru-git="${esc(s.q)}" data-unite="${s.u ?? ""}">${ikon("ListChecks")}Soruya git</button>` : "";
      parcalar.push(
        `<li class="co-satir" id="co-s-${s.i}" data-i="${s.i}" tabindex="0"><span class="co-zaman">${saatYaz(s.bas)}</span><div class="co-satir-ic"><span class="co-konusmaci">${esc(s.k)}</span><p class="co-satir-metin" data-vurgu-kok data-hedef="${satirHedefi(s.i)}">${esc(s.m)}</p>${soruBag}</div></li>`,
      );
    }
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
      `<span class="co-no">${esc(k.no)}</span><h2>${esc(k.baslik)}</h2>` +
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
            const kv = video ? k.video[video.kod] : undefined;
            const v = kv ? satirlar[kv.ilk] : null;
            return `<div class="co-konu-bolum"><button type="button" class="co-konu-satir" data-git-konu="${esc(no)}"${v ? " data-videoda" : ""}><span class="co-no">${esc(no)}</span><span class="co-konu-adi">${esc(k.baslik)}</span>${video ? `<span class="co-video-durum">${v ? `Videoda ${saatYaz(v.bas)}` : "Videoda yok"}</span>` : ""}</button><button type="button" class="co-konu-yan" data-konu-ac="${esc(no)}" aria-label="${esc(k.baslik)} konu anlatımı">${ikon("BookOpen")}</button></div>`;
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
            return `<div class="co-vurgu-kart" data-yildiz-kart="${esc(yildizKimligi(y))}"><strong>${esc(y.terim)}</strong>${kv ? `<p class="co-ozet">${esc(kv.tanim)}</p>` : ""}<span class="co-vurgu-meta">${k ? `${esc(k.no)} ${esc(k.baslik)}` : esc(y.konu)}</span><div class="co-vurgu-eylem"><button type="button" class="co-dugme" data-git-konu="${esc(y.konu)}">${ikon("ArrowRight")}Konuya git</button><button type="button" class="co-dugme" data-yildiz-kaldir="${esc(yildizKimligi(y))}">${ikon("Star")}Yıldızı kaldır</button></div></div>`;
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
            return `<div class="co-vurgu-kart" data-vid="${esc(v.id)}"><blockquote>${esc(v.exact)}</blockquote>${v.not ? `<p class="co-vurgu-not">${esc(v.not)}</p>` : ""}<span class="co-vurgu-meta">${yer}${k ? ` · ${esc(k.no)} ${esc(k.baslik)}` : ""}</span><div class="co-vurgu-eylem"><button type="button" class="co-dugme" data-vurgu-git="${esc(v.id)}">${ikon("ArrowRight")}Git</button><button type="button" class="co-dugme" data-vurgu-sil="${esc(v.id)}">${ikon("Trash2")}Sil</button></div></div>`;
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
    const kv = video ? k.video[video.kod] : undefined;
    const satir = kv ? satirlar[kv.ilk] : undefined;
    if (kv && satir) {
      secKonu = null;
      if (oynatici) {
        try {
          oynatici.seekTo(satir.bas, true);
          oynatici.pauseVideo?.();
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
    if (!genis()) {
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

  // ---------- Video ----------
  function bildirim(goster: boolean): void {
    $("co-bildirim").hidden = !goster;
  }
  let sonOynaticiSn = 0;
  function videoKur(): void {
    if (!video || !document.getElementById("co-oynatici")) return;
    if (navigator.onLine === false) bildirim(true);
    const olustur = (): void => {
      if (!window.YT?.Player || oynatici) return;
      oynatici = new window.YT.Player("co-oynatici", {
        videoId: video?.yt ?? "",
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
      if (!oynatici || document.hidden || !video) return;
      try {
        const sn = oynatici.getCurrentTime();
        // Zaman değişmedikçe (video henüz başlamadı) elle seçilen konu bozulmaz
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

  function videoSecCiz(): void {
    const kab = $("co-video-sec");
    kab.hidden = videolar.length < 2;
    if (videolar.length < 2) return;
    kab.innerHTML = videolar
      .map((v) => `<button type="button" data-video-sec="${esc(v.kod)}" aria-pressed="${v.kod === video?.kod}" title="${esc(v.baslik)}">${esc(TUR_ADI[v.tur])}</button>`)
      .join("");
  }
  function videoDegistir(kod: string): void {
    const yeni = videolar.findIndex((v) => v.kod === kod);
    if (yeni < 0 || yeni === vi) return;
    vi = yeni;
    video = videolar[vi];
    satirlar = video.satirlar;
    etkinHesapla();
    simdiSatir = -1;
    simdiKonu = null;
    secKonu = null;
    try {
      localStorage.setItem(videoAnahtari, video.kod);
    } catch {
      /* storage unavailable */
    }
    const url = new URL(location.href);
    url.searchParams.set("video", video.kod);
    history.replaceState(null, "", url);
    if (oynatici?.loadVideoById) oynatici.loadVideoById(video.yt);
    videoSecCiz();
    dokumCiz();
    icindekilerCiz();
    suAnCiz();
    if (aktif === "dokum") scrollTo({ top: 0, behavior: "auto" });
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
  const soruAdresi = (u: number): string => `/calisma/${ders}/sorular-${u}.json`;
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
    kart.querySelector<HTMLElement>(".co-cikti")!.innerHTML =
      `<p class="co-sonuc" ${c.dogru ? "data-dogru" : "data-yanlis"}>${c.dogru ? "Doğru" : `Yanlış. Doğru cevap: ${esc(q.answer)}`}</p>` +
      (q.explanation ? `<p class="co-dayanak"><b>Açıklama</b>${esc(q.explanation)}</p>` : "") +
      (konu ? `<button type="button" class="co-dugme" data-git-konu="${esc(konu.no)}">${ikon("ArrowRight")}Konuya git: ${esc(konu.no)} ${esc(konu.baslik)}</button>` : "");
  }
  function sinavCevapla(id: string, secim: string): void {
    const q = [...soruOnbellek.values()].flat().find((x) => x.id === id);
    const kart = document.querySelector<HTMLElement>(`.co-sq[data-sq="${CSS.escape(id)}"]`);
    if (!q || !kart || kart.dataset.cevaplandi || !/^[A-E]$/.test(secim)) return;
    const c = { secim: secim as "A" | "B" | "C" | "D" | "E", dogru: secim === q.answer, zaman: Date.now() };
    cevaplarYaz(dersKodu, { ...cevaplarOku(dersKodu), [id]: c });
    sinavKartDurumu(kart, q, c);
    sinavOzetiniYaz();
  }
  function sinavOzetiniYaz(): void {
    const el = document.getElementById("co-sq-ozet");
    if (!el) return;
    const idler = [...document.querySelectorAll<HTMLElement>(".co-sq")].map((k) => k.dataset.sq ?? "");
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
      .map((q, i) => {
        const secenekler = Object.entries(q.options)
          .map(([k, t]) => `<button type="button" class="co-secenek co-sq-sec" data-sq-id="${esc(q.id)}" data-sq-sec="${esc(k)}"><span><b>${esc(k)}</b> ${esc(t)}</span></button>`)
          .join("");
        const meta = q.sinav ?? "";
        return `<article class="co-sq" data-sq="${esc(q.id)}"><div class="co-sq-ust"><span class="co-no">${i + 1}</span>${meta ? `<span class="co-sq-meta" title="${esc(q.sinavlar ?? meta)}">${esc(meta)}</span>` : ""}</div><p class="co-soru-metin">${esc(q.text)}</p><div class="co-sq-secenekler">${secenekler}</div><div class="co-cikti" aria-live="polite"></div></article>`;
      })
      .join("");
    const ids = liste.map((q) => encodeURIComponent(q.id)).join(",");
    const canli = `${KANAL_ADRESI}?kaynak=acik-ogretim&ders=${encodeURIComponent(`${uni}/${ders}`)}&unite=${unite}&sorular=${ids}`;
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
    balon.innerHTML = `<div class="co-balon-ust"><strong>${esc(k.terim)}</strong><button type="button" class="co-yildiz" data-yildiz="${esc(b.dataset.k ?? "")}" aria-pressed="${yildizli}" aria-label="${yildizli ? "Yıldızı kaldır" : "Yıldızla"}" title="${yildizli ? "Yıldızı kaldır" : "Yıldızla"}">${ikon("Star")}</button></div><p>${esc(k.tanim)}</p><button type="button" data-git-konu="${esc(k.konu)}" data-balon-kapat>${ikon("ArrowRight")}Konuya git${konu ? `: ${esc(konu.no)}` : ""}</button>`;
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
    const satirNo = cozulen && cozulen.kod === (video?.kod ?? "") ? cozulen.i : -1;
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
    if (sq) return sinavCevapla(sq.dataset.sqId ?? "", sq.dataset.sqSec ?? "");
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
      git(satirlar[Number(satir.dataset.i)].bas);
    }
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
  addEventListener("wheel", () => (otoDurak = Date.now() + 6000), { passive: true });
  addEventListener("touchmove", () => (otoDurak = Date.now() + 6000), { passive: true });
  matchMedia("(min-width: 1024px)").addEventListener("change", sekmeUygula);

  function vurguyaGit(id: string): void {
    const v = vurgular.find((x) => x.id === id);
    if (!v) return;
    const c = satirCoz(v.hedef);
    if (c) {
      if (video?.kod !== c.kod) videoDegistir(c.kod);
      sekmeGoster("dokum");
      const i = c.i;
      requestAnimationFrame(() => {
        satiriGoster(i, true);
        document.querySelector(`mark[data-vid="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest" });
      });
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
  const yukseklik = (): void => kok.style.setProperty("--co-video-h", `${videoKab.offsetHeight}px`);
  new ResizeObserver(yukseklik).observe(videoKab);
  yukseklik();

  videoSecCiz();
  dokumCiz();
  icindekilerCiz();
  vurguListesiCiz();
  suAnCiz();
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
}
