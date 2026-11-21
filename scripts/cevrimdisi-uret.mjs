// Regenerates the offline files (sw.js, version manifests) for an existing build folder without rebuilding
// the site: node scripts/cevrimdisi-uret.mjs [dist]. The build runs the same code from astro.config.mjs.
import { build } from "esbuild";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const kok = path.resolve(process.argv[2] ?? "dist");
// Inside node_modules so the bundled file resolves esbuild and the other packages from this project.
await mkdir("node_modules/.cache", { recursive: true });
const gecici = await mkdtemp(path.resolve("node_modules/.cache/cevrimdisi-"));
const cikti = path.join(gecici, "uret.mjs");
await build({ entryPoints: ["src/integrations/cevrimdisi.ts"], bundle: true, platform: "node", format: "esm", packages: "external", outfile: cikti, logLevel: "error" });
try {
  const { cevrimdisiUret } = await import(pathToFileURL(cikti).href);
  await cevrimdisiUret(kok, { info: (m) => console.log(m), warn: (m) => console.warn(m) });
} finally {
  await rm(gecici, { recursive: true, force: true });
}
