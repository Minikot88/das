import React, { useMemo, useState } from "react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const ROW_HEIGHT_BY_DENSITY = {
  compact: 36,
  comfortable: 44,
  spacious: 52,
};
const TABLE_VIEWPORT_HEIGHT = 420;

function getCellValue(row, key) {
  const value = row?.[key];
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export default function EnterpriseDataTable({
  rows = [],
  columns = [],
  title,
  density = "comfortable",
  initialPageSize = 10,
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: columns[0]?.key ?? "", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [hiddenColumns, setHiddenColumns] = useState([]);
  const [scrollTop, setScrollTop] = useState(0);

  const visibleColumns = useMemo(
    () => columns.filter((column) => !hiddenColumns.includes(column.key)),
    [columns, hiddenColumns]
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return rows;
    return rows.filter((row) =>
      columns.some((column) => getCellValue(row, column.key).toLowerCase().includes(normalizedQuery))
    );
  }, [columns, query, rows]);

  const sortedRows = useMemo(() => {
    if (!sort.key) return filteredRows;
    return [...filteredRows].sort((left, right) => {
      const leftValue = left?.[sort.key];
      const rightValue = right?.[sort.key];
      const leftNumber = Number(leftValue);
      const rightNumber = Number(rightValue);
      const compare = Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
        ? leftNumber - rightNumber
        : String(leftValue ?? "").localeCompare(String(rightValue ?? ""), undefined, { numeric: true });
      return sort.direction === "asc" ? compare : -compare;
    });
  }, [filteredRows, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rowHeight = ROW_HEIGHT_BY_DENSITY[density] ?? ROW_HEIGHT_BY_DENSITY.comfortable;
  const visibleRowCount = Math.max(1, Math.ceil(TABLE_VIEWPORT_HEIGHT / rowHeight) + 4);
  const virtualStart = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
  const virtualRows = pageRows.slice(virtualStart, virtualStart + visibleRowCount);
  const topSpacerHeight = virtualStart * rowHeight;
  const bottomSpacerHeight = Math.max(0, (pageRows.length - virtualStart - virtualRows.length) * rowHeight);

  function toggleSort(key) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
    setScrollTop(0);
  }

  function toggleColumn(key) {
    setHiddenColumns((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  }

  function goToPage(nextPage) {
    setPage(nextPage);
    setScrollTop(0);
  }

  return (
    <section className={`enterprise-table enterprise-table--${density}`}>
      <div className="enterprise-table-toolbar">
        <div>
          {title ? <h2>{title}</h2> : null}
          <span>{filteredRows.length} แถว / {visibleColumns.length} คอลัมน์</span>
        </div>
        <div className="enterprise-table-controls">
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="กรองตาราง"
            aria-label="กรองตาราง"
          />
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
              setScrollTop(0);
            }}
            aria-label="จำนวนแถวต่อหน้า"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option} แถว</option>
            ))}
          </select>
        </div>
      </div>

      <div className="enterprise-table-columns" aria-label="การแสดงคอลัมน์">
        {columns.map((column) => (
          <label key={column.key}>
            <input
              type="checkbox"
              checked={!hiddenColumns.includes(column.key)}
              onChange={() => toggleColumn(column.key)}
            />
            <span>{column.label}</span>
          </label>
        ))}
      </div>

      <div
        className="enterprise-table-scroll"
        style={{ maxHeight: TABLE_VIEWPORT_HEIGHT }}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <table>
          <thead>
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={sort.key === column.key ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    aria-label={`เรียงตาม ${column.label}${sort.key === column.key ? ` ${sort.direction}` : ""}`}
                  >
                    <span>{column.label}</span>
                    <span>{sort.key === column.key ? (sort.direction === "asc" ? "น้อยไปมาก" : "มากไปน้อย") : "เรียง"}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topSpacerHeight ? (
              <tr aria-hidden="true">
                <td colSpan={Math.max(visibleColumns.length, 1)} style={{ height: topSpacerHeight, padding: 0 }} />
              </tr>
            ) : null}
            {pageRows.length ? virtualRows.map((row, rowIndex) => (
              <tr key={row.id ?? `${currentPage}-${virtualStart + rowIndex}`}>
                {visibleColumns.map((column) => (
                  <td key={column.key}>{getCellValue(row, column.key)}</td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={Math.max(visibleColumns.length, 1)}>
                  <div className="enterprise-table-empty">ไม่มีแถวที่ตรงกับตัวกรองปัจจุบัน</div>
                </td>
              </tr>
            )}
            {bottomSpacerHeight ? (
              <tr aria-hidden="true">
                <td colSpan={Math.max(visibleColumns.length, 1)} style={{ height: bottomSpacerHeight, padding: 0 }} />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="enterprise-table-footer">
        <span>หน้า {currentPage} จาก {totalPages}</span>
        <div>
          <button type="button" onClick={() => goToPage(1)} disabled={currentPage === 1} title={currentPage === 1 ? "อยู่หน้าแรกแล้ว" : "ไปหน้าแรก"}>แรก</button>
          <button type="button" onClick={() => goToPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} title={currentPage === 1 ? "ไม่มีหน้าก่อนหน้า" : "ไปหน้าก่อนหน้า"}>ก่อนหน้า</button>
          <button type="button" onClick={() => goToPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} title={currentPage === totalPages ? "ไม่มีหน้าถัดไป" : "ไปหน้าถัดไป"}>ถัดไป</button>
          <button type="button" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} title={currentPage === totalPages ? "อยู่หน้าสุดท้ายแล้ว" : "ไปหน้าสุดท้าย"}>สุดท้าย</button>
        </div>
      </div>
    </section>
  );
}
