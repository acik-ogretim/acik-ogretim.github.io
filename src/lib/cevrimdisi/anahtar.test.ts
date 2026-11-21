import { describe, expect, it } from "vitest";
import {
  anahtarUrl,
  bolumYolu,
  boyutMetni,
  dersDosyalari,
  dersYolu,
  icerikIcinNormalle,
  parcaBagimliliklari,
  sayfaVarliklari,
  sayfadanDersAdi,
  yolNormalle,
} from "./anahtar";

describe("yolNormalle", () => {
  it("gives one key for the slash, no slash and index.html forms", () => {
    expect(yolNormalle("/offline")).toBe("/offline/");
    expect(yolNormalle("/offline/")).toBe("/offline/");
    expect(yolNormalle("/offline/index.html")).toBe("/offline/");
    expect(yolNormalle("/")).toBe("/");
    expect(yolNormalle("/index.html")).toBe("/");
  });
  it("leaves files alone and collapses repeated slashes", () => {
    expect(yolNormalle("/sw.js")).toBe("/sw.js");
    expect(yolNormalle("/veri/auzef/anatomi.json")).toBe("/veri/auzef/anatomi.json");
    expect(yolNormalle("//auzef//cocuk-gelisimi")).toBe("/auzef/cocuk-gelisimi/");
  });
});

describe("anahtarUrl", () => {
  it("drops query and hash", () => {
    expect(anahtarUrl("https://x.test/auzef/b/d?bolum=c#question-3-1")).toBe("https://x.test/auzef/b/d/");
    expect(anahtarUrl("/ara", "https://x.test/")).toBe("https://x.test/ara/");
  });
  it("decodes the path so encoded and plain forms match", () => {
    expect(anahtarUrl("https://x.test/a%2Db/")).toBe("https://x.test/a-b/");
  });
});

describe("dersYolu and bolumYolu", () => {
  const uniler = new Set(["auzef", "anadolu-aof"]);
  it("reads course paths in every form", () => {
    expect(dersYolu("/auzef/cocuk-gelisimi/anatomi")).toEqual({ uni: "auzef", bolum: "cocuk-gelisimi", ders: "anatomi" });
    expect(dersYolu("/auzef/cocuk-gelisimi/anatomi/index.html", uniler)?.ders).toBe("anatomi");
  });
  it("rejects other paths", () => {
    expect(dersYolu("/auzef/cocuk-gelisimi/anatomi/materyaller/")).toBeNull();
    expect(dersYolu("/veri/auzef/anatomi.json")).toBeNull();
    expect(dersYolu("/baska/b/d/", uniler)).toBeNull();
    expect(bolumYolu("/auzef/cocuk-gelisimi/")).toEqual({ uni: "auzef", bolum: "cocuk-gelisimi" });
    expect(bolumYolu("/auzef/")).toBeNull();
  });
});

describe("dersDosyalari", () => {
  it("names the page, materials and chat data of a course", () => {
    expect(dersDosyalari("/auzef/b/anatomi", "auzef", "anatomi")).toEqual({
      sayfa: "/auzef/b/anatomi/",
      materyal: "/auzef/b/anatomi/materyaller/",
      veri: "/veri/auzef/anatomi.json",
    });
  });
});

describe("sayfaVarliklari and parcaBagimliliklari", () => {
  const html = `<link rel="stylesheet" href="/_astro/a.B1.css"><script type="module" src="/_astro/hoisted.X.js"></script>
    <astro-island component-url="/_astro/Sohbet.Y.js" renderer-url="/_astro/client.Z.js"></astro-island>
    <img src="/_img/abc.png" loading="lazy"><img src='/_img/abc.png'><a href="/_astro/a.B1.css">x</a>`;
  it("finds build assets and images once each", () => {
    expect(sayfaVarliklari(html)).toEqual({
      astro: ["/_astro/a.B1.css", "/_astro/hoisted.X.js", "/_astro/Sohbet.Y.js", "/_astro/client.Z.js"],
      img: ["/_img/abc.png"],
    });
  });
  it("follows relative chunk imports", () => {
    const js = `import{a as b}from"./index.Q3.js";const s=()=>import("./Sohbet.Y.js");import"./x.css";`;
    expect(parcaBagimliliklari(js)).toEqual(["/_astro/index.Q3.js", "/_astro/Sohbet.Y.js", "/_astro/x.css"]);
  });
});

describe("icerikIcinNormalle", () => {
  it("ignores asset names so a script-only build keeps the course hash", () => {
    const a = `<script src="/_astro/hoisted.AAA.js"></script><p data-astro-cid-x1>Soru</p>`;
    const b = `<script src="/_astro/hoisted.BBB.js"></script><p data-astro-cid-y2>Soru</p>`;
    expect(icerikIcinNormalle(a)).toBe(icerikIcinNormalle(b));
    expect(icerikIcinNormalle(a)).not.toBe(icerikIcinNormalle(b.replace("Soru", "Yeni soru")));
  });
});

describe("sayfadanDersAdi and boyutMetni", () => {
  it("reads the course heading", () => {
    expect(sayfadanDersAdi(`<h1 id="ders-adi" class="x">Anne &amp; Çocuk Sağlığı</h1>`)).toBe("Anne & Çocuk Sağlığı");
    expect(sayfadanDersAdi("<h1>Başka</h1>")).toBeNull();
  });
  it("writes sizes with a Turkish comma", () => {
    expect(boyutMetni(0)).toBe("0 KB");
    expect(boyutMetni(820_000)).toBe("820 KB");
    expect(boyutMetni(1_400_000)).toBe("1,4 MB");
    expect(boyutMetni(250_000_000)).toBe("250 MB");
    expect(boyutMetni(2_300_000_000)).toBe("2,3 GB");
  });
});
