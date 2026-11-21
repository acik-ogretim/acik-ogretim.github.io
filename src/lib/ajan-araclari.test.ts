import { beforeEach, describe, expect, it, vi } from "vitest";
import { AJANA_KAPALI_EYLEMLER, ARACLAR, araciCalistir, dersleriAra, girdiSemasi, katla, type AracOrtami, type KatalogKaydi } from "./ajan-araclari";
import { araclariKaydet } from "./webmcp";
import type { Yer } from "./calisma-durumu";

const katalog: KatalogKaydi[] = [
  { key: "auzef/genel-psikoloji", name: "Genel Psikoloji", code: "PSK101", semester: 1, university: "İstanbul Üniversitesi", universityShort: "AUZEF", department: "Çocuk Gelişimi", url: "/auzef/cocuk-gelisimi/genel-psikoloji/" },
  { key: "auzef/genel-psikoloji", name: "Genel Psikoloji", code: "PSK101", semester: 1, university: "İstanbul Üniversitesi", universityShort: "AUZEF", department: "Sosyoloji", url: "/auzef/sosyoloji/genel-psikoloji/" },
  { key: "anadolu-aof/genel-psikoloji", name: "Genel Psikoloji", code: "SOS103U", semester: 1, university: "Anadolu Üniversitesi", universityShort: "Anadolu AÖF", department: "Sosyoloji", url: "/anadolu-aof/sosyoloji/genel-psikoloji/" },
  { key: "ataturk-aof/isletme-yonetimi", name: "İşletme Yönetimi", code: "ISL201", semester: 3, university: "Atatürk Üniversitesi", universityShort: "ATA-AÖF", department: "İşletme", url: "/ataturk-aof/isletme/isletme-yonetimi/" },
];

const yer = (ek: Partial<Yer> = {}): Yer => ({
  yol: "/auzef/cocuk-gelisimi/genel-psikoloji",
  ad: "Genel Psikoloji",
  soru: "q1",
  unite: 2,
  sira: 4,
  uniteToplam: 10,
  kip: "okuma",
  zaman: 1,
  ...ek,
});

function ortamKur(yol = "/"): AracOrtami & { gidilen: string[]; depo: Map<string, string>; yenilendi: number } {
  const depo = new Map<string, string>();
  const o = {
    gidilen: [] as string[],
    depo,
    yenilendi: 0,
    katalog: async () => katalog,
    yol: () => yol,
    git: (a: string) => void o.gidilen.push(a),
    yenile: () => void o.yenilendi++,
    kaydir: (id: string) => ["unite-2", "question-2-4"].includes(id),
    depoOku: (k: string) => depo.get(k) ?? null,
    depoYaz: (k: string, v: string) => void depo.set(k, v),
    suzgeciUygula: vi.fn(),
    soruSayisiMetni: () => "12 soru gösteriliyor",
    kaldiginYer: () => ({}) as Record<string, Yer>,
  };
  return o;
}

describe("araç tanımları", () => {
  it("adlar benzersiz ve görevdeki araçların hepsi var", () => {
    const adlar = ARACLAR.map((a) => a.name);
    expect(new Set(adlar).size).toBe(adlar.length);
    for (const ad of ["ders_ara", "dersi_ac", "uniteye_git", "soruya_git", "sorulari_filtrele", "kaldigim_yere_don"]) expect(adlar).toContain(ad);
  });

  it("JSON Schema Zod şemasından üretilir: nesne, zorunlu alanlar, açıklamalar", () => {
    for (const a of ARACLAR) {
      const s = girdiSemasi(a) as { type: string; properties: Record<string, { description?: string }>; required?: string[] };
      expect(s.type).toBe("object");
      expect(s).not.toHaveProperty("$schema");
      for (const p of Object.values(s.properties)) expect(typeof p).toBe("object");
    }
    const ara = girdiSemasi(ARACLAR.find((a) => a.name === "ders_ara")!) as { required: string[]; properties: Record<string, { description?: string }> };
    expect(ara.required).toEqual(["sorgu"]);
    expect(ara.properties.sorgu.description).toMatch(/Ders adı/);
  });

  it("kayıt silen eylemler ajana kapalı", () => {
    const s = girdiSemasi(ARACLAR.find((a) => a.name === "eylem_calistir")!) as { properties: { eylem: { enum: string[] } } };
    for (const id of AJANA_KAPALI_EYLEMLER) expect(s.properties.eylem.enum).not.toContain(id);
    expect(s.properties.eylem.enum).toContain("seslendir");
  });
});

