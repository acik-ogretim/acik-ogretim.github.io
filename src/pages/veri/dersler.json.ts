// Catalog of every course for the chat's find-course tool; prerendered at build.
import type { APIRoute } from "astro";
import { getCourses, getUniversities } from "../../lib/api";

export const GET: APIRoute = async () => {
  const out = [];
  for (const uni of await getUniversities()) {
    for (const dept of uni.departments || []) {
      for (const c of await getCourses(uni.id, dept.id)) {
        out.push({
          key: `${uni.id}/${c.id}`,
          name: c.name,
          code: c.code,
          semester: c.semester,
          university: uni.name,
          universityShort: uni.shortName,
          department: dept.name,
          url: `/${uni.id}/${dept.id}/${c.id}/`,
        });
      }
    }
  }
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
};
