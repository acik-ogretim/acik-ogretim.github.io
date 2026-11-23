import { Fragment, useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type ExpandedState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import {
  inventoryCsv,
  metricLabels,
  metricText,
  type Inventory,
  type InventoryRow,
  type MetricKey,
} from "../lib/durum";
import "../styles/durum.css";

const keys = Object.keys(metricLabels) as MetricKey[];
const columns: ColumnDef<InventoryRow>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Ders",
    enableHiding: false,
    sortingFn: (a, b) => a.original.name.localeCompare(b.original.name, "tr"),
    cell: ({ row }) => (
      <>
        <button
          className="durum-course"
          onClick={row.getToggleExpandedHandler()}
          aria-expanded={row.getIsExpanded()}
        >
          {row.getIsExpanded() ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
          <span>
            {row.original.name}
            <small>
              {row.original.departments.map((d) => d.name).join(", ")}
            </small>
          </span>
        </button>
      </>
    ),
  },
  ...keys.map(
    (key): ColumnDef<InventoryRow> => ({
      id: key,
      accessorFn: (r) => r.metrics[key].count ?? -1,
      header: metricLabels[key],
      filterFn: (row, _id, value) => row.original.metrics[key].status === value,
      cell: ({ row }) => (
        <span
          className="durum-status"
          data-status={row.original.metrics[key].status}
        >
          {metricText(row.original.metrics[key])}
        </span>
      ),
    }),
  ),
  {
    id: "midterm",
    accessorFn: (r) => r.exams.midterm,
    header: "Vize soruları",
  },
  { id: "final", accessorFn: (r) => r.exams.final, header: "Final soruları" },
  {
    id: "years",
    accessorFn: (r) => r.exams.years.join(", ") || "veri yok",
    header: "Sınav yılları",
  },
  {
    id: "updated",
    accessorFn: (r) => r.updated ?? "",
    header: "Son güncelleme",
    cell: ({ row }) =>
      row.original.updated
        ? new Date(row.original.updated).toLocaleDateString("tr-TR")
        : "veri yok",
  },
  {
    id: "links",
    header: "Bağlantılar",
    enableSorting: false,
    cell: ({ row: { original: r } }) => (
      <div className="durum-links">
        {r.studyUrl && <a href={r.studyUrl}>Çalışma odası</a>}
        {r.examUrl && <a href={r.examUrl}>Sınav soruları</a>}
        {!r.studyUrl && !r.examUrl && "veri yok"}
      </div>
    ),
  },
];
const initialVisibility = Object.fromEntries(
  [
    "workbook",
    "text",
    "transcript",
    "longVideo",
    "midterm",
    "final",
    "years",
  ].map((k) => [k, false]),
);
function Detail({ row }: { row: InventoryRow }) {
  return (
    <div className="durum-detail">
      <p>
        <strong>Çıkmış sorular:</strong> {row.exams.count} soru,{" "}
        {row.exams.explained} açıklama · Vize: {row.exams.midterm} · Final:{" "}
        {row.exams.final} · Yıllar: {row.exams.years.join(", ") || "veri yok"}
      </p>
      {row.videos.map((v) => (
        <a key={v.url} href={v.url} target="_blank" rel="noreferrer">
          {v.long ? "Uzun anlatım videosu" : "Özet videosu"} ↗
        </a>
      ))}
      <div className="durum-units">
        {row.units.map((u) => (
          <article key={u.no}>
            <strong>
              {u.no}. ünite {u.title}
            </strong>
            <p>
              {(
                [
                  "book",
                  "summary",
                  "workbook",
                  "text",
                  "audio",
                  "transcript",
                ] as const
              )
                .map((k) => `${metricLabels[k]}: ${u[k] ? "var" : "yok"}`)
                .join(" · ")}
            </p>
            <small>
              Çıkmış soru: {u.questions} · Açıklama: {u.explained}
            </small>
          </article>
        ))}
      </div>
      {!row.units.length && <p>Ünite ayrıntısı için veri yok.</p>}
    </div>
  );
}
export default function DurumTablosu() {
  const [inventory, setInventory] = useState<Inventory | null>(null),
    [error, setError] = useState("");
  const [query, setQuery] = useState(""),
    [university, setUniversity] = useState(""),
    [department, setDepartment] = useState(""),
    [missing, setMissing] = useState(false);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]),
    [sorting, setSorting] = useState<SortingState>([
      { id: "name", desc: false },
    ]);
  const [columnVisibility, setColumnVisibility] =
      useState<VisibilityState>(initialVisibility),
    [expanded, setExpanded] = useState<ExpandedState>({}),
    [closed, setClosed] = useState<string[]>([]),
    [ready, setReady] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/durum.json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("İçerik durumu yüklenemedi.");
        return r.json();
      })
      .then(setInventory)
      .catch((e) => {
        if (e.name !== "AbortError") setError(String(e.message));
      });
    const p = new URLSearchParams(location.search);
    setQuery(p.get("q") ?? "");
    setUniversity(p.get("uni") ?? "");
    setDepartment(p.get("bolum") ?? "");
    setMissing(p.get("eksik") === "1");
    setColumnFilters(
      keys.flatMap((k) => (p.has(k) ? [{ id: k, value: p.get(k) }] : [])),
    );
    if (columns.some((c) => c.id === p.get("sirala")))
      setSorting([{ id: p.get("sirala")!, desc: p.get("azalan") === "1" }]);
    try {
      const value: unknown = JSON.parse(
        localStorage.getItem("durum-sutunlar") ?? "null",
      );
      if (value && typeof value === "object" && !Array.isArray(value))
        setColumnVisibility(
          Object.fromEntries(
            Object.entries(value).flatMap(([k, v]) =>
              columns.some((c) => c.id === k && k !== "name") &&
              typeof v === "boolean"
                ? [[k, v]]
                : [],
            ),
          ),
        );
    } catch {
      /* Private storage may be unavailable. */
    }
    setReady(true);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!ready) return;
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (university) p.set("uni", university);
    if (department) p.set("bolum", department);
    if (missing) p.set("eksik", "1");
    for (const f of columnFilters) p.set(f.id, String(f.value));
    if (sorting[0]) {
      p.set("sirala", sorting[0].id);
      if (sorting[0].desc) p.set("azalan", "1");
    }
    history.replaceState(
      null,
      "",
      `${location.pathname}${p.size ? "?" + p : ""}`,
    );
    try {
      localStorage.setItem("durum-sutunlar", JSON.stringify(columnVisibility));
    } catch {
      /* Filters work without persistent storage. */
    }
  }, [
    ready,
    query,
    university,
    department,
    missing,
    columnFilters,
    sorting,
    columnVisibility,
  ]);
  const all = inventory?.rows ?? [];
  const data = useMemo(
    () =>
      all.filter(
        (r) =>
          (!university || r.university === university) &&
          (!department || r.departments.some((d) => d.id === department)) &&
          (!missing || keys.some((k) => r.metrics[k].status !== "var")) &&
          (!query ||
            `${r.name} ${r.code ?? ""} ${r.departments.map((d) => d.name).join(" ")}`
              .toLocaleLowerCase("tr")
              .includes(query.toLocaleLowerCase("tr"))),
      ),
    [inventory, university, department, missing, query],
  );
  const table = useReactTable({
    data,
    columns,
    state: { columnFilters, sorting, columnVisibility, expanded },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowCanExpand: () => true,
    getRowId: (r) => r.id,
    initialState: { pagination: { pageSize: 40 } },
  });
  if (error)
    return (
      <p role="alert">
        {error} <button onClick={() => location.reload()}>Yeniden dene</button>
      </p>
    );
  if (!inventory) return <p role="status">İçerik durumu yükleniyor…</p>;
  const universities = [
    ...new Map(all.map((r) => [r.university, r.universityName])).entries(),
  ];
  const departments = [
    ...new Map(
      all
        .filter((r) => !university || r.university === university)
        .flatMap((r) => r.departments.map((d) => [d.id, d.name] as const)),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1], "tr"));
  const download = () => {
    const url = URL.createObjectURL(
      new Blob(
        [inventoryCsv(table.getSortedRowModel().rows.map((r) => r.original))],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "ders-durumu.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <div className="durum-summary">
        {universities.map(([id, label]) => {
          const rows = all.filter((r) => r.university === id);
          return (
            <button
              key={id}
              aria-pressed={university === id}
              onClick={() => {
                setUniversity(university === id ? "" : id);
                setDepartment("");
              }}
            >
              <strong>{label}</strong>
              <b>{rows.length.toLocaleString("tr-TR")} ders</b>
              <span>
                {rows.filter((r) => r.metrics.book.status === "var").length}{" "}
                kitap · {rows.filter((r) => r.exams.count).length} soru seti
              </span>
              <span>
                {rows.filter((r) => r.metrics.audio.count).length} ses ·{" "}
                {rows.filter((r) => r.videos.length).length} videolu
              </span>
            </button>
          );
        })}
      </div>
      <details className="durum-recent">
        <summary>
          Son 14 günde eklenen içerikler (
          {all.reduce((n, r) => n + (r.recent?.length ?? 0), 0)})
        </summary>
        <ul>
          {all
            .flatMap((r) =>
              (r.recent ?? []).map((change) => ({ ...change, row: r })),
            )
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 100)
            .map((change, i) => (
              <li key={i}>
                {change.row.universityName} · {change.row.name} · {change.kind}{" "}
                · {new Date(change.date).toLocaleDateString("tr-TR")}
              </li>
            ))}
        </ul>
        <p>
          İlk 100 ekleme gösterilir. Son güncellemeye göre sıralayarak değişen
          dersleri de inceleyebilirsiniz.
        </p>
      </details>
      <div className="durum-controls">
        <label>
          Ara
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ders, kod veya bölüm"
          />
        </label>
        <label>
          Üniversite
          <select
            value={university}
            onChange={(e) => {
              setUniversity(e.target.value);
              setDepartment("");
            }}
          >
            <option value="">Bütün üniversiteler</option>
            {universities.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Bölüm
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">Bütün bölümler</option>
            {departments.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="durum-check">
          <input
            type="checkbox"
            checked={missing}
            onChange={(e) => setMissing(e.target.checked)}
          />
          Yalnız eksikler
        </label>
        <button onClick={download}>
          <Download size={16} /> CSV indir
        </button>
      </div>
      <div className="durum-options">
        <details>
          <summary>Alanları aç / kapat</summary>
          <div>
            {table
              .getAllLeafColumns()
              .filter((c) => c.getCanHide())
              .map((c) => (
                <label key={c.id}>
                  <input
                    type="checkbox"
                    checked={c.getIsVisible()}
                    onChange={c.getToggleVisibilityHandler()}
                  />
                  {String(c.columnDef.header)}
                </label>
              ))}
          </div>
        </details>
        <details>
          <summary>İçerik süzgeçleri ({columnFilters.length})</summary>
          <div>
            {keys.map((k) => (
              <label key={k}>
                {metricLabels[k]}
                <select
                  value={String(table.getColumn(k)?.getFilterValue() ?? "")}
                  onChange={(e) =>
                    table
                      .getColumn(k)
                      ?.setFilterValue(e.target.value || undefined)
                  }
                >
                  <option value="">Hepsi</option>
                  {["var", "kısmi", "yok", "veri yok"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </details>
        <label>
          Sırala
          <select
            value={sorting[0]?.id ?? "name"}
            onChange={(e) =>
              setSorting([
                { id: e.target.value, desc: sorting[0]?.desc ?? false },
              ])
            }
          >
            {table
              .getAllLeafColumns()
              .filter((c) => c.getCanSort())
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {String(c.columnDef.header)}
                </option>
              ))}
          </select>
        </label>
        <button
          onClick={() =>
            setSorting((s) => [{ id: s[0]?.id ?? "name", desc: !s[0]?.desc }])
          }
        >
          {sorting[0]?.desc ? "Azalan ↓" : "Artan ↑"}
        </button>
        <button
          onClick={() => {
            setQuery("");
            setUniversity("");
            setDepartment("");
            setMissing(false);
            setColumnFilters([]);
          }}
        >
          Süzgeçleri temizle
        </button>
      </div>
      <p className="durum-meta" role="status">
        {table.getFilteredRowModel().rows.length.toLocaleString("tr-TR")} ders ·
        Güncelleme: {new Date(inventory.generated).toLocaleString("tr-TR")}
      </p>
      <div className="durum-scroll">
        <table className="durum-table">
          <caption className="sr-only">
            Üniversitelere göre ders içeriği durumu
          </caption>
          <thead>
            {table.getHeaderGroups().map((g) => (
              <tr key={g.id}>
                {g.headers.map((h) => (
                  <th
                    key={h.id}
                    scope="col"
                    aria-sort={
                      h.column.getIsSorted() === "asc"
                        ? "ascending"
                        : h.column.getIsSorted() === "desc"
                          ? "descending"
                          : "none"
                    }
                  >
                    <button
                      disabled={!h.column.getCanSort()}
                      onClick={h.column.getToggleSortingHandler()}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted() === "asc"
                        ? " ↑"
                        : h.column.getIsSorted() === "desc"
                          ? " ↓"
                          : ""}
                    </button>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          {universities.map(([id, name]) => {
            const rows = table
              .getRowModel()
              .rows.filter((r) => r.original.university === id);
            if (!rows.length) return null;
            return (
              <tbody key={id}>
                <tr className="durum-group">
                  <th
                    colSpan={table.getVisibleLeafColumns().length}
                    scope="rowgroup"
                  >
                    <button
                      onClick={() =>
                        setClosed((c) =>
                          c.includes(id)
                            ? c.filter((x) => x !== id)
                            : [...c, id],
                        )
                      }
                      aria-expanded={!closed.includes(id)}
                    >
                      {closed.includes(id) ? (
                        <ChevronRight size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                      {name} ·{" "}
                      {
                        table
                          .getFilteredRowModel()
                          .rows.filter((r) => r.original.university === id)
                          .length
                      }{" "}
                      ders
                    </button>
                  </th>
                </tr>
                {!closed.includes(id) &&
                  rows.map((row) => (
                    <Fragment key={row.id}>
                      <tr>
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            data-label={String(cell.column.columnDef.header)}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>
                      {row.getIsExpanded() && (
                        <tr className="durum-expanded">
                          <td colSpan={row.getVisibleCells().length}>
                            <Detail row={row.original} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
              </tbody>
            );
          })}
        </table>
      </div>
      {!table.getFilteredRowModel().rows.length && (
        <p>Bu süzgeçlerde ders bulunamadı.</p>
      )}
      <nav className="durum-pagination" aria-label="Durum tablosu sayfaları">
        <button
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
        >
          Önceki
        </button>
        <span>
          {table.getState().pagination.pageIndex + 1} /{" "}
          {Math.max(1, table.getPageCount())}
        </span>
        <button
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
        >
          Sonraki
        </button>
      </nav>
    </>
  );
}
