// Connects the quiz player to the stored study state (src/lib/calisma-durumu.ts) and the question order
// (src/lib/soru-siralama.ts). The player keeps only thin calls into this class:
//   - every card gets a persistent key (data id) that answers, progress and "kaldığın yer" use,
//   - answers are stored and drawn back (chosen option, right/wrong colours, revealed explanation, counter),
//   - the position is recorded after the learner interacts and restored on reload or from a resume link,
//   - "Sırala" moves the cards inside their unit (no re-render),
//   - the menu actions clear a unit, the course or the position, each with "Geri al".
import type { OptionKey, PlayerQuestion, QuizSettings } from "../lib/types";
import type { SoruKonumu } from "../lib/ders-olaylari";
import { bildir } from "../lib/bildirim";
import {
  DEVAM_HASH,
  ESKI_HEDEF,
  cevaplarOku,
  cevaplarYaz,
  cevaplariAyir,
  dersAnahtari,
  ilerlemeyiTasi,
  kaldiginYerOku,
  kaldiginYerYaz,
  kaliciAnahtarlar,
  say,
  depoOku,
  depoYaz,
  type Cevaplar,
  type Yer,
} from "../lib/calisma-durumu";
import { SIRALAMA_ANAHTARI, siralamaOku, sirala, type Siralama, type SiralanacakSoru } from "../lib/soru-siralama";
import { VARSAYILAN_SUZGEC, suzgecYaz, yanlisVar } from "../lib/suzgec";

/** What this class needs from the quiz player. */
export interface CalismaOyuncusu {
  questions: PlayerQuestion[];
  originalQuestions: PlayerQuestion[];
  currentIndex: number;
  isInteractive: boolean;
  isProgrammaticScroll: boolean;
  corrects: number;
  wrongs: number;
  answeredQuestions: Set<string>;
  progress: Record<string, boolean[]>;
  settings: QuizSettings;
  courseSlug: string;
  updateStats(): void;
  updateStatusText(): void;
  saveProgress(): void;
  syncSettings(): void;
  toggleInteractive(): void;
  durumYay(): void;
}

type Siralanan = SiralanacakSoru & { q: PlayerQuestion };

const SECENEK = new Set(["A", "B", "C", "D", "E"]);
const ETKILESIM = ["pointerdown", "touchstart", "wheel", "keydown"] as const;

export class CalismaBaglantisi {
  readonly ders: string;
  private p: CalismaOyuncusu;
  private cevaplar: Cevaplar;
  /** The learner has touched the page: positions may be recorded from now on. */
  private kayitAcik = false;
  private zamanlayici = 0;
  private siraImzasi = "kitap";
  private bastir = false;
  private geriYukleniyor = false;
  /** Book order of the cards as rendered. */
  private kitapSirasi = new Map<PlayerQuestion, number>();
  /** Old DOM id (question-<unit>-<index in the older order>) -> persistent key. */
  private eslesme = new Map<string, string>();

  constructor(p: CalismaOyuncusu) {
    this.p = p;
    this.ders = dersAnahtari(location.pathname) ?? p.courseSlug;
    this.cevaplar = cevaplarOku(this.ders);
    const anahtarlar = kaliciAnahtarlar(p.originalQuestions.map((q) => q.el?.dataset.id || q.id));
    const eslesme = this.eslesme;
    const uniteSayaci = new Map<number, number>();
    p.originalQuestions.forEach((q, i) => {
      q.id = anahtarlar[i];
      this.kitapSirasi.set(q, i);
      if (!q.el) return;
      q.el.dataset.anahtar = q.id;
      // The DOM id this card had before book order: question-<unit>-<index in the old order>
      const yer = uniteSayaci.get(q.unitNumber) ?? 0;
      uniteSayaci.set(q.unitNumber, yer + 1);
      eslesme.set(`question-${q.unitNumber}-${q.el.dataset.eski ?? yer}`, q.id);
    });
    const { veri, degisti } = ilerlemeyiTasi(p.progress, eslesme);
    if (degisti) {
      p.progress = veri;
      p.saveProgress();
    }
  }

  anahtar(el: HTMLElement): string {
    return el.dataset.anahtar || el.dataset.id || el.id;
  }

