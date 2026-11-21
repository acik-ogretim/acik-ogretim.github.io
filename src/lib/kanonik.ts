// One page per course: a course shared by many departments (Türk Dili, Yabancı Dil, elective pools)
// is built once under its canonical department; other department paths become small redirect pages.
// Building a full question page per department multiplied shared courses by up to 50 and pushed the
// static build past 2 GB (20 Nov 2026).
import { getCourses, getUniversities } from "./api";

const POOL = new Set(["secmeli", "alan-disi-secmeli"]);

let cache: Map<string, string> | null = null;

/** Key `${uniId}/${courseId}` -> department id that owns the full course page. */
export async function canonicalDepartments(): Promise<Map<string, string>> {
  if (cache) return cache;
  const map = new Map<string, string>();
  const fallback = new Map<string, string>();
  for (const uni of await getUniversities()) {
    for (const dept of uni.departments || []) {
      for (const course of await getCourses(uni.id, dept.id)) {
        const key = `${uni.id}/${course.id}`;
        if (!POOL.has(course.kategori ?? "")) {
          if (!map.has(key)) map.set(key, dept.id);
        } else if (!fallback.has(key)) fallback.set(key, dept.id);
      }
    }
  }
  for (const [key, dept] of fallback) if (!map.has(key)) map.set(key, dept);
  cache = map;
  return map;
}

export function coursePath(uniId: string, deptId: string, courseId: string): string {
  return `/${uniId}/${deptId}/${courseId}`;
}

export type DersBolumu = { id: string; ad: string };

let bolumCache: Map<string, DersBolumu[]> | null = null;

/** Key `${uniId}/${courseId}` -> every department that lists the course, in catalog order. */
export async function courseDepartments(): Promise<Map<string, DersBolumu[]>> {
  if (bolumCache) return bolumCache;
  const map = new Map<string, DersBolumu[]>();
  for (const uni of await getUniversities()) {
    for (const dept of uni.departments || []) {
      for (const course of await getCourses(uni.id, dept.id)) {
        const key = `${uni.id}/${course.id}`;
        const liste = map.get(key) ?? [];
        if (!liste.some((b) => b.id === dept.id)) liste.push({ id: dept.id, ad: dept.name });
        map.set(key, liste);
      }
    }
  }
  bolumCache = map;
  return map;
}
