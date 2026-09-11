import type { TransactionKind } from "@/lib/data/types";

export interface CsvTransactionRow {
  date: string;
  type: TransactionKind;
  description: string;
  amount: number;
  account: string;
  envelope: string;
  notes: string;
}

const HEADERS = ["date", "type", "description", "amount", "account", "envelope", "notes"] as const;

function escapeCell(value: string | number) {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function transactionsToCsv(rows: CsvTransactionRow[]) {
  const lines = [HEADERS.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.date,
        row.type,
        escapeCell(row.description),
        row.amount.toFixed(2),
        escapeCell(row.account),
        escapeCell(row.envelope),
        escapeCell(row.notes),
      ].join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

const TYPES = new Set(["INCOME", "EXPENSE", "TRANSFER", "ADJUSTMENT"]);

export interface ParsedCsvRow extends CsvTransactionRow {
  line: number;
  error?: string;
}

export function parseTransactionsCsv(text: string): { rows: ParsedCsvRow[]; errors: string[] } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return { rows: [], errors: ["The file is empty"] };

  const header = splitCsvLine(lines[0]).map((cell) => cell.trim().toLowerCase());
  const index = Object.fromEntries(HEADERS.map((key) => [key, header.indexOf(key)])) as Record<(typeof HEADERS)[number], number>;
  if (index.date < 0 || index.type < 0 || index.amount < 0 || index.description < 0) {
    return { rows: [], errors: ["CSV must include date, type, description, and amount columns"] };
  }

  const rows: ParsedCsvRow[] = [];
  const errors: string[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]);
    const date = (cells[index.date] ?? "").trim();
    const type = (cells[index.type] ?? "").trim().toUpperCase();
    const description = (cells[index.description] ?? "").trim();
    const amount = Number((cells[index.amount] ?? "").replace(/[$,]/g, ""));
    const account = index.account >= 0 ? (cells[index.account] ?? "").trim() : "";
    const envelope = index.envelope >= 0 ? (cells[index.envelope] ?? "").trim() : "";
    const notes = index.notes >= 0 ? (cells[index.notes] ?? "").trim() : "";
    const row: ParsedCsvRow = {
      line: i + 1,
      date,
      type: type as TransactionKind,
      description,
      amount,
      account,
      envelope,
      notes,
    };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) row.error = "Date must be YYYY-MM-DD";
    else if (!TYPES.has(type)) row.error = "Type must be INCOME, EXPENSE, TRANSFER, or ADJUSTMENT";
    else if (!description) row.error = "Description is required";
    else if (!Number.isFinite(amount) || amount <= 0) row.error = "Amount must be a positive number";
    if (row.error) errors.push(`Line ${row.line}: ${row.error}`);
    rows.push(row);
  }
  return { rows, errors };
}
