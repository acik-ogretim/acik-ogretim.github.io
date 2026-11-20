import { readFileSync, readdirSync, existsSync } from "node:fs";
import { describe, it } from "vitest";
import { haftalardanUniteler, uniteBasligi } from "./unite-basligi";

// Manual audit (RUN_AUDIT=1): lists suspicious unit titles across all official weekly plans.
describe.skipIf(!process.env.RUN_AUDIT)("weekly plan audit", () => {
  it("lists suspicious titles", () => {
    const rows: string[] = [];
    let ok = 0, uyumsuz = 0, bos = 0;
    for (const uni of readdirSync("data/ders-icerik")) {
      for (const f of readdirSync(`data/ders-icerik/${uni}`)) {
        const d = JSON.parse(readFileSync(`data/ders-icerik/${uni}/${f}`, "utf8"));
        if (!d.konular) continue;
        const u = haftalardanUniteler(d.konular as { no: number; baslik: string }[]);
        const qf = `data/questions/${uni}/${f}`;
        const q = existsSync(qf) ? JSON.parse(readFileSync(qf, "utf8")) : [];
        const mx = Math.max(0, ...(Array.isArray(q) ? q : q.questions ?? []).map((x: { unitNumber?: number }) => x.unitNumber ?? 0));
        if (!u.length) bos++;
        else if (mx && u.length < mx) uyumsuz++;
        else ok++;
        for (const k0 of u) { const k = { ...k0, baslik: uniteBasligi(k0.baslik).baslik }; if (k.baslik.length < 5 || k.baslik.length > 90 || /sınav|tekrar|hafta|ünite\s*\d/i.test(k.baslik)) rows.push(`${uni}/${f} ${k.no}: ${k.baslik}`); }
      }
    }
    console.log(`uygun ${ok}, kısa liste ${uyumsuz}, boş ${bos}\n` + rows.join("\n"));
  });
});
