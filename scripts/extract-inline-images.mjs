// Post-build: move base64 images inlined in question HTML out to hashed files under dist/_img/.
// The same course page is built once per department, so inlined images were duplicated
// thousands of times and pushed the Pages artifact past its 10 GB limit.
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";

const DIST = path.resolve(process.argv[2] ?? "dist");
const OUT = path.join(DIST, "_img");
const EXT = { png: "png", jpeg: "jpg", jpg: "jpg", gif: "gif", webp: "webp", "svg+xml": "svg" };
const DATA_URI = /src=(["'])data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,([A-Za-z0-9+/=\s]+)\1/g;

// The course page draws its questions from the package files (/ders/<uni>/<ders>/unite/<n>.json), where the HTML of a
// question sits inside a JSON string: the quotes of its attributes are escaped (src=\"data:...\").
const JSON_DATA_URI = /src=\\"data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,([A-Za-z0-9+/=\s\\]+)"/g;

async function* htmlFiles(dir, icinde = false) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p, icinde || (dir === DIST && e.name === "ders"));
    else if (e.name.endsWith(".html") || (icinde && e.name.endsWith(".json"))) yield p;
  }
}

const exists = (p) => access(p).then(() => true, () => false);

await mkdir(OUT, { recursive: true });
let pages = 0, refs = 0, written = 0, saved = 0;
for await (const file of htmlFiles(DIST)) {
  const html = await readFile(file, "utf8");
  if (!html.includes("data:image/")) continue;
  const jsonDosya = file.endsWith(".json");
  const base = jsonDosya ? "" : (html.match(/["']([^"']*)\/_astro\//)?.[1] ?? "");
  const jobs = [];
  let out = html.replace(DATA_URI, (_m, q, type, b64) => {
    const bytes = Buffer.from(b64.replace(/\s+/g, ""), "base64");
    const name = `${createHash("sha256").update(bytes).digest("hex").slice(0, 20)}.${EXT[type]}`;
    jobs.push([path.join(OUT, name), bytes]);
    refs++;
    return `src=${q}${base}/_img/${name}${q} loading=${q}lazy${q}`;
  });
  if (jsonDosya) {
    out = out.replace(JSON_DATA_URI, (_m, type, b64) => {
      // b64 ends with the backslash that escapes the closing quote; line breaks inside are \n escapes
      const bytes = Buffer.from(b64.replace(/\\[nrt]|\s+|\\$/g, ""), "base64");
      const name = `${createHash("sha256").update(bytes).digest("hex").slice(0, 20)}.${EXT[type]}`;
      jobs.push([path.join(OUT, name), bytes]);
      refs++;
      return `src=\\"${base}/_img/${name}\\" loading=\\"lazy\\"`;
    });
  }
  for (const [p, bytes] of jobs) if (!(await exists(p))) { await writeFile(p, bytes); written++; }
  saved += html.length - out.length;
  await writeFile(file, out);
  pages++;
}
console.log(`inline images: ${refs} refs in ${pages} pages -> ${written} files, ${(saved / 1e9).toFixed(2)} GB smaller`);
if (refs && !written && !(await readdir(OUT)).length) process.exit(1);
