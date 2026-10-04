export interface ImportedRow {
  sourceRow: number;
  values: string[];
}

export interface ImportedTable {
  fileName: string;
  headers: string[];
  rows: ImportedRow[];
}

function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const candidate = value as { text?: unknown; result?: unknown; richText?: Array<{ text?: string }> };
    if (Array.isArray(candidate.richText)) return candidate.richText.map((part) => part.text ?? "").join("").trim();
    if (candidate.text != null) return cellText(candidate.text);
    if (candidate.result != null) return cellText(candidate.result);
  }
  return String(value).trim();
}

export function parseDelimitedText(text: string): string[][] {
  const counts = new Map<string, number>([[",", 0], [";", 0], ["\t", 0]]);
  let headerQuoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (headerQuoted && text[index + 1] === '"') index += 1;
      else headerQuoted = !headerQuoted;
    } else if (!headerQuoted && (char === "\r" || char === "\n")) break;
    else if (!headerQuoted && counts.has(char)) counts.set(char, (counts.get(char) ?? 0) + 1);
  }
  const delimiter = [...counts.entries()].sort((left, right) => right[1] - left[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

/** Reads the first worksheet (or a delimited text file) without imposing a template. */
export async function readImportedTable(file: File): Promise<ImportedTable> {
  if (file.size > 10 * 1024 * 1024) throw new Error("Files must be 10 MB or smaller.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  let matrix: string[][];

  if (extension === "csv" || extension === "tsv" || extension === "txt") {
    matrix = parseDelimitedText(await file.text());
  } else if (extension === "xlsx") {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error("The workbook has no worksheets.");
    matrix = [];
    worksheet.eachRow({ includeEmpty: false }, (excelRow, rowNumber) => {
      const values: string[] = [];
      for (let column = 1; column <= worksheet.columnCount; column += 1) {
        values.push(cellText(excelRow.getCell(column).value));
      }
      while (values.length && values[values.length - 1] === "") values.pop();
      matrix.push(values);
      void rowNumber;
    });
  } else {
    throw new Error("Choose an .xlsx, .csv, or .tsv file.");
  }

  const headerIndex = matrix.findIndex((row) => row.some((value) => value.trim() !== ""));
  if (headerIndex < 0) throw new Error("The selected file is empty.");
  const seenHeaders = new Map<string, number>();
  const headers = matrix[headerIndex].map((header, index) => {
    const base = header || `Column ${index + 1}`;
    const occurrence = (seenHeaders.get(base) ?? 0) + 1;
    seenHeaders.set(base, occurrence);
    return occurrence === 1 ? base : `${base} (${occurrence})`;
  });
  const rows = matrix.slice(headerIndex + 1).flatMap((values, offset) => {
    if (!values.some((value) => value.trim() !== "")) return [];
    return [{ sourceRow: headerIndex + offset + 2, values: headers.map((_, index) => values[index] ?? "") }];
  });
  if (!rows.length) throw new Error("The file has column headers but no data rows.");
  return { fileName: file.name, headers, rows };
}

export function suggestColumn(headers: string[], keywords: string[]): string {
  const normalizedKeywords = keywords.map((word) => word.toLowerCase());
  return headers.find((header) => {
    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, "");
    return normalizedKeywords.some((keyword) => normalized.includes(keyword.replace(/[^a-z0-9]/g, "")));
  }) ?? "";
}

export function mappedValue(row: ImportedRow, headers: string[], selectedHeader: string): string {
  const index = headers.indexOf(selectedHeader);
  return index < 0 ? "" : row.values[index] ?? "";
}

export function parseImportNumber(value: string, fieldName: string): number {
  const normalized = value.trim().replace(/[₹,$\s]/g, "").replace(/,/g, "");
  if (!normalized) throw new Error(`${fieldName} is blank.`);
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${fieldName} must be a valid non-negative number.`);
  return parsed;
}

export function downloadCsv(fileName: string, headers: string[], rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const content = [headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export interface ExportSheet {
  name: string;
  columns: Array<{ header: string; key: string; width?: number; numFmt?: string }>;
  rows: Array<Record<string, string | number | null | undefined>>;
}

/** Produces a plain, filterable workbook with no client-specific decoration. */
export async function downloadWorkbook(fileName: string, sheets: ExportSheet[]) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "EPCX BillCheck";
  workbook.created = new Date();
  for (const definition of sheets) {
    const sheet = workbook.addWorksheet(definition.name.slice(0, 31));
    sheet.columns = definition.columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width ?? Math.max(12, Math.min(column.header.length + 3, 34)),
      style: column.numFmt ? { numFmt: column.numFmt } : undefined,
    }));
    sheet.addRows(definition.rows);
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, definition.rows.length + 1), column: definition.columns.length },
    };
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
    header.height = 22;
  }
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
