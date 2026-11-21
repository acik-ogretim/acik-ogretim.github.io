import { yildizAnahtari, yildizAyristir, yildizlariBirlestir } from "./yildiz";
import { describe, expect, it } from "vitest";
import { kavramMotoru } from "./kavram";
import { satirBul } from "./sema";
import { demirBul, demirle, vurgulariBirlestir, vurgulariOku } from "./vurgu";
import { mdHtml } from "./akis";

describe("satirBul", () => {
  const s = [{ bas: 0 }, { bas: 10 }, { bas: 25 }];
  it("finds the playing line", () => {
    expect(satirBul(s, 0)).toBe(0);
    expect(satirBul(s, 24.9)).toBe(1);
    expect(satirBul(s, 99)).toBe(2);
    expect(satirBul(s, -1)).toBe(-1);
  });
});

describe("kavramMotoru", () => {
  const m = kavramMotoru([
    { terim: "Hukuk kuralı", tanim: "x", konu: "1.1", kaynak: "etkinlik" },
    { terim: "Devlet", tanim: "y", konu: "1.2", kaynak: "kitap" },
  ]);
  it("matches inflected forms with Turkish casing", () => {
    const metin = "HUKUK KURALLARININ yaptırımı DEVLET eliyle";
    const e = m.eslestir(metin);
    expect(e.map((x) => metin.slice(x.bas, x.son))).toEqual(["HUKUK KURALLARININ", "DEVLET"]);
  });
  it("ignores partial words", () => {
    expect(m.eslestir("Kamu devletçilik")).toHaveLength(0);
    expect(m.eslestir("ödevlet")).toHaveLength(0);
  });
  it("matches one-word terms only as whole words", () => {
    const k = kavramMotoru([{ terim: "Hukuk", tanim: "x", konu: "1.1", kaynak: "etkinlik" }]);
    expect(k.eslestir("Hukukun Temel Kavramları, hukuki işlem")).toHaveLength(0);
    expect(k.eslestir("Hukuk ve hukuklar")).toHaveLength(2);
  });
});

describe("vurgu", () => {
  it("anchors by context", () => {
    const tam = "kanun yürürlüğe girer. sonra kanun iptal edilir.";
    const a = demirle(tam, 28, 33);
    expect(demirBul(tam, a)).toEqual([28, 33]);
  });
  it("skips invalid stored items and merges by id", () => {
    const depo = { getItem: () => JSON.stringify([{ id: "a" }, { id: "b", hedef: "s1", konu: null, exact: "x", prefix: "", suffix: "", sn: null, zaman: 1 }]) };
    expect(vurgulariOku("d", depo)).toHaveLength(1);
    const v = (id: string, z: number) => ({ id, hedef: "s1", konu: null, exact: "x", prefix: "", suffix: "", sn: null, zaman: z });
    const b = JSON.parse(vurgulariBirlestir(JSON.stringify([v("a", 1)]), JSON.stringify([v("a", 2), v("b", 1)])));
    expect(b).toHaveLength(2);
  });
});

describe("yıldızlı kavramlar", () => {
  const y = (terim: string, konu: string, zaman: number) => ({ terim, konu, zaman });
  it("parses valid items only and keys by anahtar", () => {
    expect(yildizAnahtari("ataturk-aof", "psikoloji")).toBe("yildizli-kavramlar-ataturk-aof-psikoloji");
    expect(yildizAyristir(JSON.stringify([y("Hukuk", "1.1", 1), { terim: "x" }, "z"]))).toHaveLength(1);
    expect(yildizAyristir("bozuk")).toEqual([]);
  });
  it("merges by concept, later wins", () => {
    const b = JSON.parse(yildizlariBirlestir(JSON.stringify([y("Hukuk", "1.1", 1)]), JSON.stringify([y("Hukuk", "1.1", 5), y("Devlet", "2.1", 2)])));
    expect(b).toHaveLength(2);
    expect(b.find((x: { terim: string }) => x.terim === "Hukuk").zaman).toBe(5);
  });
});

