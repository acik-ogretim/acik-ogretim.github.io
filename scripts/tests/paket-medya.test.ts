import { expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

it("preserves short transcripts and keeps similarly named courses apart", () => {
  const tmp = mkdtempSync(join(tmpdir(), "paket-medya-"));
  try {
    for (const course of ["hukukun-temel-kavramlari", "temel-tasarim"]) {
      const dir = join(tmp, "books", "ataturk-aof", course, "kitap");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "unite-01.mdx"),
        '---\nunite: 1\nbaslik: "Temel"\n---\n<Konu id="k-1.1" no="1.1" baslik={"Temel"} sayfa={1}>\n' +
          "Hukuk kuralları ve temel tasarım kavramları ders kapsamında açıklanır. ".repeat(
            20,
          ) +
          "\n</Konu>",
      );
    }
    const transcripts = join(tmp, "transcripts");
    mkdirSync(transcripts);
    const lines = [
      { bas: 0, bit: 1, konusmaci: "Can", metin: "Bu bir test konusudur." },
    ];
    writeFileSync(
      join(transcripts, "hukukun-temel-kavramlari-kisa-vize.json"),
      JSON.stringify({
        ders: "ataturk-aof/hukukun-temel-kavramlari",
        video: "https://youtu.be/EmxtszdvBbU",
        sure: 1,
        bolumler: lines,
      }),
    );
    writeFileSync(
      join(transcripts, "temel-tasarim-i-kisa-vize.json"),
      JSON.stringify({
        ders: "ataturk-aof/temel-tasarim-i",
        video: "https://youtu.be/L4dXF_mRzcA",
        sure: 1,
        bolumler: lines,
      }),
    );
    execFileSync(
      process.execPath,
      [
        "scripts/calisma-odasi-paketle.mjs",
        "hukukun-temel-kavramlari",
        "temel-tasarim",
      ],
      {
        env: {
          ...process.env,
          KITAP_DIZINI: join(tmp, "books"),
          DOKUM_DIZINI: transcripts,
          CALISMA_CIKTI: join(tmp, "output"),
          CALISMA_GEMINI: "0",
        },
        stdio: "pipe",
        timeout: 30000,
      },
    );
    const law = JSON.parse(
      readFileSync(join(tmp, "output/hukukun-temel-kavramlari.json"), "utf8"),
    );
    expect(
      law.medyalar.find((m: { kaynak: string }) => m.kaynak === "EmxtszdvBbU")
        .satirlar,
    ).toHaveLength(1);
    const design = JSON.parse(
      readFileSync(join(tmp, "output/temel-tasarim.json"), "utf8"),
    );
    expect(
      design.medyalar.some(
        (m: { kaynak: string }) => m.kaynak === "L4dXF_mRzcA",
      ),
    ).toBe(false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