  private soru(anahtar: string): PlayerQuestion | undefined {
    return this.p.originalQuestions.find((q) => q.id === anahtar);
  }

  // ---- Answers ----

  /** Records the learner's choice (called from the option click). */
  cevapKaydet(el: HTMLElement, secim: string | undefined, dogru: boolean): void {
    const s = (secim ?? "").toUpperCase();
    if (!SECENEK.has(s)) return;
    this.cevaplar[this.anahtar(el)] = { secim: s as Exclude<OptionKey, "">, dogru, zaman: Date.now() };
    cevaplarYaz(this.ders, this.cevaplar);
    this.sayaciGuncelle();
  }

  /** The answer of the current question is revealed without choosing ("Cevabı göster", "Açıklamayı oku"). */
  goster(el: HTMLElement | null | undefined = this.p.questions[this.p.currentIndex]?.el): void {
    if (!el) return;
    const k = this.anahtar(el);
    if (!this.cevaplar[k]) {
      this.cevaplar[k] = { secim: null, dogru: false, zaman: Date.now() };
      cevaplarYaz(this.ders, this.cevaplar);
    }
    this.kartiCiz(el);
    this.sayaciGuncelle();
  }

  cevapVar(el?: HTMLElement | null): boolean {
    if (el === undefined) return Object.keys(this.cevaplar).length > 0;
    return !!el && !!this.cevaplar[this.anahtar(el)];
  }

  private kartiCiz(el: HTMLElement): void {
    const c = this.cevaplar[this.anahtar(el)];
    el.querySelectorAll(".is-correct, .is-wrong, .was-revealed").forEach((x) => x.classList.remove("is-correct", "is-wrong", "was-revealed"));
    el.querySelector(".explanation-box")?.classList.toggle("reveal", !!c);
    if (!c) return;
    el.querySelector(".correct-option")?.classList.add("was-revealed");
    if (c.secim) el.querySelector(`.option-item[data-key="${c.secim}"]`)?.classList.add(c.dogru ? "is-correct" : "is-wrong");
  }

  /** Draws every stored answer onto the cards and brings the counter in line. */
  gorunumuUygula(): void {
    for (const q of this.p.originalQuestions) if (q.el) this.kartiCiz(q.el);
    this.sayaciGuncelle();
  }

  sayaciGuncelle(): void {
    const s = say(this.cevaplar);
    this.p.corrects = s.dogru;
    this.p.wrongs = s.yanlis;
    this.p.answeredQuestions = new Set(Object.keys(this.cevaplar));
    this.p.updateStats();
    this.p.durumYay();
  }

  // ---- Clearing with undo ----

  private temizle(anahtarlar: Set<string> | null, metin: string): void {
    const { kalan, silinen } = cevaplariAyir(this.cevaplar, anahtarlar);
    const n = Object.keys(silinen).length;
    if (n === 0) return;
    this.cevaplar = kalan;
    cevaplarYaz(this.ders, this.cevaplar);
    this.gorunumuUygula();
    bildir({
      metin: `${metin}: ${n} cevap silindi.`,
      eylem: {
        etiket: "Geri al",
        calistir: () => {
          this.cevaplar = { ...this.cevaplar, ...silinen };
          cevaplarYaz(this.ders, this.cevaplar);
          this.gorunumuUygula();
        },
      },
    });
  }

  /** Unit of the current question. */
  private simdikiUnite(): number | null {
    return this.p.questions[this.p.currentIndex]?.unitNumber ?? null;
  }

  uniteCevapSayisi(): number {
    const u = this.simdikiUnite();
    if (u === null) return 0;
    return this.p.originalQuestions.filter((q) => q.unitNumber === u && this.cevaplar[q.id]).length;
  }

  uniteyiTemizle(): void {
    const u = this.simdikiUnite();
    if (u === null) return;
    const anahtarlar = new Set(this.p.originalQuestions.filter((q) => q.unitNumber === u).map((q) => q.id));
    this.temizle(anahtarlar, u === 0 ? "Diğer sorular temizlendi" : `Ünite ${u} temizlendi`);
  }

