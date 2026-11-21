// Textbook MDX -> per-topic JSON for the topic drawer (docs/konu-anlatimi.md, stages 1 and 8).
// Reads KITAP_DIZINI (default ../ders-kitaplari), writes public/konu/<uni>/<course>/<no>.json,
// index.json (unit -> topics) and cizge.json (graph data). A missing textbook folder is a warning, not an error.
// Only courses that have a question file in data/questions/<uni>/ are written; KONU_DERSLERI="a,b" narrows
// that further (previews). Needs Node 22.18+ (runs the TypeScript module directly).
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const kok = resolve(import.meta.dirname, "..");
const kitapKok = resolve(kok, process.env.KITAP_DIZINI ?? "../ders-kitaplari");
const cikti = join(kok, "public", "konu");
const sadece = process.env.KONU_DERSLERI ? new Set(process.env.KONU_DERSLERI.split(",").map((s) => s.trim())) : null;

if (!existsSync(kitapKok)) {
  console.warn(`[konu] Ders kitabı klasörü yok (${kitapKok}); konu parçaları atlandı.`);
  process.exit(0);
}

let parcala;
try {
  parcala = await import("../src/lib/konu/parcala.ts");
} catch (e) {
  console.warn(`[konu] Ayrıştırıcı yüklenemedi (Node 22.18 ve üstü gerekir): ${e.message}; konu parçaları atlandı.`);
  process.exit(0);
}

const yaz = (yol, veri) => {
  mkdirSync(join(yol, ".."), { recursive: true });
  writeFileSync(yol, JSON.stringify(veri));
};

rmSync(cikti, { recursive: true, force: true });
let dersSayisi = 0;
let konuSayisi = 0;
for (const uni of readdirSync(kitapKok, { withFileTypes: true })) {
  if (!uni.isDirectory() || uni.name.startsWith(".")) continue;
  const soruDizini = join(kok, "data", "questions", uni.name);
  if (!existsSync(soruDizini)) continue;
  for (const ders of readdirSync(join(kitapKok, uni.name), { withFileTypes: true })) {
    if (!ders.isDirectory()) continue;
    if (sadece && !sadece.has(ders.name)) continue;
    if (!existsSync(join(soruDizini, `${ders.name}.json`))) continue;
    const kitap = join(kitapKok, uni.name, ders.name, "kitap");
    if (!existsSync(kitap)) continue;
    const uniteler = readdirSync(kitap)
      .filter((f) => /^unite-\d+\.mdx$/.test(f))
      .map((f) => parcala.uniteOku(readFileSync(join(kitap, f), "utf8")))
      .filter((u) => u.konular.length > 0);
    if (uniteler.length === 0) continue;
    const { konular, indeks, cizge } = parcala.dersiParcala(uniteler, uni.name, ders.name);
    const hedef = join(cikti, uni.name, ders.name);
    for (const k of konular) yaz(join(hedef, `${k.no}.json`), k);
    yaz(join(hedef, "index.json"), indeks);
    yaz(join(hedef, "cizge.json"), cizge);
    dersSayisi++;
    konuSayisi += konular.length;
  }
}
console.log(`[konu] ${dersSayisi} ders, ${konuSayisi} konu yazıldı: ${cikti}`);
