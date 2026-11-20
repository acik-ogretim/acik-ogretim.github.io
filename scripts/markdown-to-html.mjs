// Converts Markdown left in question fields (text, options, explanation) to HTML, the format the site renders.
// Plain-text fields go through @tanstack/markdown (the same renderer the chat and the AI menu use);
// fields that already contain HTML only get their inline Markdown (**bold**, *italic*, `code`) converted,
// because the renderer would escape the existing tags.
// Usage: node scripts/markdown-to-html.mjs [glob-dir=data/questions] [--dry]
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderHtml } from "@tanstack/markdown";

const kok = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "data/questions";
const kuru = process.argv.includes("--dry");
// Bold/italic/code anywhere; bullet lists and headings only in explanations, where the AI writers put them.
// Numbered lines ("1. ...", "I. ...") are left alone: exam questions use them as plain statements.
// Underscore emphasis (__x__) is not converted: exam questions use runs of underscores as fill-in blanks.
// Backticks are left alone too: some courses use them as quotation marks.
const INLINE = /\*\*[^*\s][^*\n]*?\*\*/;
// A list needs at least two bullet lines; one leading "* " is often the asterisk character itself.
const BLOK = /(?:^|\n)\s{0,3}[-*+]\s+\S[^\n]*\n\s{0,3}[-*+]\s+\S/;
const HTML = /<\/?[a-z][a-z0-9]*\b[^>]*>/i;

function satirIci(s) {
  return s
    .replace(/\*\*([^*\s][^*\n]*?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(>])\*([^*\s][^*\n]*?[^*\s]|[^*\s])\*(?=[\s).,;:!?<]|$)/g, "$1<em>$2</em>")
    ;
}

function cevir(s, blokOlur = false) {
  if (typeof s !== "string") return s;
  const blok = blokOlur && BLOK.test(s);
  if (!INLINE.test(s) && !blok) return s;
  if (HTML.test(s) || !blok) return satirIci(s);
  let h = renderHtml(s.trim()).trim();
  const tekParagraf = /^<p>([\s\S]*)<\/p>$/.exec(h);
  if (tekParagraf && !tekParagraf[1].includes("<p>")) h = tekParagraf[1];
  return h.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function dosyalar(d) {
  return readdirSync(d).flatMap((a) => {
    const y = join(d, a);
    return statSync(y).isDirectory() ? dosyalar(y) : a.endsWith(".json") ? [y] : [];
  });
}

let toplam = 0, dosyaSay = 0;
for (const f of dosyalar(kok)) {
  const veri = JSON.parse(readFileSync(f, "utf8"));
  if (!Array.isArray(veri)) continue;
  let degisti = 0;
  for (const q of veri) {
    for (const k of ["text", "explanation"]) {
      const yeni = cevir(q[k], k === "explanation");
      if (yeni !== q[k]) { q[k] = yeni; degisti++; }
    }
    if (Array.isArray(q.options)) q.options = q.options.map((o) => {
      if (typeof o === "string") { const y = cevir(o); if (y !== o) degisti++; return y; }
      if (o && typeof o.text === "string") { const y = cevir(o.text); if (y !== o.text) { degisti++; return { ...o, text: y }; } }
      return o;
    });
  }
  if (degisti) {
    dosyaSay++; toplam += degisti;
    if (!kuru) writeFileSync(f, JSON.stringify(veri, null, 2) + "\n");
  }
}
console.log(`${dosyaSay} dosyada ${toplam} alan ${kuru ? "çevrilecek" : "çevrildi"}`);
