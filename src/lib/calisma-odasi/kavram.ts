// Wiki links: finds concept terms in plain text. Matching is on Turkish-lowercased text (same length as the
// original, so offsets map back) and tolerates suffixes: the last two letters of long words are optional, and
// the match may continue with more letters ("hukuk kuralının" finds "hukuk kuralı").
import type { CalismaKavrami } from "./sema";

export type KavramEslesme = { bas: number; son: number; kavram: number };

const tr = (s: string): string => s.toLocaleLowerCase("tr");
const kacis = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function kalip(terim: string): string {
  const kelimeler = tr(terim).split(/\s+/).filter(Boolean);
  return kelimeler.map((w) => kacis(w.length > 5 ? w.slice(0, w.length - 2) : w)).join("\\s+") + "\\p{L}{0,8}";
}

export type KavramMotoru = { eslestir: (metin: string) => KavramEslesme[] };

export function kavramMotoru(kavramlar: CalismaKavrami[]): KavramMotoru {
  const uygun = kavramlar
    .map((k, kavram) => ({ k, kavram }))
    .filter(({ k }) => k.terim.trim().length >= 4)
    .sort((a, b) => b.k.terim.length - a.k.terim.length);
  if (!uygun.length) return { eslestir: () => [] };
  const tek = uygun.map(({ k, kavram }) => ({ kavram, re: new RegExp(`^${kalip(k.terim)}$`, "u") }));
  const birlesik = new RegExp(`(?<![\\p{L}\\p{N}])(?:${uygun.map(({ k }) => kalip(k.terim)).join("|")})`, "gu");
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
