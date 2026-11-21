// Download, resume and delete against an in-memory Cache Storage and a fake network.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ONBELLEK, metaYolu } from "./anahtar";
import { dersIndir, dersSil, metaOku, metalariListele } from "./paket";
import type { DersHedefi } from "./sema";

const TABAN = "https://site.test";
const tam = (u: string) => new URL(u, TABAN).href;

class BellekOnbellek {
  kayit = new Map<string, Response>();
  async match(i: RequestInfo | URL) {
    const r = this.kayit.get(tam(typeof i === "string" ? i : i instanceof URL ? i.href : i.url));
    return r?.clone();
  }
  async put(i: RequestInfo | URL, r: Response) {
    this.kayit.set(tam(typeof i === "string" ? i : i instanceof URL ? i.href : i.url), r.clone());
  }
  async delete(i: RequestInfo | URL) {
    return this.kayit.delete(tam(typeof i === "string" ? i : i instanceof URL ? i.href : i.url));
  }
  async keys() {
    return [...this.kayit.keys()].map((u) => new Request(u));
  }
}

const depolar = new Map<string, BellekOnbellek>();
const ag = new Map<string, string>();
let istekler: string[] = [];
let kopacak: string | null = null;

const SAYFA = (ek = "") =>
  `<h1 id="ders-adi">Anatomi</h1><script type="module" src="/_astro/giris.A.js"></script><img src="/_img/ortak.png">${ek}`;

beforeEach(() => {
  depolar.clear();
  istekler = [];
  kopacak = null;
  ag.clear();
  ag.set("/auzef/b/anatomi/", SAYFA());
  ag.set("/veri/auzef/anatomi.json", '{"questions":[]}');
  ag.set("/auzef/b/anatomi/materyaller/", "<p>materyal</p>");
  ag.set("/ders/auzef/anatomi/index.json", JSON.stringify({ v: 1, dosyalar: [{ yol: "unite/1.json", boyut: 10 }] }));
  ag.set("/ders/auzef/anatomi/unite/1.json", '{"sorular":[{"text":"<img src=\\"/_img/unite.png\\">"}]}');
  ag.set("/_img/unite.png", "PNG2");
  ag.set("/_img/ortak.png", "PNG");
  ag.set("/_astro/giris.A.js", 'import"./ortak.B.js";');
  ag.set("/_astro/ortak.B.js", "export const x=1;");
  vi.stubGlobal("caches", {
    open: async (ad: string) => {
      let c = depolar.get(ad);
      if (!c) depolar.set(ad, (c = new BellekOnbellek()));
      return c;
    },
  });
  vi.stubGlobal("fetch", async (u: string) => {
    const yol = new URL(u, TABAN).pathname;
    istekler.push(yol);
    if (yol === kopacak) throw new TypeError("Failed to fetch");
    const govde = ag.get(yol);
    return govde === undefined ? new Response("yok", { status: 404 }) : new Response(govde, { status: 200 });
  });
});
afterEach(() => vi.unstubAllGlobals());

const hedef = (ek: Partial<DersHedefi> = {}): DersHedefi => ({
  uni: "auzef",
  ders: "anatomi",
  yol: "/auzef/b/anatomi/",
  hash: "h1",
  boyut: 100,
  kabuk: "k1",
  ...ek,
});

describe("dersIndir", () => {
  it("stores the page, data, materials, images and every script the page imports", async () => {
    const ilerleme: number[] = [];
    const m = await dersIndir(hedef(), { ilerleme: (i) => ilerleme.push(i.alinan) });
    expect(m.durum).toBe("tamam");
    expect(m.ad).toBe("Anatomi");
    expect(m.dosyalar.sort()).toEqual([
      "/_img/ortak.png",
      "/_img/unite.png",
      "/auzef/b/anatomi/",
      "/auzef/b/anatomi/materyaller/",
      "/ders/auzef/anatomi/index.json",
      "/ders/auzef/anatomi/unite/1.json",
      "/veri/auzef/anatomi.json",
    ]);
    expect(m.varliklar.sort()).toEqual(["/_astro/giris.A.js", "/_astro/ortak.B.js"]);
    expect(await depolar.get(ONBELLEK.varlik)?.match("/_astro/ortak.B.js")).toBeTruthy();
    expect(ilerleme.at(-1)).toBe(100);
  });

  it("resumes an interrupted download without fetching stored files again", async () => {
    kopacak = "/_img/ortak.png";
    await expect(dersIndir(hedef())).rejects.toThrow();
    const yarim = await metaOku("auzef", "anatomi");
    expect(yarim?.durum).toBe("yarim");
    expect(yarim?.dosyalar).toContain("/veri/auzef/anatomi.json");
    kopacak = null;
    istekler = [];
    const m = await dersIndir(hedef());
    expect(m.durum).toBe("tamam");
    expect(istekler).not.toContain("/veri/auzef/anatomi.json");
    expect(istekler).toContain("/_img/ortak.png");
  });

  it("an update with a new hash fetches every file again", async () => {
    await dersIndir(hedef());
    ag.set("/auzef/b/anatomi/", SAYFA("<p>yeni</p>"));
    istekler = [];
    const m = await dersIndir(hedef({ hash: "h2" }));
    expect(m.hash).toBe("h2");
    expect(istekler).toContain("/veri/auzef/anatomi.json");
    const sayfa = await depolar.get(ONBELLEK.ders)?.match("/auzef/b/anatomi/");
    expect(await sayfa?.text()).toContain("yeni");
  });

  it("a course without a materials page is still complete", async () => {
    ag.delete("/auzef/b/anatomi/materyaller/");
    const m = await dersIndir(hedef());
    expect(m.durum).toBe("tamam");
    expect(m.dosyalar).not.toContain("/auzef/b/anatomi/materyaller/");
  });
});

describe("dersSil", () => {
  it("removes the course but keeps images another stored course uses", async () => {
    await dersIndir(hedef());
    ag.set("/auzef/b/fizyoloji/", SAYFA().replace("Anatomi", "Fizyoloji"));
    ag.set("/veri/auzef/fizyoloji.json", "{}");
    ag.set("/ders/auzef/fizyoloji/index.json", '{"dosyalar":[]}');
    await dersIndir(hedef({ ders: "fizyoloji", yol: "/auzef/b/fizyoloji/" }));
    await dersSil("auzef", "anatomi");
    const c = depolar.get(ONBELLEK.ders);
    expect(await c?.match(metaYolu("auzef", "anatomi"))).toBeUndefined();
    expect(await c?.match("/auzef/b/anatomi/")).toBeUndefined();
    expect(await c?.match("/_img/ortak.png")).toBeTruthy();
    expect((await metalariListele()).map((m) => m.ders)).toEqual(["fizyoloji"]);
  });
});