import { aramaYap, kitaptaParagraf, konuDurumu, sorulariKonuyaDagit, zayifKonular, uniteBaskiHtml, type AkisSoru } from "./akis";

describe("konu konu akışı", () => {
  const soru = (id: string, konu: string, text = "Soru metni burada yer alır"): AkisSoru => ({ id, no: 1, text, options: { A: "bir", B: "iki" }, answer: "A", explanation: "açıklama", konu });
  it("soruları tam konuya ve alt bölümde üst konuya dağıtır", () => {
    const h = sorulariKonuyaDagit([soru("a", "1.1"), soru("b", "1.3.9"), soru("c", "9.9")], ["1.1", "1.3"]);
    expect(h.get("1.1")?.map((q) => q.id)).toEqual(["a"]);
    expect(h.get("1.3")?.map((q) => q.id)).toEqual(["b"]);
  });
  it("zayıf konular: yanlışı olan ya da hiç çözülmeyen", () => {
    const qs = [soru("a", "1.1"), soru("b", "1.2"), soru("c", "1.3")];
    const cev = { a: { secim: "A", dogru: true }, b: { secim: "B", dogru: false } };
    const d = ["1.1", "1.2", "1.3"].map((n) => konuDurumu(n, qs.filter((q) => q.konu === n), cev));
    expect(zayifKonular(d).map((x) => x.no)).toEqual(["1.2", "1.3"]);
  });
  it("arama konu, kavram ve soru döndürür", () => {
    const konular = [{ no: "1.1", baslik: "Toplum nedir", unite: 1, sayfa: 1, html: "", metin: "", video: {} }];
    const r = aramaYap(konular, [{ terim: "Toplumsal yapı", tanim: "x", konu: "1.1", kaynak: "kitap" }], [soru("a", "1.1", "Toplum kavramı nedir")], "toplum");
    expect(r.map((x) => x.tur)).toEqual(["konu", "kavram", "soru"]);
    expect(aramaYap(konular, [], [], "t")).toEqual([]);
  });
  it("kitaptan dayanak paragrafını bulur", () => {
    const metin = "Kısa satır.\nSosyal izolasyon primatlar üzerinde ağır zararlar gösterir ve yavrulara kötü davranış doğurur.\nBaşka bir konuya ait uzun paragraf burada yer alıyor ve alakasız şeyler anlatıyor.";
    const p = kitaptaParagraf(metin, { text: "Sosyal izolasyon primatlar üzerinde hangi zararları gösterir", options: { A: "ağır zararlar" }, answer: "A" });
    expect(p).toContain("izolasyon");
  });
  it("yazdırma çıktısı cevap anahtarını sona koyar", () => {
    const k = { no: "1.1", baslik: "Giriş", unite: 1, sayfa: 1, html: "", metin: "kitap metni", video: {} };
    const html = uniteBaskiHtml(1, "Ünite", [k], [], new Map([["1.1", [soru("a", "1.1")]]]));
    expect(html.indexOf("Cevap anahtarı")).toBeGreaterThan(html.indexOf("Çıkmış sorular"));
  });
});

describe("mdHtml", () => {
  it("renders italic, bold, headings and lists without leaving Markdown marks", () => {
    const html = mdHtml("### Alt başlık\n\n**Bouglé**'nın *Qu’est-ce que la sociologie?* eseri\n\n1. **Bir**: açıklama\n2. İki");
    expect(html).toContain('<h4 class="co-ak-h">Alt başlık</h4>');
    expect(html).toContain("<em>Qu’est-ce que la sociologie?</em>");
    expect(html).toContain('<ol class="co-ak-liste">');
    expect(html).not.toMatch(/\*|###/);
  });
  it("shows raw HTML and links from generated text as plain text", () => {
    const html = mdHtml('<script>alert(1)</script> [bağlantı](https://ornek.test) <b onclick="x">kalın</b>');
    expect(html).not.toMatch(/<script|<a |<b /);
    expect(html).toContain("bağlantı");
  });
});
