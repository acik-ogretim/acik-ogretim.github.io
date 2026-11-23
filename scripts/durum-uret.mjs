// Rebuild the public inventory from source files; optional sibling repositories are never inferred.
import {
  existsSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join, resolve, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/** @param {number} count @param {number|null} total @param {boolean} known */
export const metric = (count, total = null, known = true) => ({
  status: !known
    ? "veri yok"
    : !count
      ? "yok"
      : total !== null && count < total
        ? "kısmi"
        : "var",
  count: known ? count : null,
  total,
});
const hasExplanation = (q) =>
  Boolean(
    String(q.explanation ?? "")
      .replace(/<[^>]*>|&nbsp;/g, "")
      .trim(),
  );
export function examStats(questions) {
  const past = questions.filter((q) => q.source === "cikmis-soru");
  const exams = past.flatMap((q) =>
    q.sinavlar?.length ? q.sinavlar : [{ year: q.year, examType: q.examType }],
  );
  return {
    count: past.length,
    explained: past.filter(hasExplanation).length,
    years: [...new Set(exams.map((x) => x.year).filter(Boolean))].sort(),
    midterm: past.filter((q) =>
      (q.sinavlar?.length ? q.sinavlar : [q]).some(
        (x) => x.examType === "vize",
      ),
    ).length,
    final: past.filter((q) =>
      (q.sinavlar?.length ? q.sinavlar : [q]).some(
        (x) => x.examType === "final",
      ),
    ).length,
  };
}
const read = (p, fallback = null) =>
  existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fallback;
const files = (p) => (existsSync(p) ? readdirSync(p) : []);
function dates(root, added = false) {
  if (!existsSync(join(root, ".git"))) return new Map();
  const log = execFileSync(
    "git",
    [
      "-c",
      "core.quotepath=false",
      "log",
      ...(added ? ["--diff-filter=A", "--since=14.days"] : []),
      "--format=@%cI",
      "--name-only",
      "--",
      "data",
      "src/data",
      "ataturk-aof",
      "anadolu-aof",
      "auzef",
    ],
    { cwd: root, maxBuffer: 100 * 1024 * 1024, encoding: "utf8" },
  );
  let date = null;
  const result = new Map();
  for (const line of log.split("\n")) {
    if (line.startsWith("@")) date = line.slice(1);
    else if (line && !result.has(line)) result.set(line, date);
  }
  return result;
}
export function inventory(root, bookRoot, productionRoot) {
  const universities = read(join(root, "data/universities.json"), []);
  const videoRecords =
    read(join(root, "src/data/youtube-videolar.json"), {}).dersler ?? {};
  const history = dates(root),
    bookHistory = dates(bookRoot),
    productionHistory = dates(productionRoot);
  const additions = dates(root, true);
  const productionCourses = Object.values(
    read(
      join(
        productionRoot,
        "projects/auzeff_child_development/project_config.json",
      ),
      {},
    ).courses_config ?? {},
  );
  const courses = new Map();
  for (const uni of universities)
    for (const dept of uni.departments ?? []) {
      if (uni.id.startsWith("test-")) continue;
      for (const course of read(
        join(root, `data/courses/${uni.id}/${dept.id}.json`),
        [],
      )) {
        const id = `${uni.id}/${course.id}`;
        if (!courses.has(id))
          courses.set(id, {
            id,
            university: uni.id,
            universityName: uni.shortName,
            course: course.id,
            name: course.name,
            code: course.code,
            departments: [],
            expected: course.unitCount ?? null,
          });
        courses.get(id).departments.push({
          id: dept.id,
          name: dept.name,
          pool: ["secmeli", "alan-disi-secmeli"].includes(course.kategori),
        });
      }
    }
  const rows = [];
  for (const row of courses.values()) {
    const key =
      row.university === "ataturk-aof"
        ? row.course
        : `${row.university}--${row.course}`;
    const paths = [
      `data/questions/${row.id}.json`,
      `src/data/calisma-odasi/${key}.json`,
      `data/ozetler/${row.id}.json`,
      `data/calisma-odasi-medya/${key}.json`,
      `data/calisma-odasi/anlatim/${key}.json`,
    ];
    const questions = read(join(root, paths[0]), []),
      room = read(join(root, paths[1]));
    const summaries = read(join(root, paths[2]), {}).uniteler ?? [];
    const contract = read(join(root, paths[3]), {});
    const book = join(bookRoot, row.id, "kitap");
    const contents = read(join(book, "icindekiler.json"), {}).uniteler ?? [];
    const bookUnits = files(book).flatMap(
      (f) => /^unite-(\d+)\.mdx$/.exec(f)?.slice(1).map(Number) ?? [],
    );
    const units = new Map();
    const getUnit = (n) => {
      if (!units.has(n))
        units.set(n, {
          no: n,
          title: "",
          book: false,
          summary: false,
          workbook: false,
          text: false,
          audio: false,
          transcript: false,
          questions: 0,
          explained: 0,
        });
      return units.get(n);
    };
    for (const u of contents) getUnit(u.no).title = u.baslik;
    for (const n of bookUnits) {
      const u = getUnit(n);
      u.book = true;
      const study = read(
        join(book, "etkinlik", `unite-${String(n).padStart(2, "0")}.json`),
        {},
      );
      u.workbook = Object.keys(study.konular ?? {}).length > 0;
      u.summary = Object.values(study.konular ?? {}).some((k) =>
        k.ozet?.trim(),
      );
    }
    for (const u of room?.uniteler ?? []) getUnit(u.no).title ||= u.baslik;
    for (const k of room?.konular ?? []) {
      const u = getUnit(k.unite);
      u.book ||= Boolean(k.metin?.trim());
      u.workbook ||= Boolean(k.calisma && Object.keys(k.calisma).length);
      u.summary ||= Boolean(k.calisma?.ozet?.trim());
      u.text ||= Boolean(k.anlatim?.trim());
      if (/^özet(?:\s|$)/i.test(k.baslik))
        u.summary ||= Boolean(k.metin?.trim());
    }
    for (const u of summaries)
      if (u.ozet?.trim()) getUnit(u.unite).summary = true;
    for (const f of files(join(bookRoot, row.id, "ozet"))) {
      const n = /unite-(\d+)\.(?:md|mdx)$/.exec(f)?.[1];
      if (n && readFileSync(join(bookRoot, row.id, "ozet", f), "utf8").trim())
        getUnit(Number(n)).summary = true;
    }
    const local =
      row.university === "ataturk-aof"
        ? join(productionRoot, "data/ata-aof/metin", row.course)
        : row.university === "anadolu-aof"
          ? join(productionRoot, "data/anadolu-aof/metin", row.course)
          : null;
    if (local)
      for (const f of files(local).filter((f) =>
        /^Birlesik.*Podcast\.json$/.test(f),
      ))
        for (const s of read(join(local, f), {}).sequences ?? []) {
          const n = /^(\d+)\.\s*ünite/i.exec(s.sequence_title ?? "")?.[1];
          if (n && s.dialogues?.length) getUnit(Number(n)).text = true;
        }
    for (const m of contract.medyalar ?? [])
      if (m.tur === "ses" && m.cesit === "uzun-anlatim" && m.unite) {
        const u = getUnit(m.unite);
        u.audio = Boolean(m.kaynak);
        if (m.dokum)
          u.transcript = Boolean(
            read(
              join(
                root,
                "data/calisma-odasi-medya",
                key,
                m.dokum.split("/").at(-1),
              ),
              {},
            ).satirlar?.length,
          );
      }
    for (const m of room?.medyalar ?? [])
      if (m.cesit === "uzun-anlatim" && m.unite && m.tur === "ses") {
        const u = getUnit(m.unite);
        u.audio ||= Boolean(m.kaynak);
        u.transcript ||= Boolean(m.satirlar?.length);
      }
    const stats = examStats(questions);
    for (const q of questions.filter((q) => q.source === "cikmis-soru"))
      if (q.unitNumber > 0) {
        const u = getUnit(q.unitNumber);
        u.questions++;
        if (hasExplanation(q)) u.explained++;
      }
    const configured =
      row.university === "auzef"
        ? productionCourses.find(
            (c) =>
              c.title?.normalize("NFC").toLocaleLowerCase("tr") ===
              row.name.normalize("NFC").toLocaleLowerCase("tr"),
          )?.total_units
        : null;
    const total = contents.length || row.expected || configured || null;
    const unitList = [...units.values()].sort((a, b) => a.no - b.no);
    const count = (k) => unitList.filter((u) => u[k]).length;
    const videoUrls = [
      ...(videoRecords[row.id] ?? [])
        .filter((v) => !/soru/i.test(v.baslik))
        .map((v) => ({ url: v.url, long: /uzun/i.test(v.baslik) })),
      ...(contract.medyalar ?? [])
        .filter((m) => m.tur === "youtube" && m.cesit !== "soru-cozum")
        .map((m) => ({
          url: `https://youtu.be/${m.kaynak}`,
          long: m.cesit === "uzun-anlatim",
        })),
    ];
    const videos = [
      ...new Map(
        [
          ...videoUrls,
          ...(contract.dosyalar ?? [])
            .filter((m) => m.tur === "video" && m.cesit !== "soru-cozum")
            .map((m) => ({ url: m.kaynak, long: m.cesit === "uzun-anlatim" })),
        ].map((v) => [v.url, v]),
      ).values(),
    ];
    const dept = row.departments.find((d) => !d.pool) ?? row.departments[0];
    const page = `/${row.university}/${dept.id}/${row.course}/`;
    const changed = paths.map((p) => history.get(p));
    for (const [p, date] of bookHistory)
      if (p.startsWith(`${row.id}/kitap/`)) changed.push(date);
    if (local)
      for (const [p, date] of productionHistory)
        if (p.startsWith(relative(productionRoot, local) + "/"))
          changed.push(date);
    const updated = changed.filter(Boolean).sort().at(-1) ?? null;
    const recent = paths.flatMap((p, i) =>
      additions.has(p)
        ? [
            {
              date: additions.get(p),
              kind: [
                "Soru seti",
                "Çalışma odası",
                "Özet",
                "Ses ve video bağlantıları",
                "Uzun anlatım metni",
              ][i],
            },
          ]
        : [],
    );
    rows.push({
      ...row,
      expected: total,
      updated,
      recent,
      metrics: {
        book: metric(
          count("book"),
          total,
          existsSync(bookRoot) || Boolean(room),
        ),
        summary: metric(count("summary"), total),
        workbook: metric(count("workbook"), total),
        text: metric(
          count("text"),
          total,
          Boolean(room) || existsSync(productionRoot),
        ),
        audio: metric(count("audio"), total),
        transcript: metric(count("transcript"), total),
        shortVideo: metric(
          videos.filter(
            (v) =>
              !v.long &&
              /^https:\/\/(?:youtu\.be|www\.youtube\.com)\//.test(v.url),
          ).length,
        ),
        longVideo: metric(videos.filter((v) => v.long).length),
        questions: metric(stats.count),
        explained: metric(stats.explained, stats.count),
      },
      exams: stats,
      units: unitList,
      videos,
      studyUrl: room ? `${page}calisma/` : null,
      examUrl: questions.length ? page : null,
    });
  }
  return {
    version: 1,
    generated: new Date().toISOString(),
    sources: {
      site: true,
      books: existsSync(bookRoot),
      production: existsSync(productionRoot),
    },
    rows,
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const root = resolve(import.meta.dirname, "..");
  const output = inventory(
    root,
    resolve(root, process.env.KITAP_DIZINI ?? "../ders-kitaplari"),
    resolve(root, process.env.URETIM_DIZINI ?? "../auzeff-tui"),
  );
  mkdirSync(join(root, "public"), { recursive: true });
  writeFileSync(join(root, "public/durum.json"), JSON.stringify(output) + "\n");
  console.log(
    `Durum: ${output.rows.length} ders, kaynaklar: ${JSON.stringify(output.sources)}`,
  );
}
