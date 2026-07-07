import { useEffect, useState, type FormEvent } from 'react';
import type { FeedbackInput } from '../types';
import { db } from '../services/db';

interface FeedbackDialogProps {
  onClose: () => void;
}

export default function FeedbackDialog({ onClose }: FeedbackDialogProps) {
  const [tyyppi, setTyyppi] = useState<FeedbackInput['tyyppi']>('bugi');
  const [viesti, setViesti] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!viesti.trim()) return;
    setSending(true);
    setError(null);
    try {
      await db.submitFeedback({ tyyppi, viesti: viesti.trim() });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lähetys epäonnistui.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-sepia-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Lähetä palautetta"
    >
      <div
        className="animate-rise w-full max-w-lg rounded-2xl border border-ivory-300 bg-ivory-50 p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {sent ? (
          <div className="text-center">
            <p className="font-serif text-3xl text-sepia-900">Kiitos palautteesta! 🎉</p>
            <p className="mt-3 text-zinc-600">
              {tyyppi === 'bugi'
                ? 'Bugi-ilmoituksesi on tallennettu ja siihen palataan.'
                : 'Ideasi on tallennettu — hyvät ehdotukset päätyvät sovellukseen.'}
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-full bg-sepia-700 px-6 py-2.5 text-sm font-medium text-ivory-50 transition hover:bg-sepia-900"
            >
              Sulje
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-serif text-3xl text-ink-900">Lähetä palautetta</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Löysitkö bugin tai keksitkö parannusidean? Kerro siitä.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Sulje"
                className="rounded-full p-2 text-zinc-500 transition hover:bg-ivory-200 hover:text-zinc-800"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="inline-flex rounded-full border border-ivory-300 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  aria-pressed={tyyppi === 'bugi'}
                  onClick={() => setTyyppi('bugi')}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                    tyyppi === 'bugi'
                      ? 'bg-sepia-700 text-ivory-50 shadow'
                      : 'text-zinc-500 hover:text-sepia-700'
                  }`}
                >
                  🐛 Bugi
                </button>
                <button
                  type="button"
                  aria-pressed={tyyppi === 'idea'}
                  onClick={() => setTyyppi('idea')}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                    tyyppi === 'idea'
                      ? 'bg-sepia-700 text-ivory-50 shadow'
                      : 'text-zinc-500 hover:text-sepia-700'
                  }`}
                >
                  💡 Idea
                </button>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-sepia-900">
                  {tyyppi === 'bugi' ? 'Mikä meni pieleen?' : 'Mikä tekisi sovelluksesta paremman?'}
                </span>
                <textarea
                  required
                  maxLength={4000}
                  className="min-h-36 w-full resize-y rounded-xl border border-ivory-300 bg-white px-4 py-2.5 text-sm leading-relaxed text-zinc-800 shadow-sm placeholder:text-zinc-400 focus:border-sepia-500 focus:outline-none focus:ring-2 focus:ring-sepia-300"
                  value={viesti}
                  onChange={(e) => setViesti(e.target.value)}
                  placeholder={
                    tyyppi === 'bugi'
                      ? 'Kuvaile mitä teit ja mitä tapahtui…'
                      : 'Kuvaile ideasi ja miten se auttaisi…'
                  }
                />
              </label>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-5 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-ivory-200"
                >
                  Peruuta
                </button>
                <button
                  type="submit"
                  disabled={sending || !viesti.trim()}
                  className="rounded-full bg-sepia-700 px-6 py-2.5 text-sm font-medium text-ivory-50 shadow-sm transition hover:bg-sepia-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? 'Lähetetään…' : 'Lähetä'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
