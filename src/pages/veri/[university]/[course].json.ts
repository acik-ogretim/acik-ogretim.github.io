// Per-course question data for the in-browser chat tools; prerendered at build, so it is a static file.
import fs from "node:fs/promises";
import path from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";
import { getCourses, getQuestions, getUniversities } from "../../../lib/api";
import { toPlainText } from "../../../../scripts/utils/clean-html";

export const getStaticPaths = (async () => {
  const paths = [];
  for (const uni of await getUniversities()) {
    for (const dept of uni.departments || []) {
      for (const course of await getCourses(uni.id, dept.id)) {
        paths.push({ params: { university: uni.id, course: course.id }, props: { uni, dept, course } });
      }
    }
  }
  return paths;
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { uni, dept, course } = props as Awaited<ReturnType<typeof getStaticPaths>>[number]["props"];
  const questions = await getQuestions(uni.id, course.id);
  const base = `/${uni.id}/${dept.id}/${course.id}/`;
  const perUnit = new Map<number, number>();
  const items = questions.map((q) => {
    const idx = perUnit.get(q.unitNumber) ?? 0; // same order as the course page, so anchors match
    perUnit.set(q.unitNumber, idx + 1);
    return {
      id: q.id,
      unit: q.unitNumber,
      no: idx + 1,
      text: toPlainText(q.text),
      options: Object.fromEntries(q.options.map((o) => [o.key, toPlainText(o.text)])),
      answer: q.correctAnswer,
      explanation: toPlainText(q.explanation),
      source: q.source,
      year: q.year || undefined,
      examType: q.examType,
      url: `${base}#question-${q.unitNumber}-${idx}`,
    };
  });
  // Unit summaries written for the chat (data/ozetler/<uni>/<course>.json), when the course has them.
  let summaries: unknown[] = [];
  try {
    const raw = JSON.parse(await fs.readFile(path.join(process.cwd(), "data", "ozetler", uni.id, `${course.id}.json`), "utf-8"));
    summaries = Array.isArray(raw.uniteler) ? raw.uniteler : [];
  } catch {
    summaries = [];
  }
  return new Response(
    JSON.stringify({ summaries, course: { id: course.id, name: course.name, code: course.code, university: uni.name, department: dept.name, url: base }, questions: items }),
    { headers: { "Content-Type": "application/json" } },
  );
};
