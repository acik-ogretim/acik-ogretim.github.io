// Wiki links: finds concept terms in plain text. Matching is on Turkish-lowercased text (same length as the
// original, so offsets map back) and tolerates suffixes: the last two letters of long words are optional, and
// the match may continue with more letters ("hukuk kuralının" finds "hukuk kuralı").
import type { CalismaKavrami } from "./sema";

export type KavramEslesme = { bas: number; son: number; kavram: number };

const tr = (s: string): string => s.toLocaleLowerCase("tr");
const kacis = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function kalip(terim: string): string {
  const kelimeler = tr(terim).split(/\s+/).filter(Boolean);
  // One-word terms match the whole word (plus a plural suffix): "hukuk" must not underline "hukukun" or "hukuki".
  // Phrases tolerate Turkish suffixes on their last word ("hukuk kuralının" finds "hukuk kuralı").
  if (kelimeler.length === 1) return `${kacis(kelimeler[0])}(?:lar|ler)?(?![\\p{L}\\p{N}])`;
  return kelimeler.map((w, i) => kacis(i === kelimeler.length - 1 && w.length > 5 ? w.slice(0, w.length - 2) : w)).join("\\s+") + "\\p{L}{0,8}(?![\\p{L}\\p{N}])";
}

export type KavramMotoru = { eslestir: (metin: string) => KavramEslesme[] };

export function kavramMotoru(kavramlar: CalismaKavrami[]): KavramMotoru {
  // Every spelling of a concept or name (term plus aliases such as the full name) is matched; longest first, so
  // "Pierre Bourdieu" is underlined as a whole instead of only "Bourdieu".
  const uygun = kavramlar
    .flatMap((k, kavram) => [k.terim, ...(k.takma ?? [])].map((terim) => ({ terim: terim.trim(), kavram })))
    .filter(({ terim }) => terim.length >= 4)
    .sort((a, b) => b.terim.length - a.terim.length);
  if (!uygun.length) return { eslestir: () => [] };
  const tek = uygun.map(({ terim, kavram }) => ({ kavram, re: new RegExp(`^${kalip(terim)}$`, "u") }));
  const birlesik = new RegExp(`(?<![\\p{L}\\p{N}])(?:${uygun.map(({ terim }) => kalip(terim)).join("|")})`, "gu");
  return {
    eslestir(metin) {
      const sonuc: KavramEslesme[] = [];
      const kucuk = tr(metin);
      for (const m of kucuk.matchAll(birlesik)) {
        const bulunan = m[0];
        const ilk = tek.find((t) => t.re.test(bulunan));
        if (ilk) sonuc.push({ bas: m.index ?? 0, son: (m.index ?? 0) + bulunan.length, kavram: ilk.kavram });
      }
      return sonuc;
    },
  };
}
