// Import existing AUZEF outputs and optionally publish their unchanged media to the media host.
import {
  existsSync,
  readdirSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  createReadStream,
} from "node:fs";
import { join, resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { slugify } from "./utils/sync-core.ts";
import he from "he";
export const audioUnit = (name) =>
  /^Unite_(\d+)_(?:Ozet_Podcast|Podcast_(?:Gemini_)?Audio)\.mp3$/.exec(
    name,
  )?.[1]
    ? Number(/^Unite_(\d+)/.exec(name)[1])
    : null;
export function assetTitle(name) {
  const exam = /Final/i.test(name) ? "Final" : /Vize/i.test(name) ? "Vize" : "";
  if (/Soru_Cozumu/i.test(name)) return `${exam} soru çözümü`.trim();
  const range = /^Unite_(\d+)_(\d+)_/.exec(name);
  if (range) return `${Number(range[1])}-${Number(range[2])}. üniteler özeti`;
  const unit = audioUnit(name.replace(/\.mp4$/, ".mp3"));
  if (unit)
    return /Ozet/i.test(name)
      ? `Ünite ${unit} özeti`
      : `Uzun anlatım · Ünite ${unit}`;
  return exam ? `${exam} özeti` : "Ders anlatımı";
}
const read = (p, fallback = {}) =>
  existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fallback;
const list = (p) => (existsSync(p) ? readdirSync(p) : []);
export async function importAuzef(root, source, upload = false) {
  const project = join(source, "data/projects/auzeff_child_development");
  const catalog = read(
    join(root, "data/courses/auzef/cocuk-gelisimi.json"),
    [],
  );
  const manifest = read(join(project, "project_manifest.json"));
  const folders = new Map();
  for (const c of Object.values(manifest.courses ?? {})) {
    const entry = c.categories?.["01_raw_textbooks"]?.find((x) =>
      x.name.endsWith("_Ders_Notu.txt"),
    );
    const course = catalog.find((x) => slugify(x.name) === slugify(c.title));
    if (entry && course)
      folders.set(course.id, {
        course,
        folder: resolve(project, entry.relative_path, "../.."),
      });
  }
  for (const folder of list(project)) {
    const course = catalog.find(
      (x) => slugify(x.name) === slugify(folder.replaceAll("_", " ")),
    );
    if (course && existsSync(join(project, folder, "01_raw_textbooks")))
      folders.set(course.id, { course, folder: join(project, folder) });
  }
  const assets = [];
  for (const [slug, { course, folder }] of folders) {
    const key = `auzef--${slug}`,
      units = [],
      topics = [];
    const roomPath = join(root, "src/data/calisma-odasi", `${key}.json`);
    const room = read(roomPath, {
      uni: "auzef",
      ders: slug,
      uretim: new Date().toISOString().slice(0, 10),
      uniteler: [],
      konular: [],
      kavramlar: [],
      sorular: {},
      medyalar: [],
    });
    const questionFile = read(
      join(root, `data/questions/auzef/${slug}.json`),
      [],
    );
    for (const f of list(join(folder, "01_raw_textbooks"))
      .filter((f) => /^Unite_\d+_Ders_Notu\.txt$/.test(f))
      .sort()) {
      const n = Number(/^Unite_(\d+)/.exec(f)[1]);
      const text = readFileSync(
        join(folder, "01_raw_textbooks", f),
        "utf8",
      ).trim();
      if (!text) continue;
      const no = `${n}.1`;
      units.push({
        no: n,
        baslik: `${course.name} · Ünite ${n}`,
        konular: [no],
      });
      const scriptFiles = list(join(folder, "06_podcast_scripts")).filter((x) =>
        new RegExp(
          `^Unite_0?${n}_Podcast(?:_Gemini)?(?:_Script)?\\.json$`,
        ).test(x),
      );
      const script = scriptFiles.length
        ? read(join(folder, "06_podcast_scripts", scriptFiles[0]))
        : {};
      const narration = (script.sequences ?? [])
        .flatMap((s) => s.dialogues ?? [])
        .map((d) => `${d.speaker}: ${d.text}`)
        .join("\n\n");
      topics.push({
        no,
        unite: n,
        sayfa: 0,
        baslik: `Ünite ${n}`,
        metin: text,
        html: text
          .split(/\n\s*\n/)
          .map((p) => `<p>${he.escape(p).replaceAll("\n", "<br/>")}</p>`)
          .join("\n"),
        ...(narration ? { anlatim: narration } : {}),
      });
      room.sorular[n] = questionFile
        .filter((q) => q.unitNumber === n)
        .map((q) => String(q.id));
    }
    if (!topics.length) continue;
    room.uniteler = units;
    room.konular = topics;
    const contractPath = join(root, "data/calisma-odasi-medya", `${key}.json`);
    const contract = read(contractPath, {
      v: 1,
      uni: "auzef",
      ders: slug,
      medyalar: [],
      dosyalar: [],
    });
    for (const [dir, extension] of [
      ["07_podcast_audios", ".mp3"],
      ["08_podcast_videos", ".mp4"],
    ])
      for (const f of list(join(folder, dir)).filter((f) =>
        f.endsWith(extension),
      )) {
        const local = join(folder, dir, f);
        const hash = createHash("sha256");
        for await (const chunk of createReadStream(local)) hash.update(chunk);
        const name = `${hash.digest("hex").slice(0, 12)}-${slugify(f.slice(0, -extension.length))}${extension}`;
        const path = `auzef/${slug}/${name}`,
          url = `https://medya.zeki.website/${path}`;
        const head = () =>
          execFileSync(
            "curl",
            [
              "-s",
              "-I",
              "--max-time",
              "20",
              "-o",
              "/dev/null",
              "-w",
              "%{http_code}",
              url,
            ],
            { encoding: "utf8" },
          );
        let status = head();
        if (upload && status !== "200") {
          await new Promise((done, fail) => {
            const command = `mkdir -p /home/ubuntu/medya/www/auzef/${slug} && if test -s /home/ubuntu/medya/www/${path}; then cat > /dev/null; else cat > /home/ubuntu/medya/www/${path}.tmp && mv /home/ubuntu/medya/www/${path}.tmp /home/ubuntu/medya/www/${path}; fi`;
            const proc = spawn(
              "bash",
              [resolve(source, "../suru/scripts/oracle/ssh.sh"), "a1", command],
              { stdio: ["pipe", "inherit", "inherit"] },
            );
            createReadStream(local).pipe(proc.stdin);
            proc.stdin.on("error", fail);
            proc.on("error", fail);
            proc.on("exit", (code) =>
              code === 0 ? done() : fail(new Error(`Aktarım başarısız: ${f}`)),
            );
          });
          status = head();
        }
        // Refuse to publish a link until its public object actually exists.
        if (status !== "200") {
          console.warn(`Medya henüz yayında değil: ${path} (${status})`);
          continue;
        }
        const duration = Number(
          execFileSync(
            "ffprobe",
            [
              "-v",
              "error",
              "-show_entries",
              "format=duration",
              "-of",
              "csv=p=0",
              local,
            ],
            { encoding: "utf8" },
          ).trim(),
        );
        const kind = /Soru_Cozumu/i.test(f)
          ? "soru-cozum"
          : /Ozet|Vize|Final/i.test(f)
            ? "kisa-ozet"
            : "uzun-anlatim";
        const asset = {
          id: name.slice(0, -4),
          tur: extension === ".mp3" ? "ses" : "video",
          cesit: kind,
          baslik: assetTitle(f),
          kaynak: url,
          sure: duration,
          ...(audioUnit(f) ? { unite: audioUnit(f) } : {}),
        };
        const destination =
          extension === ".mp3" ? contract.medyalar : (contract.dosyalar ??= []);
        const previous = destination.find((m) => m.kaynak === url);
        if (previous) Object.assign(previous, asset);
        else destination.push(asset);
        if (extension === ".mp3") {
          const previousRoom = room.medyalar.find((m) => m.kaynak === url);
          if (previousRoom) {
            Object.assign(previousRoom, asset);
            previousRoom.konuAraliklari ??= {};
          } else
            room.medyalar.push({ ...asset, satirlar: [], konuAraliklari: {} });
        }
        assets.push({ course: slug, source: relative(source, local), url });
        console.log(`${slug}: ${f} bağlandı`);
      }
    mkdirSync(join(root, "data/calisma-odasi-medya"), { recursive: true });
    mkdirSync(join(root, "src/data/calisma-odasi"), { recursive: true });
    writeFileSync(contractPath, JSON.stringify(contract, null, 1) + "\n");
    writeFileSync(roomPath, JSON.stringify(room) + "\n");
    console.log(`${slug}: ${topics.length} ünite, ${room.medyalar.length} ses`);
  }
  mkdirSync(join(root, "data/uretim-baglantilari"), { recursive: true });
  writeFileSync(
    join(root, "data/uretim-baglantilari/auzef.json"),
    JSON.stringify(assets, null, 1) + "\n",
  );
  return assets;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const root = resolve(import.meta.dirname, "..");
  await importAuzef(
    root,
    resolve(root, "../auzeff-tui"),
    process.argv.includes("--yukle"),
  );
}
