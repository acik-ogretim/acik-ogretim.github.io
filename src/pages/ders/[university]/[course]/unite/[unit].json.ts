// /ders/<uni>/<ders>/unite/<n>.json: the questions of one unit (docs/veri-mimarisi.md, UniteSorulari).
// TEMPORARY producer, see ../index.json.ts.
import type { APIRoute, GetStaticPaths } from "astro";
import { getCourses, getUniversities } from "../../../../../lib/api";
import { dersBaglaminiAl, paketUnitesi, uniteNumaralari } from "../../../../../lib/ders-baglami";

export const getStaticPaths = (async () => {
  const paths = [];
  const gorulen = new Set<string>();
  for (const uni of await getUniversities()) {
    for (const dept of uni.departments || []) {
      for (const course of await getCourses(uni.id, dept.id)) {
        if (gorulen.has(`${uni.id}/${course.id}`)) continue;
        gorulen.add(`${uni.id}/${course.id}`);
        for (const unit of await uniteNumaralari(uni.id, course.id)) {
          paths.push({ params: { university: uni.id, course: course.id, unit: String(unit) }, props: { uni: uni.id, course, unit } });
        }
      }
    }
  }
  return paths;
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { uni, course, unit } = props as Awaited<ReturnType<typeof getStaticPaths>>[number]["props"];
  return new Response(JSON.stringify(paketUnitesi(await dersBaglaminiAl(uni, course), unit)), { headers: { "Content-Type": "application/json" } });
};
