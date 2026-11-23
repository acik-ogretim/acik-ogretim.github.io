import { describe, expect, it } from "vitest";
import { csvCell } from "./durum";
import { metric, examStats, inventory } from "../../scripts/durum-uret.mjs";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("inventory evidence", () => {
  it("keeps missing evidence, partial coverage and known zero distinct", () => {
    expect(metric(0, null, false)).toEqual({
      status: "veri yok",
      count: null,
      total: null,
    });
    expect(metric(7, 14).status).toBe("kısmi");
    expect(metric(14, 14).status).toBe("var");
    expect(metric(0, 14).status).toBe("yok");
  });
  it("counts past exams once and excludes practice questions and invented years", () => {
    const stats = examStats([
      { source: "deneme", year: "2026", explanation: "x" },
      {
        source: "cikmis-soru",
        explanation: "a",
        sinavlar: [
          { year: "2024-2025", examType: "vize" },
          { year: "2024-2025", examType: "final" },
        ],
      },
    ]);
    expect(stats).toEqual({
      count: 1,
      explained: 1,
      years: ["2024-2025"],
      midterm: 1,
      final: 1,
    });
  });
  it("derives units from files without treating catalog unit titles as extracted books", () => {
    const root = mkdtempSync(join(tmpdir(), "inventory-"));
    const put = (path: string, data: unknown) => {
      const full = join(root, path);
      mkdirSync(full.slice(0, full.lastIndexOf("/")), { recursive: true });
      writeFileSync(full, JSON.stringify(data));
    };
    try {
      put("data/universities.json", [
        {
          id: "uni",
          shortName: "Üniversite",
          departments: [{ id: "dept", name: "Bölüm" }],
        },
      ]);
      put("data/courses/uni/dept.json", [
        { id: "course", name: "Ders", unitCount: 8 },
      ]);
      put("data/kitap-uniteleri/uni.json", { dersler: { course: ["Başlık"] } });
      put("data/calisma-odasi-medya/uni--course.json", {
        dosyalar: [
          {
            tur: "video",
            cesit: "kisa-ozet",
            kaynak: "https://medya.zeki.website/uni/course/video.mp4",
          },
        ],
      });
      const output = inventory(
        root,
        join(root, "missing-books"),
        join(root, "missing-production"),
      );
      expect(output.rows).toHaveLength(1);
      expect(output.rows[0].metrics.book.status).toBe("veri yok");
      expect(output.rows[0].expected).toBe(8);
      expect(output.rows[0].units).toEqual([]);
      expect(output.rows[0].examUrl).toBeNull();
      expect(output.rows[0].metrics.shortVideo.count).toBe(0);
      expect(output.rows[0].videos).toHaveLength(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("quotes CSV and prevents spreadsheet formula execution", () => {
    expect(csvCell("=1+1")).toBe('"\'=1+1"');
    expect(csvCell('Ders, "bir"')).toBe('"Ders, ""bir"""');
  });
});
