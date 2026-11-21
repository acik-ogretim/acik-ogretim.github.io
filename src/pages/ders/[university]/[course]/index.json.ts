// /ders/<uni>/<ders>/index.json: the course package's directory (docs/veri-mimarisi.md, DersDizini).
// TEMPORARY producer: it lists units, topics and unit files only. When scripts/ders-paketi-uret.mjs writes the whole
// package under public/ders/, delete this file and ./unite/[unit].json.ts together with it (the routes would clash).
import type { APIRoute, GetStaticPaths } from "astro";
import { getCourses, getUniversities } from "../../../../lib/api";
import { dersBaglaminiAl, paketDizini, uniteNumaralari } from "../../../../lib/ders-baglami";

export const getStaticPaths = (async () => {
  const paths = [];
  const gorulen = new Set<string>();
  for (const uni of await getUniversities()) {
    for (const dept of uni.departments || []) {
      for (const course of await getCourses(uni.id, dept.id)) {
        // A course shared by several departments has one package
        if (gorulen.has(`${uni.id}/${course.id}`)) continue;
        gorulen.add(`${uni.id}/${course.id}`);
        if ((await uniteNumaralari(uni.id, course.id)).length === 0) continue;
        paths.push({ params: { university: uni.id, course: course.id }, props: { uni: uni.id, course } });
      }
    }
  }
  return paths;
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { uni, course } = props as Awaited<ReturnType<typeof getStaticPaths>>[number]["props"];
  return new Response(JSON.stringify(paketDizini(uni, course, await dersBaglaminiAl(uni, course))), { headers: { "Content-Type": "application/json" } });
};
