// Markdown summary of a course for agents and llms.txt readers. Built only under the canonical
// department and only for courses with questions, like the sitemap (src/lib/site-haritasi.ts).
import type { APIRoute, GetStaticPaths } from "astro";
import { getDersIcerik, getKitapKonulari, getKitapUniteAdlari, getQuestions } from "../../../../lib/api";
import { dereceAdi } from "../../../../lib/derece";
import { dersOzetiMetni, type OzetUnitesi } from "../../../../lib/ders-ozeti";
import { courseDepartments } from "../../../../lib/kanonik";
import { katalog, metinYaniti, type KatalogDersi } from "../../../../lib/site-haritasi";
import { uniteBasligi } from "../../../../lib/unite-basligi";

export const getStaticPaths = (async () =>
  (await katalog()).flatMap((k) =>
    k.dersler.map((d) => ({ params: { university: d.uni.id, department: d.bolum.id, course: d.ders.id }, props: { d } })),
  )) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ site, props }) => {
  const { d } = props as { d: KatalogDersi };
  const { uni, bolum, ders } = d;
  const [sorular, icerik, kitap, kitapAdlari, bolumler] = await Promise.all([
    getQuestions(uni.id, ders.id),
    getDersIcerik(uni.id, ders.id),
    getKitapKonulari(uni.id, ders.id),
    getKitapUniteAdlari(uni.id, ders.code),
    courseDepartments(),
  ]);

  // Same precedence as the course page: official weekly list (when it covers every unit), then the
  // book's own unit list, then the book topic tree.
  const enBuyuk = Math.max(0, ...sorular.map((q) => q.unitNumber));
  const resmi = (icerik?.konular ?? []).length >= enBuyuk ? (icerik?.konular ?? []) : [];
  const ad = new Map<number, string>(resmi.map((k) => [k.no, uniteBasligi(k.baslik).baslik]));
  kitapAdlari.forEach((b, i) => ad.set(i + 1, uniteBasligi(b).baslik));
  for (const u of kitap) if (!ad.has(u.unite)) ad.set(u.unite, uniteBasligi(u.baslik).baslik);
  const kitapUnite = new Map(kitap.map((u) => [u.unite, u]));

  const numaralar = [...new Set([...sorular.map((q) => q.unitNumber), ...kitap.map((u) => u.unite)])].sort(
    (a, b) => (a === 0 ? 1 : 0) - (b === 0 ? 1 : 0) || a - b,
  );
  const uniteler: OzetUnitesi[] = numaralar.map((no) => ({
    no,
    baslik: ad.get(no),
    konular: (kitapUnite.get(no)?.konular ?? []).map((k) => `${k.no} ${k.baslik}`),
  }));

  const metin = dersOzetiMetni(site, {
    yol: d.yol,
    dersAdi: ders.name,
    kod: ders.code || undefined,
    donem: ders.semester,
    universite: uni.name,
    fakulte: uni.faculty,
    bolumler: (bolumler.get(`${uni.id}/${ders.id}`) ?? [{ id: bolum.id, ad: bolum.name }]).map((b) => b.ad),
    derece: dereceAdi(bolum.degree),
    amac: icerik?.amac,
    resmiSayfa: icerik?.url,
    guncel: icerik?.guncel,
    uniteler,
    sorular,
  });
  return metinYaniti(metin, "text/markdown");
};
