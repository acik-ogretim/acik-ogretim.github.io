import { describe, expect, it } from "vitest";
import { kucukturKacir, olumsuzuVurgula, onculSatirlari, secenekHarfleriniSil } from "../utils/soru-bicim";

describe("secenekHarfleriniSil", () => {
  it("drops the option's own letter with a parenthesis", () => {
    expect(secenekHarfleriniSil({ A: "A) Elton Mayo", B: "B) Max Weber" })).toEqual({ A: "Elton Mayo", B: "Max Weber" });
    expect(secenekHarfleriniSil({ E: "(E) Ticaret Kanunu" })).toEqual({ E: "Ticaret Kanunu" });
  });
  it("keeps initials and other letters", () => {
    expect(secenekHarfleriniSil({ A: "R. May", B: "A. Weber" })).toEqual({ A: "R. May", B: "A. Weber" });
    expect(secenekHarfleriniSil({ A: "B) yanlış harf" })).toEqual({ A: "B) yanlış harf" });
    expect(secenekHarfleriniSil({ A: "A. femoralis", B: "A. caudalis" })).toEqual({ A: "A. femoralis", B: "A. caudalis" });
  });
  it("drops 'X.' only when every option has its own letter", () => {
    expect(secenekHarfleriniSil({ A: "A. bir", B: "B. iki" })).toEqual({ A: "bir", B: "iki" });
  });
});

describe("onculSatirlari", () => {
  it("splits inline premises", () => {
    expect(onculSatirlari("I. Su gradyanına II. Kimyasal konsantrasyonlara III. Juvenilleşmeye")).toBe(
      "I. Su gradyanına<br/>II. Kimyasal konsantrasyonlara<br/>III. Juvenilleşmeye",
    );
  });
  it("moves the stem after the last premise to its own line", () => {
    expect(onculSatirlari("I. Hızlı sonuç alınamaz. II. Grup büyükse uygun olur. Yukarıdakilerden hangileri doğrudur?")).toBe(
      "I. Hızlı sonuç alınamaz.<br/>II. Grup büyükse uygun olur.<br/>Yukarıdakilerden hangileri doğrudur?",
    );
  });
  it("breaks before an unpunctuated 'Yukarıdakilerden' stem", () => {
    expect(onculSatirlari("I. Mora II. Tımışvar III. Erdel Karlofça ile Osmanlılar yukarıdakilerden hangilerini almıştır?")).toBe(
      "I. Mora<br/>II. Tımışvar<br/>III. Erdel Karlofça ile Osmanlılar yukarıdakilerden hangilerini almıştır?",
    );
    expect(onculSatirlari("I. İş garantisi II. Okul isteği Yukarıdakilerden hangileri etik değildir?")).toBe(
      "I. İş garantisi<br/>II. Okul isteği<br/>Yukarıdakilerden hangileri etik değildir?",
    );
  });
  it("starts the list on a new line after the question", () => {
    expect(onculSatirlari("Hangileri doğrudur? I. a II. b")).toBe("Hangileri doğrudur?<br/>I. a<br/>II. b");
  });
  it("leaves already split lists and ordinary sentences", () => {
    const hazir = "I. a<br/>II. b<br/>III. c";
    expect(onculSatirlari(hazir)).toBe(hazir);
    expect(onculSatirlari("1453'te I. Mehmet değil II. Mehmet şehri aldı.")).toBe("1453'te I. Mehmet değil II. Mehmet şehri aldı.");
    expect(onculSatirlari("II. Dünya Savaşı hangi yıl başlamıştır?")).toBe("II. Dünya Savaşı hangi yıl başlamıştır?");
  });
});

describe("olumsuzuVurgula", () => {
  it("underlines the negative last word of the question", () => {
    expect(olumsuzuVurgula("Aşağıdakilerden hangisi stresin belirtilerinden biri değildir?")).toBe(
      "Aşağıdakilerden hangisi stresin belirtilerinden biri <u>değildir</u>?",
    );
    expect(olumsuzuVurgula("Aşağıdakilerden hangisi bu kapsamda yer almaz?")).toBe("Aşağıdakilerden hangisi bu kapsamda yer <u>almaz</u>?");
    expect(olumsuzuVurgula("Hangisi söylenemez?")).toBe("Hangisi <u>söylenemez</u>?");
    expect(olumsuzuVurgula("Yukarıdakilerden hangisi doğru <strong>değildir</strong>?")).toBe(
      "Yukarıdakilerden hangisi doğru <strong><u>değildir</u></strong>?",
    );
  });
  it("leaves positive endings and non-questions", () => {
    expect(olumsuzuVurgula("Aşağıdakilerden hangisi bu kapsamda yer almaktadır?")).toBe("Aşağıdakilerden hangisi bu kapsamda yer almaktadır?");
    expect(olumsuzuVurgula("Aşağıdakilerden hangisi doğrudur?")).toBe("Aşağıdakilerden hangisi doğrudur?");
    expect(olumsuzuVurgula("Bu bir yaz?")).toBe("Bu bir yaz?");
    expect(olumsuzuVurgula("Stres her zaman hasarın sonucu değildir.")).toBe("Stres her zaman hasarın sonucu değildir.");
    const zaten = "Aşağıdakilerden hangisi <u>değildir</u>?";
    expect(olumsuzuVurgula(zaten)).toBe(zaten);
  });
});

describe("kucukturKacir", () => {
  it("escapes a bare < before a letter", () => {
    expect(kucukturKacir("0<x<10 aralığında")).toBe("0&lt;x<10 aralığında");
    expect(kucukturKacir("Mod<Medyan<Aritmetik Ortalama")).toBe("Mod&lt;Medyan&lt;Aritmetik Ortalama");
  });
  it("keeps real tags and spaced comparisons", () => {
    expect(kucukturKacir("I. a<br/>II. b <sub>2</sub> <strong>x</strong>")).toBe("I. a<br/>II. b <sub>2</sub> <strong>x</strong>");
    expect(kucukturKacir("r < i ise")).toBe("r < i ise");
  });
  it("escapes code that looks like a known tag", () => {
    expect(kucukturKacir("cout<<i<<endl;")).toBe("cout<&lt;i<&lt;endl;");
  });
});
