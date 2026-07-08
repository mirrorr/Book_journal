import { useState, type FormEvent } from 'react';
import type { WishlistInput, WishlistItem } from '../types';
import BookSearchInput from './BookSearchInput';
import { useI18n } from '../i18n';

interface WishlistSectionProps {
  items: WishlistItem[];
  onAdd: (input: WishlistInput) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  /** Opens the journal form prefilled from this item ("I've now read it"). */
  onStartEntry: (item: WishlistItem) => void;
}

const inputClasses =
  'w-full rounded-xl border border-ivory-300 bg-white px-4 py-2 text-sm text-zinc-800 shadow-sm ' +
  'placeholder:text-zinc-400 focus:border-sepia-500 focus:outline-none focus:ring-2 focus:ring-sepia-300';

export default function WishlistSection({
  items,
  onAdd,
  onRemove,
  onStartEntry,
}: WishlistSectionProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onAdd({ kirjan_nimi: title.trim(), kirjoittaja: author.trim(), huomautus: '' });
      setTitle('');
      setAuthor('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.wishlist.addFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-label={t.wishlist.title}
      className="rounded-2xl border border-ivory-300 bg-ivory-50 p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl text-ink-900">{t.wishlist.title}</h2>
        <p className="text-sm text-zinc-500">{t.wishlist.subtitle}</p>
      </div>

      <form onSubmit={handleAdd} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <BookSearchInput
            className={inputClasses}
            value={title}
            onChange={setTitle}
            onSelect={(result) => {
              setTitle(result.title);
              if (result.author) setAuthor(result.author);
            }}
            placeholder={t.wishlist.namePlaceholder}
            ariaLabel={t.wishlist.namePlaceholder}
            required
          />
        </div>
        <input
          className={`${inputClasses} flex-1`}
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder={t.wishlist.authorPlaceholder}
          aria-label={t.wishlist.authorPlaceholder}
        />
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="shrink-0 rounded-full bg-sepia-700 px-5 py-2 text-sm font-medium text-ivory-50 shadow-sm transition hover:bg-sepia-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? t.wishlist.adding : t.wishlist.add}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">{t.wishlist.empty}</p>
      ) : (
        <ul className="mt-4 divide-y divide-ivory-300">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-lg text-ink-900">{item.kirjan_nimi}</p>
                {(item.kirjoittaja || item.huomautus) && (
                  <p className="truncate text-sm text-zinc-500">
                    {item.kirjoittaja}
                    {item.kirjoittaja && item.huomautus && ' · '}
                    {item.huomautus && <span className="italic">{item.huomautus}</span>}
                  </p>
                )}
              </div>
              <button
                onClick={() => onStartEntry(item)}
                className="rounded-full border border-sepia-300 px-4 py-1.5 text-xs font-medium text-sepia-700 transition hover:bg-sepia-100"
              >
                {t.wishlist.markRead}
              </button>
              <button
                onClick={() => void onRemove(item.id)}
                aria-label={t.wishlist.removeAria(item.kirjan_nimi)}
                className="rounded-full p-1.5 text-zinc-400 transition hover:bg-ivory-200 hover:text-red-600"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