describe("ders_ara", () => {
  it("Türkçe harfleri katlar", () => {
    expect(katla("İŞLETME Yönetimi")).toBe("isletme yonetimi");
  });
  it("aynı dersi bir kez döndürür ve üniversiteyle süzer", () => {
    expect(dersleriAra(katalog, "genel psikoloji").map((k) => k.key)).toEqual(["anadolu-aof/genel-psikoloji", "auzef/genel-psikoloji"]);
    expect(dersleriAra(katalog, "genel psikoloji", "auzef").map((k) => k.key)).toEqual(["auzef/genel-psikoloji"]);
    expect(dersleriAra(katalog, "isletme yonetimi")[0].key).toBe("ataturk-aof/isletme-yonetimi");
    expect(dersleriAra(katalog, "SOS103U")[0].key).toBe("anadolu-aof/genel-psikoloji");
  });
  it("geçersiz girdiyi açıklamayla geri çevirir", async () => {
    const r = await araciCalistir("ders_ara", { sorgu: "a" }, ortamKur());
    expect(r.tamam).toBe(false);
    expect(r.mesaj).toMatch(/Geçersiz girdi/);
    expect((await araciCalistir("yok_boyle", {}, ortamKur())).tamam).toBe(false);
  });
  it("eski Chrome'un JSON metni girdisini de kabul eder", async () => {
    const r = await araciCalistir("ders_ara", JSON.stringify({ sorgu: "psikoloji", universite: "anadolu-aof" }), ortamKur());
    expect(r.tamam).toBe(true);
    expect(r.veri).toEqual([expect.objectContaining({ universite: "anadolu-aof", ders: "genel-psikoloji" })]);
  });
});

describe("gezinme araçları", () => {
  it("dersi_ac katalogdaki adrese gider", async () => {
    const o = ortamKur();
    const r = await araciCalistir("dersi_ac", { universite: "auzef", ders: "genel-psikoloji" }, o);
    expect(r.tamam).toBe(true);
    expect(o.gidilen).toEqual(["/auzef/cocuk-gelisimi/genel-psikoloji/"]);
    expect((await araciCalistir("dersi_ac", { universite: "auzef", ders: "yok" }, o)).tamam).toBe(false);
  });
  it("ünite ve soru araçları yalnız ders sayfasında çalışır", async () => {
    expect((await araciCalistir("uniteye_git", { no: 2 }, ortamKur("/auzef/"))).tamam).toBe(false);
    const ders = ortamKur("/auzef/cocuk-gelisimi/genel-psikoloji/");
    expect((await araciCalistir("uniteye_git", { no: 2 }, ders)).tamam).toBe(true);
    expect((await araciCalistir("uniteye_git", { no: 9 }, ders)).tamam).toBe(false);
    expect((await araciCalistir("soruya_git", { unite: 2, no: 5 }, ders)).tamam).toBe(true);
    expect((await araciCalistir("soruya_git", { unite: 2, no: 0 }, ders)).tamam).toBe(false);
  });
});

