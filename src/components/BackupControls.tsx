import { useRef, useState, type ChangeEvent } from 'react';
import type { Book, BookInput } from '../types';
import { booksToCsv, booksToJson, downloadFile, parseBackup } from '../lib/backup';

export interface ImportResult {
  added: number;
  skipped: number;
}

interface BackupControlsProps {
  books: Book[];
  onImport: (inputs: BookInput[]) => Promise<ImportResult>;
}

const buttonClasses =
  'inline-flex items-center gap-1.5 rounded-full border border-ivory-300 bg-ivory-50 px-4 py-1.5 ' +
  'text-xs font-medium text-sepia-700 shadow-sm transition hover:border-sepia-300 hover:bg-sepia-100 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  );
}

export default function BackupControls({ books, onImport }: BackupControlsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const stamp = new Date().toISOString().slice(0, 10);

  const exportJson = () =>
    downloadFile(`lukupaivakirja-${stamp}.json`, booksToJson(books), 'application/json');

  const exportCsv = () =>
    downloadFile(`lukupaivakirja-${stamp}.csv`, booksToCsv(books), 'text/csv');

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    setBusy(true);
    setMessage(null);
    setIsError(false);
    try {
      const text = await file.text();
      const inputs = parseBackup(file.name, text);
      const { added, skipped } = await onImport(inputs);
      setMessage(
        added === 0
          ? `Ei uusia merkintöjä — kaikki ${skipped} olivat jo päiväkirjassa.`
          : `Tuotu ${added} merkintää${skipped > 0 ? `, ohitettu ${skipped} jo olemassa olevaa` : ''}.`
      );
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : 'Tuonti epäonnistui.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Varmuuskopiointi">
      <button type="button" onClick={exportJson} disabled={busy || books.length === 0} className={buttonClasses}>
        <DownloadIcon />
        Vie JSON
      </button>
      <button type="button" onClick={exportCsv} disabled={busy || books.length === 0} className={buttonClasses}>
        <DownloadIcon />
        Vie CSV
      </button>
      <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className={buttonClasses}>
        <UploadIcon />
        {busy ? 'Tuodaan…' : 'Tuo tiedosto'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,.csv,application/json,text/csv"
        className="hidden"
        onChange={handleFile}
      />
      {message && (
        <p
          role="status"
          className={`w-full text-xs ${isError ? 'text-red-600' : 'text-sepia-700'}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
