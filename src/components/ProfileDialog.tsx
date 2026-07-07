import { useEffect, useState, type FormEvent } from 'react';
import type { Profile } from '../types';

interface ProfileDialogProps {
  /** Existing profile to edit, or null when creating one. */
  profile: Profile | null;
  /**
   * First-login setup: rendered as a full-page step that cannot be
   * dismissed, since the journal needs a username to exist.
   */
  firstTime?: boolean;
  onSave: (profile: Profile) => Promise<void>;
  onClose?: () => void;
}

const inputClasses =
  'w-full rounded-xl border border-ivory-300 bg-white px-4 py-2.5 text-sm text-zinc-800 shadow-sm ' +
  'placeholder:text-zinc-400 focus:border-sepia-500 focus:outline-none focus:ring-2 focus:ring-sepia-300';

export default function ProfileDialog({
  profile,
  firstTime = false,
  onSave,
  onClose,
}: ProfileDialogProps) {
  const [kayttajanimi, setKayttajanimi] = useState(profile?.kayttajanimi ?? '');
  const [lukutavoite, setLukutavoite] = useState(String(profile?.lukutavoite ?? 0));
  const [publicProfile, setPublicProfile] = useState(profile?.public_profile ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (firstTime || !onClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [firstTime, onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const goal = Math.max(0, Math.min(1000, Math.round(Number(lukutavoite) || 0)));
      await onSave({
        kayttajanimi: kayttajanimi.trim(),
        lukutavoite: goal,
        public_profile: publicProfile,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tallennus epäonnistui.');
      setSaving(false);
    }
  };

  const card = (
    <div
      className="animate-rise w-full max-w-lg rounded-2xl border border-ivory-300 bg-ivory-50 p-8 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-serif text-3xl text-ink-900">
            {firstTime ? 'Luo profiili' : 'Profiili'}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {firstTime
              ? 'Vielä yksi askel: valitse käyttäjänimi ja halutessasi lukutavoite.'
              : 'Käyttäjänimi, lukutavoite ja tulostaulun näkyvyys.'}
          </p>
        </div>
        {!firstTime && onClose && (
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
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-sepia-900">
            Käyttäjänimi
          </span>
          <input
            required
            minLength={3}
            maxLength={20}
            pattern="[A-Za-z0-9_åäöÅÄÖ]{3,20}"
            title="3–20 merkkiä: kirjaimia, numeroita ja alaviivoja"
            className={inputClasses}
            value={kayttajanimi}
            onChange={(e) => setKayttajanimi(e.target.value)}
            placeholder="esim. LukuLiisa"
          />
          <span className="mt-1 block text-xs text-zinc-400">
            Näkyy muille vain, jos liityt tulostaululle. 3–20 merkkiä.
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-sepia-900">
            Lukutavoite (kirjaa vuodessa)
          </span>
          <input
            type="number"
            min={0}
            max={1000}
            className={inputClasses}
            value={lukutavoite}
            onChange={(e) => setLukutavoite(e.target.value)}
          />
          <span className="mt-1 block text-xs text-zinc-400">0 = ei tavoitetta.</span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ivory-300 bg-white p-4 shadow-sm">
          <input
            type="checkbox"
            checked={publicProfile}
            onChange={(e) => setPublicProfile(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-sepia-700"
          />
          <span>
            <span className="block text-sm font-semibold text-sepia-900">
              Näytä minut tulostaululla
            </span>
            <span className="block text-xs text-zinc-500">
              Muut näkevät vain käyttäjänimesi ja luettujen kirjojen määrän — eivät
              koskaan päiväkirjasi sisältöä.
            </span>
          </span>
        </label>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          {!firstTime && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-ivory-200"
            >
              Peruuta
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-sepia-700 px-6 py-2.5 text-sm font-medium text-ivory-50 shadow-sm transition hover:bg-sepia-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Tallennetaan…' : firstTime ? 'Aloita lukupäiväkirja' : 'Tallenna'}
          </button>
        </div>
      </form>
    </div>
  );

  if (firstTime) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <header className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sepia-500">
              Tervetuloa
            </p>
            <h1 className="mt-1 font-serif text-5xl text-ink-900">Lukupäiväkirja</h1>
          </header>
          {card}
        </div>
      </div>
    );
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-sepia-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Profiili"
    >
      {card}
    </div>
  );
}
