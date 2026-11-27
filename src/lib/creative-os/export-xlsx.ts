import "server-only";

import JSZip from "jszip";

import type { ExportRow } from "./export-project";

/*
 * The project export as an Excel workbook (.xlsx), written by hand: an xlsx
 * file is a zip of a few XML files. The first sheet holds everything; then
 * one sheet per section (Products, Voice of Customer, Audiences…). Header
 * row bold and frozen, filters on, long text wrapped.
 *
 * Every value is written as text (inline strings), so nothing from web
 * research can ever run as a formula.
 */

const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
/** Excel's limit is 32,767 characters a cell. */
const CELL_LIMIT = 32000;

/** Drops characters XML 1.0 cannot hold (control characters, lone surrogates), then escapes. */
function xmlText(value: string): string {
  const allowed = [...value]
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      if (code === 9 || code === 10 || code === 13) return true;
      if (code < 32 || code === 0xfffe || code === 0xffff) return false;
      return code < 0xd800 || code > 0xdfff;
    })
    .join("");
  const capped = allowed.length > CELL_LIMIT ? `${allowed.slice(0, CELL_LIMIT)} … (cut here: Excel's cell limit; the CSV has the full text)` : allowed;
  return capped.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const COLUMN = ["A", "B", "C", "D"];

function sheetXml(header: string[], rows: string[][], widths: number[], selected: boolean): string {
  const cells = (values: string[], rowNumber: number, style: number) =>
    values
      .map((value, index) => `<c r="${COLUMN[index]}${rowNumber}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${xmlText(value)}</t></is></c>`)
      .join("");
  const body = [
    `<row r="1">${cells(header, 1, 1)}</row>`,
    ...rows.map((row, index) => `<row r="${index + 2}">${cells(row, index + 2, 2)}</row>`),
  ].join("");
  const last = `${COLUMN[header.length - 1]}${rows.length + 1}`;
  return (
    `${XML_HEAD}<worksheet xmlns="${MAIN}" xmlns:r="${REL}">` +
    `<sheetViews><sheetView workbookViewId="0"${selected ? ' tabSelected="1"' : ""}><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("")}</cols>` +
    `<sheetData>${body}</sheetData>` +
    `<autoFilter ref="A1:${last}"/>` +
    `</worksheet>`
  );
}

/** Sheet names: at most 31 characters, none of []:*?/\ and unique. */
function sheetName(section: string, taken: Set<string>): string {
  const base = section.replace(/[[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || "Sheet";
  let name = base;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base.slice(0, 28)} ${n}`;
  taken.add(name.toLowerCase());
  return name;
}

const STYLES =
  `${XML_HEAD}<styleSheet xmlns="${MAIN}">` +
  `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>` +
  `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FF262626"/><bgColor indexed="64"/></patternFill></fill></fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="3">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

export async function rowsToXlsx(rows: ExportRow[]): Promise<Uint8Array> {
  const taken = new Set<string>();
  const sheets: Array<{ name: string; xml: string; rows: number; columns: number }> = [];

  sheets.push({
    name: sheetName("All information", taken),
    xml: sheetXml(["Section", "Item", "Field", "Value"], rows.map((row) => [...row]), [26, 30, 34, 110], true),
    rows: rows.length,
    columns: 4,
  });
  const sections = [...new Set(rows.map((row) => row[0]))];
  for (const section of sections) {
    const sectionRows = rows.filter((row) => row[0] === section).map(([, item, field, value]) => [item, field, value]);
    sheets.push({ name: sheetName(section, taken), xml: sheetXml(["Item", "Field", "Value"], sectionRows, [32, 36, 120], false), rows: sectionRows.length, columns: 3 });
  }

  const zip = new JSZip();
  // No folder entries: real .xlsx files hold only the parts themselves.
  const put = (path: string, content: string) => zip.file(path, content, { createFolders: false });
  put(
    "[Content_Types].xml",
    `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
      sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
      `</Types>`,
  );
  put(
    "_rels/.rels",
    `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  );
  put(
    "xl/workbook.xml",
    `${XML_HEAD}<workbook xmlns="${MAIN}" xmlns:r="${REL}"><sheets>` +
      sheets.map((sheet, index) => `<sheet name="${xmlText(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("") +
      `</sheets><definedNames>` +
      sheets
        .map((sheet, index) => {
          const last = `${COLUMN[sheet.columns - 1]}${sheet.rows + 1}`;
          return `<definedName name="_xlnm._FilterDatabase" localSheetId="${index}" hidden="1">'${xmlText(sheet.name.replace(/'/g, "''"))}'!$A$1:$${last.replace(/(\d+)$/, "$$$1")}</definedName>`;
        })
        .join("") +
      `</definedNames></workbook>`,
  );
  put(
    "xl/_rels/workbook.xml.rels",
    `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("") +
      `<Relationship Id="rId${sheets.length + 1}" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
  );
  put("xl/styles.xml", STYLES);
  sheets.forEach((sheet, index) => put(`xl/worksheets/sheet${index + 1}.xml`, sheet.xml));

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
}
