import { useEffect, useState, type FormEvent } from 'react';
import type { Book, BookInput } from '../types';
import { EMPTY_BOOK_INPUT } from '../types';
import { StarPicker } from './StarRating';
import BookCover from './BookCover';
import BookSearchInput from './BookSearchInput';

interface JournalFormProps {
  /** When provided, the form edits an existing entry; otherwise it creates a new one. */
  book?: Book | null;
  /** Prefilled values for a new entry, e.g. title/author from the wish list. */
  initial?: Partial<BookInput> | null;
  onSubmit: (input: BookInput) => Promise<void>;
  onClose: () => void;
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-sepia-900">{label}</span>
      {children}
    </label>
  );
}

const inputClasses =
  'w-full rounded-xl border border-ivory-300 bg-white px-4 py-2.5 text-sm text-zinc-800 shadow-sm ' +
  'placeholder:text-zinc-400 focus:border-sepia-500 focus:outline-none focus:ring-2 focus:ring-sepia-300';

const textareaClasses = `${inputClasses} min-h-28 resize-y leading-relaxed`;

export default function JournalForm({ book, initial, onSubmit, onClose }: JournalFormProps) {
  const [form, setForm] = useState<BookInput>(EMPTY_BOOK_INPUT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    if (book) {
      const { id: _id, created_at: _createdAt, ...input } = book;
      // Spread over the empty template so entries saved before newer fields
      // existed (e.g. kansikuva_url) still yield fully controlled inputs.
      setForm({ ...EMPTY_BOOK_INPUT, ...input });
    } else {
      setForm({ ...EMPTY_BOOK_INPUT, ...(initial ?? {}) });
    }
  }, [book, initial]);

  // Close on Escape for a polished modal feel.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const set = <K extends keyof BookInput>(key: K, value: BookInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tallennus epäonnistui.');
      setSaving(false);
    }
  };

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex justify-end bg-sepia-900/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={book ? 'Muokkaa merkintää' : 'Uusi merkintä'}
    >
      <aside
        className="animate-slide-in flex h-full w-full max-w-2xl flex-col bg-ivory-50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-ivory-300 px-8 py-5">
          <div>
            <h2 className="font-serif text-3xl text-ink-900">
              {book ? 'Muokkaa merkintää' : 'Uusi merkintä'}
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Kirjaa ajatuksesi juuri lukemastasi kirjasta.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sulje"
            className="rounded-full p-2 text-zinc-500 transition hover:bg-ivory-200 hover:text-zinc-800"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 space-y-6 overflow-y-auto px-8 py-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Kirjan nimi *">
              <BookSearchInput
                required
                className={inputClasses}
                value={form.kirjan_nimi}
                onChange={(v) => set('kirjan_nimi', v)}
                onSelect={(result) => {
                  setForm((prev) => ({
                    ...prev,
                    kirjan_nimi: result.title,
                    kirjoittaja: result.author || prev.kirjoittaja,
                    kansikuva_url: result.coverUrl || prev.kansikuva_url,
                  }));
                  setCoverFailed(false);
                }}
                placeholder="esim. Juurihoito"
              />
            </Field>
            <Field label="Kirjoittaja *">
              <input
                required
                className={inputClasses}
                value={form.kirjoittaja}
                onChange={(e) => set('kirjoittaja', e.target.value)}
                placeholder="esim. Miika Nousiainen"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Päivä, jolloin sain kirjan valmiiksi">
              <input
                type="date"
                className={inputClasses}
                value={form.valmistumispaiva}
                onChange={(e) => set('valmistumispaiva', e.target.value)}
              />
            </Field>
            <Field label="Arvio">
              <StarPicker value={form.arvio} onChange={(v) => set('arvio', v)} />
            </Field>
          </div>

          <div className="flex items-start gap-5">
            <div className="flex-1">
              <Field label="Kansikuva (URL, valinnainen)">
                <input
                  type="url"
                  className={inputClasses}
                  value={form.kansikuva_url}
                  onChange={(e) => {
                    set('kansikuva_url', e.target.value);
                    setCoverFailed(false);
                  }}
                  placeholder="https://…/kansi.jpg"
                />
              </Field>
              {form.kansikuva_url && coverFailed ? (
                <p className="mt-1.5 text-xs text-red-600">
                  Kuvaa ei voitu ladata — tarkista, että osoite on suora linkki
                  kuvatiedostoon (esim. päättyy .jpg tai .png).
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-zinc-400">
                  Jos jätät tyhjäksi, kirjalle piirretään tyylikäs oletuskansi.
                </p>
              )}
            </div>
            <BookCover
              title={form.kirjan_nimi}
              author={form.kirjoittaja}
              url={form.kansikuva_url}
              sizeClasses="h-28 w-20"
              className="mt-1"
              onLoadResult={(ok) => setCoverFailed(!ok)}
            />
          </div>

          <Field label="Yhteenveto">
            <textarea
              className={textareaClasses}
              value={form.yhteenveto}
              onChange={(e) => set('yhteenveto', e.target.value)}
              placeholder="Mistä kirja kertoi?"
            />
          </Field>

          <Field label="Tärkein ajatus / oppi">
            <textarea
              className={textareaClasses}
              value={form.tarkein_oppi}
              onChange={(e) => set('tarkein_oppi', e.target.value)}
              placeholder="Mikä jäi mieleen tärkeimpänä?"
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Mistä pidin">
              <textarea
                className={textareaClasses}
                value={form.mista_pidin}
                onChange={(e) => set('mista_pidin', e.target.value)}
              />
            </Field>
            <Field label="Mistä en pitänyt">
              <textarea
                className={textareaClasses}
                value={form.mista_en_pitanyt}
                onChange={(e) => set('mista_en_pitanyt', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Lempilainaus">
            <textarea
              className={`${textareaClasses} font-serif italic`}
              value={form.lempilainaus}
              onChange={(e) => set('lempilainaus', e.target.value)}
              placeholder="”…”"
            />
          </Field>

          <Field label="Omat ajatukset (pohdinta)">
            <textarea
              className={textareaClasses}
              value={form.omat_ajatukset}
              onChange={(e) => set('omat_ajatukset', e.target.value)}
            />
          </Field>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-sepia-900">Suosittelisinko?</legend>
            <div className="inline-flex rounded-full border border-ivory-300 bg-white p-1 shadow-sm">
              <button
                type="button"
                aria-pressed={form.suosittelen}
                onClick={() => set('suosittelen', true)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                  form.suosittelen
                    ? 'bg-sepia-700 text-ivory-50 shadow'
                    : 'text-zinc-500 hover:text-sepia-700'
                }`}
              >
                Kyllä
              </button>
              <button
                type="button"
                aria-pressed={!form.suosittelen}
                onClick={() => set('suosittelen', false)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                  !form.suosittelen
                    ? 'bg-zinc-700 text-ivory-50 shadow'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                En
              </button>
            </div>
          </fieldset>

          <Field label={form.suosittelen ? 'Miksi suosittelisin?' : 'Miksi en suosittelisi?'}>
            <input
              className={inputClasses}
              value={form.suosittelu_syy}
              onChange={(e) => set('suosittelu_syy', e.target.value)}
              placeholder="esim. helppo ja erittäin hauska lukea"
            />
          </Field>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </form>

        <footer className="flex items-center justify-end gap-3 border-t border-ivory-300 bg-ivory-100 px-8 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-5 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-ivory-200"
          >
            Peruuta
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-full bg-sepia-700 px-6 py-2.5 text-sm font-medium text-ivory-50 shadow-sm transition hover:bg-sepia-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Tallennetaan…' : book ? 'Tallenna muutokset' : 'Lisää päiväkirjaan'}
          </button>
        </footer>
      </aside>
    </div>
  );
}
