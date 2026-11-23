import { expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Inventory } from "../../src/lib/durum";
const dist = process.env.DURUM_DIST;
it.skipIf(!dist)(
  "keeps every inventory study and exam link inside the built site",
  () => {
    const data: Inventory = JSON.parse(
      readFileSync(resolve(dist!, "durum.json"), "utf8"),
    );
    expect(data.rows.length).toBeGreaterThan(4000);
    expect(data.rows.some((r) => r.university.startsWith("test-"))).toBe(false);
    const missing = data.rows
      .flatMap((r) =>
        [r.studyUrl, r.examUrl].filter((url): url is string => Boolean(url)),
      )
      .filter((url) => !existsSync(resolve(dist!, `.${url}`, "index.html")));
  expect(missing).toEqual([]);
  const sociology = data.rows.find(r => r.id === 'ataturk-aof/sosyolojiye-giris')!;
  expect(readFileSync(resolve(dist!, `.${sociology.examUrl}`, 'index.html'), 'utf8')).toContain('https://youtu.be/7MbWL1OwuM4');
    for (const name of [
      "kostum-tarihi",
      "temel-tasarim",
      "tekstil-malzeme-bilgisi",
    ])
      expect(
        data.rows.find((r) => r.id === `ataturk-aof/${name}`)?.studyUrl,
      ).toBeTruthy();
  },
);
