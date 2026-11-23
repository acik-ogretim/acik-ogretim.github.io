export const metricLabels = {
  book: "Kitap ayıklandı",
  summary: "Özet",
  workbook: "Çalışma etkinliği",
  text: "Uzun anlatım metni",
  audio: "Uzun anlatım sesi",
  transcript: "Uzun anlatım dökümü",
  shortVideo: "Özet videosu (YouTube)",
  longVideo: "Uzun video",
  questions: "Çıkmış sorular",
  explained: "Açıklamalı soru",
};
export type MetricKey = keyof typeof metricLabels;
export type Metric = {
  status: "var" | "kısmi" | "yok" | "veri yok";
  count: number | null;
  total: number | null;
};
export type InventoryRow = {
  id: string;
  university: string;
  universityName: string;
  course: string;
  name: string;
  code?: string;
  departments: { id: string; name: string }[];
  expected: number | null;
  updated: string | null;
  recent: { date: string; kind: string }[];
  metrics: Record<MetricKey, Metric>;
  studyUrl: string | null;
  examUrl: string | null;
  exams: {
    count: number;
    explained: number;
    years: string[];
    midterm: number;
    final: number;
  };
  videos: { url: string; long: boolean }[];
  units: {
    no: number;
    title: string;
    book: boolean;
    summary: boolean;
    workbook: boolean;
    text: boolean;
    audio: boolean;
    transcript: boolean;
    questions: number;
    explained: number;
  }[];
};
export type Inventory = {
  version: number;
  generated: string;
  sources: Record<string, boolean>;
  rows: InventoryRow[];
};
export const metricText = (m: Metric) =>
  m.count === null
    ? "veri yok"
    : `${m.status} · ${m.count}${m.total === null ? "" : `/${m.total}`}`;
export function csvCell(value: string) {
  // Spreadsheet formulas must stay text when a downloaded CSV is opened.
  return `"${(/^[=+@\-\t\r]/.test(value) ? "'" : "") + value.replaceAll('"', '""')}"`;
}
export function inventoryCsv(rows: InventoryRow[]) {
  return (
    "\uFEFF" +
    [
      [
        "Üniversite",
        "Bölüm",
        "Ders",
        ...Object.values(metricLabels),
        "Vize",
        "Final",
        "Yıllar",
        "Son güncelleme",
        "Çalışma odası",
        "Sınav sayfası",
      ],
      ...rows.map((r) => [
        r.universityName,
        r.departments.map((d) => d.name).join("; "),
        r.name,
        ...Object.keys(metricLabels).map((k) =>
          metricText(r.metrics[k as MetricKey]),
        ),
        String(r.exams.midterm),
        String(r.exams.final),
        r.exams.years.join("; "),
        r.updated ?? "veri yok",
        r.studyUrl ?? "",
        r.examUrl ?? "",
      ]),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n")
  );
}
