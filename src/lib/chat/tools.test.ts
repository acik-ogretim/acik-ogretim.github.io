import { describe, expect, it, vi } from "vitest";
import { searchQuestions } from "./tools";

const data = {
  course: { id: "c", name: "C", code: "", university: "U", department: "D", url: "/u/d/c/" },
  questions: [
    { id: "1", unit: 1, no: 1, text: "Gordon PET yaklaşımı hangi teknikleri içerir?", options: { A: "Pekiştirme", B: "Aktif dinleme" }, answer: "A", explanation: "Pekiştirme davranışçı modele aittir.", source: "cikmis-soru", examType: "vize", url: "/u/d/c/#question-1-0" },
    { id: "2", unit: 2, no: 1, text: "Okul öncesi eğitimde aile katılımı", options: { A: "x", B: "y" }, answer: "B", explanation: "Aile katılımı programları.", source: "alistirma", examType: "genel", url: "/u/d/c/#question-2-0" },
  ],
};

describe("searchQuestions", () => {
  it("finds the matching question across text and explanation, and honours the unit filter", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(data))));
    const hits = await searchQuestions("u/c", "pekiştirme davranışçı");
    expect(hits[0]?.id).toBe("1");
    expect(await searchQuestions("u/c", "pekiştirme", 2)).toEqual([]);
  });
});
