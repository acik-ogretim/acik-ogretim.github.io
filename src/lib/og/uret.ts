// Draws (or reads from the content-hash cache in .cache/og) the PNG of one card in one layout.
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { OG_SURUM, kartPng, kodla, type OgDuzen } from "./cizim";
import { ogIndeksi, type OgKaydi } from "./veri";

const ONBELLEK = path.resolve(process.cwd(), ".cache/og");

let dosyaMap: Map<string, OgKaydi> | null = null;
/** Card record by its file key ("index", "<uni>/<bolum>/<ders>", ...). */
export async function ogKaydi(dosya: string): Promise<OgKaydi | undefined> {
  dosyaMap ??= new Map([...(await ogIndeksi()).values()].map((k) => [k.dosya, k]));
  return dosyaMap.get(dosya);
}

export async function kartDosyasi(kayit: OgKaydi, duzen: OgDuzen): Promise<Buffer> {
  const kart = await kayit.kart();
  const anahtar = crypto.createHash("sha1").update(`${OG_SURUM}\n${duzen}\n${JSON.stringify(kart)}`).digest("hex");
  const dosya = path.join(ONBELLEK, `${anahtar}.png`);
  try {
    return await fs.readFile(dosya);
  } catch {
    const govde = await kodla(await kartPng(kart, duzen), "png");
    await fs.mkdir(ONBELLEK, { recursive: true });
    await fs.writeFile(dosya, govde);
    return govde;
  }
}

export const pngYaniti = (govde: Buffer) => new Response(new Uint8Array(govde), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" } });
