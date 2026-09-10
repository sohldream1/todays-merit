export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

// Quotes any value containing a comma, quote, or newline, doubling internal
// quotes per the standard CSV escaping rule (RFC 4180).
function escapeCsvValue(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvValue(c.header)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsvValue(c.value(row))).join(","));
  // CRLF line endings and a leading BOM are what Excel expects to open a
  // UTF-8 CSV without mangling it — harmless to any other spreadsheet tool.
  return "﻿" + [header, ...lines].join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function csvDate(iso: string): string {
  return iso.slice(0, 10);
}
