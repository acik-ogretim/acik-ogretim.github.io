// Çıkmış sorular, ünite başına küçük bir dosya: çalışma odasının "Sınav" sekmesi yalnız açık üniteyi tembel yükler
// (src/scripts/calisma-odasi.ts). Soru kimlikleri ders sayfasındaki veri kimlikleridir; cevaplar aynı kayda yazılır.
import type { APIRoute, GetStaticPaths } from "astro";
import { getQuestions } from "../../../lib/api";
import { toPlainText } from "../../../../scripts/utils/clean-html";

const SON_UNITE = 7;

export const getStaticPaths = (async () => {
  const paketler = import.meta.glob<{ ders: string; uni: string }>("../../../data/calisma-odasi/*.json", { eager: true, import: "default" });
  const yollar = [];
  for (const p of Object.values(paketler)) {
    const sorular = await getQuestions(p.uni, p.ders);
    for (let unite = 1; unite <= SON_UNITE; unite++) {
      const liste = sorular.filter((q) => q.unitNumber === unite);
      if (!liste.length) continue;
      yollar.push({
        params: { ders: p.ders, unite: String(unite) },
        props: {
          sorular: liste.map((q, i) => ({
            id: q.id,
            no: i + 1,
            text: toPlainText(q.text),
            options: Object.fromEntries(q.options.map((o) => [o.key, toPlainText(o.text)])),
            answer: q.correctAnswer,
            explanation: toPlainText(q.explanation),
            year: q.year || undefined,
            examType: q.examType,
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
