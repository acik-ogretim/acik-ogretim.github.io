// Static server for the offline scenarios (tests/e2e/cevrimdisi.spec.ts). Serves a built site like GitHub
// Pages does (/x -> 301 /x/, index.html, 404.html) and adds test hooks under /__test/:
//   /__test/yavas?ms=6000   delay every HTML response (slow network); /__test/yavas?ms=0 resets
//   /__test/surum?ders=uni/ders   report a new content hash for that course in its version manifest
//   /__test/sw              serve a byte-different sw.js (a new deploy) from now on
//   /__test/sifirla         undo all of the above
// Usage: node tests/e2e/cevrimdisi-sunucu.mjs <dist> <port>
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const kok = path.resolve(process.argv[2] ?? "dist");
const port = Number(process.argv[3] ?? 4340);
const TUR = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".wav": "audio/wav",
};

let gecikme = 0;
const degisenDersler = new Set();
let yeniSw = 0;

const bekle = (ms) => new Promise((c) => setTimeout(c, ms));

async function dosyaBul(yol) {
  const p = path.join(kok, decodeURIComponent(yol));
  if (!p.startsWith(kok)) return null;
  try {
    const s = await stat(p);
    if (s.isDirectory()) return { yonlendir: !yol.endsWith("/"), dosya: path.join(p, "index.html") };
    return { dosya: p };
  } catch {
    return null;
  }
}

createServer(async (istek, yanit) => {
  const url = new URL(istek.url, `http://localhost:${port}`);
  if (url.pathname.startsWith("/__test/")) {
    const ne = url.pathname.slice(8);
    if (ne === "yavas") gecikme = Number(url.searchParams.get("ms") ?? 0);
    else if (ne === "surum") degisenDersler.add(url.searchParams.get("ders"));
    else if (ne === "sw") yeniSw++;
    else if (ne === "sifirla") {
      gecikme = 0;
      degisenDersler.clear();
      yeniSw = 0;
    }
    yanit.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" }).end("tamam");
    return;
  }
  const bulunan = await dosyaBul(url.pathname);
  if (bulunan?.yonlendir) {
    yanit.writeHead(301, { Location: `${url.pathname}/${url.search}` }).end();
    return;
  }
  let dosya = bulunan?.dosya;
  let durum = 200;
  let govde;
  try {
    govde = await readFile(dosya);
  } catch {
    durum = 404;
    dosya = path.join(kok, "404.html");
    govde = await readFile(dosya).catch(() => Buffer.from("404"));
  }
  const uzanti = path.extname(dosya);
  if (uzanti === ".html" && gecikme) await bekle(gecikme);
  // Hooks that change what the site reports without a rebuild
  const manifest = /^\/cevrimdisi-surum\/([\w-]+)\.json$/.exec(url.pathname);
  if (manifest && degisenDersler.size) {
    const veri = JSON.parse(govde.toString("utf8"));
    for (const k of degisenDersler) {
      const [uni, ders] = k.split("/");
      if (uni === manifest[1] && veri.dersler[ders]) veri.dersler[ders][1] = `degisti-${veri.dersler[ders][1].slice(0, 8)}`;
    }
    govde = Buffer.from(JSON.stringify(veri));
  }
  if (url.pathname === "/sw.js" && yeniSw) {
    // A new version string too, so the new worker gets its own shell cache like a real deploy
    const { kabuk } = JSON.parse(await readFile(path.join(kok, "cevrimdisi-surum.json"), "utf8"));
    govde = Buffer.from(govde.toString("utf8").replaceAll(kabuk, `${kabuk.slice(0, 7)}e2e${yeniSw}`));
  }
  yanit.writeHead(durum, {
    "Content-Type": TUR[uzanti] ?? "application/octet-stream",
    // GitHub Pages sends max-age=600. HTML goes out as no-cache here so the slow network scenario reaches the
    // server instead of the browser's HTTP cache.
    "Cache-Control": url.pathname === "/sw.js" || uzanti === ".html" || uzanti === ".json" ? "no-cache" : "max-age=600",
  });
  yanit.end(govde);
}).listen(port, () => console.log(`cevrimdisi sunucusu http://localhost:${port} (${kok})`));