  dersiTemizle(): void {
    this.temizle(null, "Ders temizlendi");
  }

  yerVar(): boolean {
    return !!kaldiginYerOku().dersler[this.ders];
  }

  yeriSifirla(): void {
    const eski = kaldiginYerOku().dersler[this.ders];
    if (!eski) return;
    kaldiginYerYaz(this.ders, null);
    this.kayitAcik = false; // the next interaction records a new position
    this.p.durumYay();
    bildir({
      metin: "Kaldığın yer silindi.",
      eylem: { etiket: "Geri al", calistir: () => { kaldiginYerYaz(this.ders, eski); this.p.durumYay(); } },
    });
  }

  // ---- Order ----

  private siralanan(): Siralanan[] {
    return this.p.originalQuestions.map((q) => ({
      q,
      anahtar: q.id,
      unitNumber: q.unitNumber,
      sinavlar: q.sinavlar,
      sira: this.kitapSirasi.get(q) ?? 0,
    }));
  }

  /** Applies the stored order: reorders the player's list and moves the cards inside their unit. */
  sirala(): void {
    // applyFilters runs right after this and moves the player to the first match: that is not where the
    // learner is, so position updates are ignored until the current task ends
    this.bastir = true;
    queueMicrotask(() => {
      this.bastir = false;
    });
    const secim: Siralama = siralamaOku(depoOku(SIRALAMA_ANAHTARI), this.ders);
    const baglam = {
      yanlis: (k: string) => yanlisVar(this.p.progress, k) || (this.cevaplar[k]?.secim != null && !this.cevaplar[k].dogru),
      cozuldu: (k: string) => !!this.cevaplar[k],
    };
    const yeni = sirala(this.siralanan(), secim, baglam).map((x) => x.q);
    const imza = `${secim}:${yeni.map((q) => q.id).join(",")}`;
    if (imza === this.siraImzasi) return;
    const ilk = this.siraImzasi === "kitap";
    this.siraImzasi = imza;
    this.p.originalQuestions = yeni;
    if (ilk && secim === "kitap") return; // rendered order already
    // Move the cards: appending in order puts each one after the previous (the unit title stays first)
    for (const q of yeni) q.el?.parentElement?.appendChild(q.el);
  }

  // ---- Position ----

  /** Called whenever the current question changes; records once scrolling settles. */
  konumDegisti(q: PlayerQuestion | undefined, k: SoruKonumu): void {
    if (!this.kayitAcik || this.bastir || !q || k.unite === null) return;
    window.clearTimeout(this.zamanlayici);
    this.zamanlayici = window.setTimeout(() => this.yerYaz(q, k), 800);
  }

  /** Mode switch is recorded at once with the current question. */
  kipDegisti(): void {
    if (this.geriYukleniyor) return; // the mode came from the record itself
    const q = this.p.questions[this.p.currentIndex];
    if (!q) return;
    const ayni = this.p.questions.filter((x) => x.unitNumber === q.unitNumber);
    this.kayitAcik = true;
    this.yerYaz(q, { unite: q.unitNumber, sira: ayni.indexOf(q) + 1, uniteToplam: ayni.length, index: this.p.currentIndex, toplam: this.p.questions.length });
  }

  private yerYaz(q: PlayerQuestion, k: SoruKonumu): void {
    const ad = document.getElementById("ders-adi")?.textContent?.trim();
    if (!ad || k.unite === null) return;
    const bolum = new URLSearchParams(location.search).get("bolum");
    const yer: Yer = {
      yol: location.pathname.replace(/\/$/, ""),
      ...(bolum && /^[\w-]+$/.test(bolum) ? { bolum } : {}),
      ad,
      soru: q.id,
      unite: k.unite,
      sira: k.sira,
      uniteToplam: k.uniteToplam,
      kip: this.p.isInteractive ? "cozme" : "okuma",
      zaman: Date.now(),
    };
    // Storage full or blocked: the home page simply shows no card
    kaldiginYerYaz(this.ders, yer);
  }

