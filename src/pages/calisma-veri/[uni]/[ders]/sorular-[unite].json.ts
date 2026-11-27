// /calisma-veri/<üniversite>/<ders>/sorular-<ünite>.json (aynı ders kimliği başka üniversitelerde de var).
// Çıkmış sorular, ünite başına küçük bir dosya: çalışma odasının "Sınav" sekmesi yalnız açık üniteyi tembel yükler
// (src/scripts/calisma-odasi.ts). Soru kimlikleri ders sayfasındaki veri kimlikleridir; cevaplar aynı kayda yazılır.
import type { APIRoute, GetStaticPaths } from "astro";
import { getQuestions } from "../../../../lib/api";
import { examLine, kunyeOzeti } from "../../../../lib/soru-karti";
import { toPlainText } from "../../../../../scripts/utils/clean-html";

type Alan = Parameters<typeof examLine>[0];

export const getStaticPaths = (async () => {
  const paketler = import.meta.glob<{ ders: string; uni: string; uniteler?: { no: number }[] }>("../../../../data/calisma-odasi/*.json", { eager: true, import: "default" });
  const yollar = [];
  for (const p of Object.values(paketler)) {
    const sorular = await getQuestions(p.uni, p.ders);
    // The book decides the unit count: Anadolu books run from 4 to 12 units, so a fixed 7 dropped unit 8 and later
    // questions from the Sınav tab (27 Nov 2026).
    const sonUnite = Math.max(0, ...(p.uniteler ?? []).map((u) => u.no));
    for (let unite = 1; unite <= sonUnite; unite++) {
      const liste = sorular.filter((q) => q.unitNumber === unite);
      if (!liste.length) continue;
      yollar.push({
        params: { uni: p.uni, ders: p.ders, unite: String(unite) },
        props: {
          sorular: liste.map((q, i) => ({
            id: q.id,
            no: i + 1,
            text: toPlainText(q.text),
            options: Object.fromEntries(q.options.map((o) => [o.key, toPlainText(o.text)])),
            answer: q.correctAnswer,
            explanation: toPlainText(q.explanation),
            sinav: kunyeOzeti(q as unknown as Alan), // ders sayfasının künye biçimi: "2025-2026 Bütünleme +5"
            sinavlar: examLine(q as unknown as Alan) || undefined,
            konu: q.section || undefined,
          })),
        },
      });
    }
  }
  return yollar;
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify((props as { sorular: unknown[] }).sorular), { headers: { "Content-Type": "application/json" } });