describe("sorulari_filtrele", () => {
  let o: ReturnType<typeof ortamKur>;
  beforeEach(() => {
    o = ortamKur("/auzef/cocuk-gelisimi/genel-psikoloji/");
    o.depo.set("quiz-settings", JSON.stringify({ playbackRate: 1.5, filterSource: "alistirma" }));
  });
  it("yalnız verilen alanları değiştirir, diğer ayarları korur ve oynatıcıyı yeniler", async () => {
    const r = await araciCalistir("sorulari_filtrele", { unite: 3, yanlislarim: true }, o);
    expect(r).toMatchObject({ tamam: true, mesaj: "12 soru gösteriliyor" });
    const ayar = JSON.parse(o.depo.get("quiz-settings")!);
    expect(ayar).toMatchObject({ playbackRate: 1.5, filterUnite: "3", filterSource: "alistirma", filterIncorrect: true, filterUnanswered: false });
    expect(o.suzgeciUygula).toHaveBeenCalledOnce();
  });
  it("sifirla bütün süzgeci kaldırır", async () => {
    await araciCalistir("sorulari_filtrele", { sifirla: true }, o);
    expect(JSON.parse(o.depo.get("quiz-settings")!)).toMatchObject({ filterUnite: "all", filterSource: "all", playbackRate: 1.5 });
  });
  it("bilinmeyen kaynak değerini reddeder", async () => {
    expect((await araciCalistir("sorulari_filtrele", { kaynak: "hepsi" }, o)).tamam).toBe(false);
  });
});

describe("kaldigim_yere_don", () => {
  it("kayıt yoksa söyler", async () => {
    const r = await araciCalistir("kaldigim_yere_don", {}, ortamKur());
    expect(r.tamam).toBe(false);
  });
  it("en son çalışılan derse devam bağlantısıyla gider", async () => {
    const o = ortamKur("/");
    o.kaldiginYer = () => ({ "auzef/genel-psikoloji": yer({ zaman: 5 }), "anadolu-aof/x": yer({ yol: "/anadolu-aof/b/x", ad: "X", zaman: 2 }) });
    const r = await araciCalistir("kaldigim_yere_don", {}, o);
    expect(r.mesaj).toMatch(/Genel Psikoloji: Ünite 2 · Soru 4 \/ 10/);
    expect(o.gidilen).toEqual(["/auzef/cocuk-gelisimi/genel-psikoloji#kaldigin-yer"]);
    expect(o.yenilendi).toBe(0);
  });
  it("aynı dersteyse sayfayı devam işaretiyle yeniden yükler", async () => {
    const o = ortamKur("/auzef/cocuk-gelisimi/genel-psikoloji/");
    o.kaldiginYer = () => ({ "auzef/genel-psikoloji": yer() });
    await araciCalistir("kaldigim_yere_don", {}, o);
    expect(o.yenilendi).toBe(1);
  });
});

describe("WebMCP kaydı", () => {
  it("her aracı şemasıyla kaydeder; execute doğrulayıp metin döndürür", async () => {
    const kayitlar: { name: string; inputSchema?: unknown; execute: (g: unknown) => Promise<string> }[] = [];
    const sinyaller: (AbortSignal | undefined)[] = [];
    const baglam = { registerTool: (a: (typeof kayitlar)[number], s?: { signal?: AbortSignal }) => void (kayitlar.push(a), sinyaller.push(s?.signal)) };
    const sayi = await araclariKaydet(baglam, ortamKur());
    expect(sayi).toBe(ARACLAR.length);
    expect(kayitlar.map((k) => k.name)).toEqual(ARACLAR.map((a) => a.name));
    expect(sinyaller.every((s) => s instanceof AbortSignal)).toBe(true);
    const ara = kayitlar.find((k) => k.name === "ders_ara")!;
    expect(await ara.execute({ sorgu: "işletme" })).toMatch(/^1 ders bulundu\.\n\[/);
    expect(await ara.execute({})).toMatch(/Geçersiz girdi/);
  });
  it("ikinci kayıt öncekini iptal eder; destek yoksa hiçbir şey yapmaz", async () => {
    const sinyaller: AbortSignal[] = [];
    const baglam = { registerTool: (_a: unknown, s?: { signal?: AbortSignal }) => void sinyaller.push(s!.signal!) };
    await araclariKaydet(baglam, ortamKur());
    await araclariKaydet(baglam, ortamKur());
    expect(sinyaller[0].aborted).toBe(true);
    expect(sinyaller[sinyaller.length - 1].aborted).toBe(false);
    expect(await araclariKaydet(null, ortamKur())).toBe(0);
  });
});
