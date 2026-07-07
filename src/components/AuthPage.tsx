import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

type AuthMode = 'login' | 'register';

const inputClasses =
  'w-full rounded-xl border border-ivory-300 bg-white px-4 py-2.5 text-sm text-zinc-800 shadow-sm ' +
  'placeholder:text-zinc-400 focus:border-sepia-500 focus:outline-none focus:ring-2 focus:ring-sepia-300';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        // Success: onAuthStateChange flips the app to the journal view.
      } else {
        const { needsEmailConfirmation } = await signUp(email, password);
        if (needsEmailConfirmation) {
          setNotice(
            'Tunnus luotu! Tarkista sähköpostisi ja vahvista osoitteesi, sitten kirjaudu sisään.'
          );
          setMode('login');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tunnistautuminen epäonnistui.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sepia-500">
            Tervetuloa
          </p>
          <h1 className="mt-1 font-serif text-5xl text-ink-900">Lukupäiväkirja</h1>
          <p className="mt-3 text-zinc-500">
            Kirjaudu sisään lukeaksesi ja kirjoittaaksesi omaa päiväkirjaasi.
          </p>
        </header>

        <div className="rounded-2xl border border-ivory-300 bg-ivory-50 p-8 shadow-sm">
          <div className="mb-6 grid grid-cols-2 rounded-full border border-ivory-300 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => switchMode('login')}
              aria-pressed={mode === 'login'}
              className={`rounded-full py-2 text-sm font-medium transition ${
                mode === 'login'
                  ? 'bg-sepia-700 text-ivory-50 shadow'
                  : 'text-zinc-500 hover:text-sepia-700'
              }`}
            >
              Kirjaudu sisään
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              aria-pressed={mode === 'register'}
              className={`rounded-full py-2 text-sm font-medium transition ${
                mode === 'register'
                  ? 'bg-sepia-700 text-ivory-50 shadow'
                  : 'text-zinc-500 hover:text-sepia-700'
              }`}
            >
              Luo tunnus
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-sepia-900">
                Sähköposti
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                className={inputClasses}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nimi@esimerkki.fi"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-sepia-900">
                Salasana
              </span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className={inputClasses}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Vähintään 6 merkkiä' : '••••••••'}
              />
            </label>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-xl border border-sepia-300 bg-sepia-100 px-4 py-3 text-sm text-sepia-900">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-sepia-700 px-6 py-3 font-medium text-ivory-50 shadow-md transition hover:bg-sepia-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? 'Odota hetki…'
                : mode === 'login'
                  ? 'Kirjaudu sisään'
                  : 'Luo tunnus'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Jokainen käyttäjä näkee vain omat merkintänsä.
        </p>
      </div>
    </div>
  );
}
