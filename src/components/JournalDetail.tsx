import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Book } from '../types';
import { StarDisplay } from './StarRating';
import { formatFinnishDate } from '../lib/format';

interface JournalDetailProps {
  books: Book[];
  loading: boolean;
  onEdit: (book: Book) => void;
  onDelete: (id: string) => Promise<void>;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

function Section({ title, children, className = '' }: SectionProps) {
  return (
    <section className={className}>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-sepia-500">{title}</h2>
      <div className="mt-2 leading-relaxed text-zinc-700">{children}</div>
    </section>
  );
}

export default function JournalDetail({ books, loading, onEdit, onDelete }: JournalDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const book = books.find((b) => b.id === id);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="animate-pulse font-serif text-xl text-sepia-500">Avataan merkintää…</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="mx-auto max-w-xl py-24 text-center">
        <p className="font-serif text-3xl text-sepia-700">Merkintää ei löytynyt</p>
        <p className="mt-2 text-zinc-500">Se on ehkä poistettu, tai linkki on vanhentunut.</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-full bg-sepia-700 px-6 py-2.5 text-sm font-medium text-ivory-50 transition hover:bg-sepia-900"
        >
          ← Takaisin päiväkirjaan
        </Link>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!window.confirm(`Poistetaanko merkintä ”${book.kirjan_nimi}”? Tätä ei voi perua.`)) return;
    await onDelete(book.id);
    navigate('/');
  };

  return (
    <article className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-sepia-700 transition hover:text-sepia-900"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Takaisin päiväkirjaan
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(book)}
            className="rounded-full border border-sepia-300 px-5 py-2 text-sm font-medium text-sepia-700 transition hover:bg-sepia-100"
          >
            Muokkaa
          </button>
          <button
            onClick={handleDelete}
            className="rounded-full border border-red-200 px-5 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Poista
          </button>
        </div>
      </div>

      <header className="border-b border-ivory-300 pb-8 text-center">
        <StarDisplay value={book.arvio} className="justify-center" starClassName="h-6 w-6" />
        <h1 className="mt-4 font-serif text-5xl leading-tight text-ink-900">{book.kirjan_nimi}</h1>
        <p className="mt-3 text-lg font-medium tracking-wide text-sepia-700">{book.kirjoittaja}</p>
        <p className="mt-2 text-sm text-zinc-500">
          Luettu valmiiksi {formatFinnishDate(book.valmistumispaiva)}
        </p>
      </header>

      <div className="space-y-10 py-10">
        {book.lempilainaus && (
          <blockquote className="relative mx-auto max-w-2xl px-8 py-2 text-center">
            <span
              aria-hidden="true"
              className="absolute -top-6 left-0 font-serif text-8xl leading-none text-sepia-300"
            >
              ”
            </span>
            <p className="font-serif text-3xl italic leading-snug text-sepia-900">
              {book.lempilainaus}
            </p>
            <cite className="mt-4 block text-sm not-italic text-zinc-500">— {book.kirjoittaja}</cite>
          </blockquote>
        )}

        {book.yhteenveto && (
          <Section title="Yhteenveto">
            <p>{book.yhteenveto}</p>
          </Section>
        )}

        {book.tarkein_oppi && (
          <Section title="Tärkein ajatus / oppi">
            <p className="rounded-2xl border border-sepia-300 bg-sepia-100/60 px-6 py-5 font-serif text-lg text-sepia-900">
              {book.tarkein_oppi}
            </p>
          </Section>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-ivory-300 bg-ivory-50 p-6">
            <Section title="Mistä pidin">
              <p>{book.mista_pidin || '–'}</p>
            </Section>
          </div>
          <div className="rounded-2xl border border-ivory-300 bg-ivory-50 p-6">
            <Section title="Mistä en pitänyt">
              <p>{book.mista_en_pitanyt || '–'}</p>
            </Section>
          </div>
        </div>

        {book.omat_ajatukset && (
          <Section title="Omat ajatukset (pohdinta)">
            <p>{book.omat_ajatukset}</p>
          </Section>
        )}

        <Section title="Suosittelisinko?">
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                book.suosittelen
                  ? 'bg-sepia-100 text-sepia-700'
                  : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {book.suosittelen ? 'Kyllä, suosittelen' : 'En suosittelisi'}
            </span>
            {book.suosittelu_syy && <span className="text-zinc-600">– {book.suosittelu_syy}</span>}
          </div>
        </Section>
      </div>
    </article>
  );
}