  /** Start: draw the answers, restore the mode and the position when asked, then wait for the learner. */
  baslat(): void {
    this.gorunumuUygula();
    const ac = () => {
      this.kayitAcik = true;
      for (const t of ETKILESIM) removeEventListener(t, ac, true);
    };
    for (const t of ETKILESIM) addEventListener(t, ac, { capture: true, passive: true });

    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const yenileme = nav?.type === "reload" || nav?.type === "back_forward";
    const hash = location.hash;
    const kayit = kaldiginYerOku().dersler[this.ders];
    let hedef: PlayerQuestion | undefined;
    if (hash === DEVAM_HASH || (yenileme && !hash)) {
      if (kayit) {
        // An old record points at a DOM id; it is resolved through the old order once
        const anahtar = kayit.soru || (kayit.eskiHedef ? this.eslesme.get(kayit.eskiHedef) : undefined);
        hedef = anahtar ? this.soru(anahtar) : undefined;
        if (kayit.kip === "cozme" && !this.p.isInteractive) this.cozmeyeGec(hedef);
        if (hedef && !kayit.soru) kaldiginYerYaz(this.ders, { ...kayit, soru: hedef.id, eskiHedef: undefined });
      }
    } else if (ESKI_HEDEF.test(hash.slice(1))) {
      // Old "kaldığın yer" links and bookmarks: #question-<unit>-<old index>
      const anahtar = this.eslesme.get(hash.slice(1));
      hedef = anahtar ? this.soru(anahtar) : undefined;
    }
    if (hash === DEVAM_HASH || ESKI_HEDEF.test(hash.slice(1))) history.replaceState(history.state, "", location.pathname + location.search);
    if (hedef) this.git(hedef);
  }

  private cozmeyeGec(hedef: PlayerQuestion | undefined): void {
    const i = hedef ? this.p.questions.indexOf(hedef) : -1;
    if (i >= 0) this.p.currentIndex = i;
    this.geriYukleniyor = true;
    this.p.toggleInteractive();
    this.geriYukleniyor = false;
  }

  /** Lands on the question; a filter that hides it is offered for removal. */
  git(hedef: PlayerQuestion): void {
    const i = this.p.questions.indexOf(hedef);
    if (i < 0) {
      bildir({
        metin: "Kaldığın soru süzgeç yüzünden gizli.",
        sure: 12000,
        eylem: {
          etiket: "Süzgeci kaldır",
          calistir: () => {
            depoYaz("quiz-settings", suzgecYaz(depoOku("quiz-settings"), VARSAYILAN_SUZGEC));
            this.p.syncSettings();
            const j = this.p.questions.indexOf(hedef);
            if (j >= 0) this.sabitle(j);
          },
        },
      });
      return;
    }
    this.sabitle(i);
  }

  /**
   * Scrolls the card under the floating top bar (scroll-padding and the phone scroll snap place it)
   * and keeps it there while the page is still settling (late images, islands hydrating), until the
   * learner touches the page or about four seconds pass.
   */
  private sabitle(i: number): void {
    const q = this.p.questions[i];
    if (!q?.el) return;
    const el = q.el;
    this.p.currentIndex = i;
    this.p.isProgrammaticScroll = true;
    const yerlestir = () => el.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
    yerlestir();
    document.querySelectorAll("[data-etkin]").forEach((x) => x.removeAttribute("data-etkin"));
    el.setAttribute("data-etkin", "");
    const ust = () => el.getBoundingClientRect().top;
    const hedefUst = ust();
    let bitti = false;
    const bitir = () => {
      if (bitti) return;
      bitti = true;
      gozlemci.disconnect();
      for (const t of ETKILESIM) removeEventListener(t, bitir, true);
      window.setTimeout(() => {
        this.p.isProgrammaticScroll = false;
      }, 300);
      this.p.currentIndex = this.p.questions.indexOf(q);
      this.p.updateStatusText();
      this.p.updateStats();
    };
    const gozlemci = new ResizeObserver(() => {
      if (!bitti && Math.abs(ust() - hedefUst) > 2) yerlestir();
    });
    gozlemci.observe(document.body);
    for (const t of ETKILESIM) addEventListener(t, bitir, { capture: true, passive: true });
    window.setTimeout(bitir, 4000);
    this.p.updateStatusText();
  }
}
