import { describe, expect, it } from "vitest";
import { buildCsv, csvDate } from "./csv";

// buildCsv() prefixes output with a UTF-8 BOM (see its own comment for why).
// Written as an escape, not the literal character, so it doesn't trip
// eslint's no-irregular-whitespace rule or get silently mangled by an
// editor/git re-encoding the file.
const BOM = "﻿";

interface Row {
  name: string;
  amount: number;
  note: string;
}

describe("buildCsv", () => {
  it("builds a header row plus one row per input, comma-joined", () => {
    const csv = buildCsv<Row>(
      [{ name: "Ann", amount: 50, note: "" }],
      [
        { header: "Name", value: (r) => r.name },
        { header: "Amount", value: (r) => r.amount },
      ],
    );

    const lines = csv.slice(BOM.length).split("\r\n");
    expect(lines).toEqual(["Name,Amount", "Ann,50"]);
  });

  it("quotes a value containing a comma", () => {
    const csv = buildCsv<Row>([{ name: "Smith, Ann", amount: 1, note: "" }], [{ header: "Name", value: (r) => r.name }]);
    expect(csv).toContain('"Smith, Ann"');
  });

  it("quotes and doubles internal quotes in a value containing a quote", () => {
    const csv = buildCsv<Row>(
      [{ name: "Ann", amount: 1, note: 'Said "hi"' }],
      [{ header: "Note", value: (r) => r.note }],
    );
    expect(csv).toContain('"Said ""hi"""');
  });

  it("quotes a value containing an embedded newline", () => {
    const csv = buildCsv<Row>([{ name: "Ann", amount: 1, note: "line1\nline2" }], [{ header: "Note", value: (r) => r.note }]);
    expect(csv).toContain('"line1\nline2"');
  });

  it("leaves plain values unquoted", () => {
    const csv = buildCsv<Row>([{ name: "Ann", amount: 1, note: "fine" }], [{ header: "Note", value: (r) => r.note }]);
    expect(csv).toContain("\r\nfine");
    expect(csv).not.toContain('"fine"');
  });

  it("produces just the header row for an empty dataset", () => {
    const csv = buildCsv<Row>([], [{ header: "Name", value: (r) => r.name }]);
    expect(csv.slice(BOM.length)).toBe("Name");
  });

  it("prefixes the output with a UTF-8 BOM", () => {
    const csv = buildCsv<Row>([], [{ header: "Name", value: (r) => r.name }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });
});

describe("csvDate", () => {
  it("truncates an ISO timestamp to just the date", () => {
    expect(csvDate("2026-09-14T20:06:51.826Z")).toBe("2026-09-14");
  });
});
