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
