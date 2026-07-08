import { Link } from 'react-router-dom';
import type { Book } from '../types';
import { StarDisplay } from './StarRating';
import BookCover from './BookCover';
import { formatDate } from '../lib/format';
import { useI18n } from '../i18n';

interface JournalGridProps {
  books: Book[];
  onNewEntry: () => void;
}

export default function JournalGrid({ books, onNewEntry }: JournalGridProps) {
  const { t, locale } = useI18n();

  if (books.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-sepia-300 bg-ivory-50 px-8 py-20 text-center">
        <p className="font-serif text-2xl text-sepia-700">{t.grid.emptyTitle}</p>
        <p className="mx-auto mt-2 max-w-md text-zinc-500">{t.grid.emptyBody}</p>
        <button
          onClick={onNewEntry}
          className="mt-6 rounded-full bg-sepia-700 px-6 py-2.5 font-medium text-ivory-50 shadow-sm transition hover:bg-sepia-900"
        >
          {t.grid.addFirst}
        </button>
      </div>
    );
  }

  return (
    <section aria-label={t.grid.ariaLabel}>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((book, index) => (
          <Link
            key={book.id}
            to={`/kirja/${book.id}`}
            style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
            className="group animate-rise book-perspective flex flex-col rounded-2xl border border-ivory-300 bg-ivory-50 p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-sepia-300 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-sepia-500"
          >
            <div className="flex items-start justify-between gap-3">
              <StarDisplay value={book.arvio} starClassName="h-4 w-4" />
              {book.suosittelen && (
                <span className="rounded-full bg-sepia-100 px-2.5 py-0.5 text-xs font-medium text-sepia-700">
                  {t.grid.recommendBadge}
                </span>
              )}
            </div>

            <div className="mt-4 flex items-start gap-4">
              <BookCover
                title={book.kirjan_nimi}
                author={book.kirjoittaja}
                url={book.kansikuva_url}
                sizeClasses="h-28 w-20"
              />
              <div className="min-w-0">
                <h3 className="font-serif text-2xl leading-snug text-ink-900 group-hover:text-sepia-900">
                  {book.kirjan_nimi}
                </h3>
                <p className="mt-1 text-sm font-medium tracking-wide text-sepia-700">
                  {book.kirjoittaja}
                </p>
              </div>
            </div>

            <p className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-zinc-600">
              {book.yhteenveto}
            </p>

            <div className="mt-5 flex items-center gap-2 border-t border-ivory-300 pt-4 text-xs text-zinc-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              <span>{t.grid.readOn(formatDate(book.valmistumispaiva, locale))}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
