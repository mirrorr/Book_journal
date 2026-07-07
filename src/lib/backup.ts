import type { Book, BookInput } from '../types';
import { EMPTY_BOOK_INPUT } from '../types';

/** Column order for CSV backups; also the fields accepted on import. */
const FIELDS: (keyof BookInput)[] = [
  'kirjan_nimi',
  'kirjoittaja',
  'valmistumispaiva',
  'arvio',
  'yhteenveto',
  'tarkein_oppi',
  'mista_pidin',
  'mista_en_pitanyt',
  'lempilainaus',
  'omat_ajatukset',
  'suosittelen',
  'suosittelu_syy',
  'kansikuva_url',
];

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export function booksToJson(books: Book[]): string {
  return JSON.stringify(
    {
      format: 'lukupaivakirja-backup',
      version: 1,
      exported_at: new Date().toISOString(),
      books,
    },
    null,
    2
  );
}

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function booksToCsv(books: Book[]): string {
  const header = FIELDS.join(',');
  const rows = books.map((book) =>
    FIELDS.map((field) => csvEscape(String(book[field] ?? ''))).join(',')
  );
  // Leading BOM so Excel opens the file with correct ä/ö characters.
  return '﻿' + [header, ...rows].join('\r\n') + '\r\n';
}

export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Import                                                              */
/* ------------------------------------------------------------------ */

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const text = String(value ?? '').trim().toLowerCase();
  return ['true', '1', 'kyllä', 'kylla', 'yes', 'x'].includes(text);
}

/** Coerce one raw record (from JSON or a CSV row) into a valid BookInput. */
function normalizeRecord(raw: Record<string, unknown>): BookInput | null {
  const text = (key: keyof BookInput) => String(raw[key] ?? '').trim();

  const kirjan_nimi = text('kirjan_nimi');
  if (!kirjan_nimi) return null; // a record without a title is unusable

  const arvio = Math.round(Number(raw.arvio ?? 0));
  const valmistumispaiva = text('valmistumispaiva');

  return {
    ...EMPTY_BOOK_INPUT,
    kirjan_nimi,
    kirjoittaja: text('kirjoittaja'),
    valmistumispaiva: /^\d{4}-\d{2}-\d{2}$/.test(valmistumispaiva)
      ? valmistumispaiva
      : EMPTY_BOOK_INPUT.valmistumispaiva,
    arvio: Number.isFinite(arvio) ? Math.min(5, Math.max(0, arvio)) : 0,
    yhteenveto: text('yhteenveto'),
    tarkein_oppi: text('tarkein_oppi'),
    mista_pidin: text('mista_pidin'),
    mista_en_pitanyt: text('mista_en_pitanyt'),
    lempilainaus: text('lempilainaus'),
    omat_ajatukset: text('omat_ajatukset'),
    suosittelen: parseBoolean(raw.suosittelen),
    suosittelu_syy: text('suosittelu_syy'),
    kansikuva_url: text('kansikuva_url'),
  };
}

/** Minimal RFC 4180 CSV parser (handles quoted fields, "" escapes, CRLF). */
function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

function parseCsvBackup(text: string): BookInput[] {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    throw new Error('CSV-tiedostossa ei ole yhtään merkintää otsikkorivin lisäksi.');
  }
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  if (!headers.includes('kirjan_nimi')) {
    throw new Error('CSV-tiedostosta puuttuu kirjan_nimi-sarake — onko tämä oikea varmuuskopio?');
  }
  return rows
    .slice(1)
    .map((cells) => {
      const record: Record<string, unknown> = {};
      headers.forEach((header, i) => {
        record[header] = cells[i] ?? '';
      });
      return normalizeRecord(record);
    })
    .filter((input): input is BookInput => input !== null);
}

function parseJsonBackup(text: string): BookInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Tiedosto ei ole kelvollista JSONia.');
  }
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { books?: unknown[] })?.books)
      ? (parsed as { books: unknown[] }).books
      : null;
  if (!list) {
    throw new Error('JSON-tiedostosta ei löytynyt merkintälistaa (books-taulukkoa).');
  }
  return list
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map(normalizeRecord)
    .filter((input): input is BookInput => input !== null);
}

/** Parse a backup file (JSON or CSV, detected by extension then content). */
export function parseBackup(filename: string, text: string): BookInput[] {
  const lower = filename.toLowerCase();
  const trimmed = text.replace(/^﻿/, '').trimStart();
  const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');

  const inputs =
    lower.endsWith('.json') || (!lower.endsWith('.csv') && looksLikeJson)
      ? parseJsonBackup(text)
      : parseCsvBackup(text);

  if (inputs.length === 0) {
    throw new Error('Tiedostosta ei löytynyt yhtään kelvollista merkintää.');
  }
  return inputs;
}
