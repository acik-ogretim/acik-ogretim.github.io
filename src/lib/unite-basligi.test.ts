import { describe, expect, it } from "vitest";
import { trBaslikDuzen, uniteBasligi } from "./unite-basligi";

describe("uniteBasligi", () => {
  it("AUZEF büyük harfli başlığı düzeltir", () => {
    expect(trBaslikDuzen("TÜRKÇENİN SES OLAYLARI")).toBe("Türkçenin Ses Olayları");
    expect(trBaslikDuzen("DİL VE KÜLTÜR İLİŞKİSİ")).toBe("Dil ve Kültür İlişkisi");
  });
  it("karışık harfli başlığa dokunmaz", () => {
    expect(trBaslikDuzen("Türkiye’de Aile Çalışmaları")).toBe("Türkiye’de Aile Çalışmaları");
  });
  it("Anadolu başlığını alt konulardan ayırır", () => {
    const r = uniteBasligi("Hukukun uygulanması; kaynakları; yorumlanması");
    expect(r.baslik).toBe("Hukukun uygulanması");
    expect(r.alt).toEqual(["kaynakları", "yorumlanması"]);
  });
});

import { haftalardanUniteler } from "./unite-basligi";
import { describe as d2, it as i2, expect as e2 } from "vitest";
d2("haftalardanUniteler", () => {
  i2("drops exam weeks, merges repeated weeks and renumbers", () => {
    const k = ["Psikolojinin Tarihi", "Psikolojinin Tarihi", "ARA SINAV", "Ara Sınav Soru Çözümü-1", "Öğrenme", "Ünite 5 ve 6'nın tekrarı", "Final Sınavı"]
      .map((baslik, i) => ({ no: i + 1, baslik }));
    e2(haftalardanUniteler(k).map((x) => [x.no, x.baslik])).toEqual([[1, "Psikolojinin Tarihi"], [2, "Öğrenme"]]);
  });
  i2("keeps topics that only mention exams", () => {
    e2(haftalardanUniteler([{ no: 1, baslik: "Sınav Kaygısı ve Başa Çıkma" }]).length).toBe(1);
  });
});
