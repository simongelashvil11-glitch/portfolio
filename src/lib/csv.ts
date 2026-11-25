/*
 * CSV for the admin's exports, made to open cleanly in Excel and Google Sheets.
 */

/**
 * One CSV cell. Quoted when needed, and a leading = + - @ is defused so a
 * crafted path or referrer cannot run as a formula when the file is opened.
 */
export function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Rows to a downloadable CSV response, one column per [name, read] pair. */
export function csvResponse<Row>(
  filename: string,
  columns: readonly (readonly [string, (row: Row) => unknown])[],
  rows: Row[],
): Response {
  const lines = [
    columns.map(([name]) => name).join(","),
    ...rows.map((row) => columns.map(([, read]) => cell(read(row))).join(",")),
  ];

  // The byte-order mark makes Excel read the file as UTF-8 (Georgian city names, etc.).
  return new Response(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
