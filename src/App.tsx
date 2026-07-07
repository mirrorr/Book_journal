import { useCallback, useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import type { Book, BookInput } from './types';
import { db, DATA_MODE } from './services/db';
import JournalGrid from './components/JournalGrid';
import JournalForm from './components/JournalForm';
import JournalDetail from './components/JournalDetail';
import DashboardStats from './components/DashboardStats';
import AuthPage from './components/AuthPage';
import BackupControls, { type ImportResult } from './components/BackupControls';
import { useAuth } from './contexts/AuthContext';

function LoadingState() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-sepia-300 border-t-sepia-700" />
      <p className="font-serif text-lg text-sepia-700">Haetaan päiväkirjaa…</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-red-50 px-8 py-10 text-center">
      <p className="font-serif text-2xl text-red-800">Jotain meni pieleen</p>
      <p className="mt-2 text-sm text-red-700">{message}</p>
      <button
        onClick={onRetry}
        className="mt-6 rounded-full bg-red-700 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-red-800"
      >
        Yritä uudelleen
      </button>
    </div>
  );
}

export default function App() {
  const { authEnabled, initializing, user, signOut } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await db.init();
      setBooks(await db.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tietojen haku epäonnistui.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch only when signed in (or always, in local mode). Keyed on user id
  // rather than the user object: Supabase emits several auth events after
  // login (SIGNED_IN, TOKEN_REFRESHED, ...), each with a fresh user object,
  // and re-running on identity would fire duplicate concurrent fetches.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (authEnabled && !userId) {
      setBooks([]);
      return;
    }
    void refresh();
  }, [refresh, authEnabled, userId]);

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sepia-300 border-t-sepia-700" />
      </div>
    );
  }

  if (authEnabled && !user) {
    return <AuthPage />;
  }

  const openNewForm = () => {
    setEditingBook(null);
    setFormOpen(true);
  };

  const openEditForm = (book: Book) => {
    setEditingBook(book);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingBook(null);
  };

  const handleSubmit = async (input: BookInput) => {
    if (editingBook) {
      const updated = await db.update(editingBook.id, input);
      setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    } else {
      const created = await db.create(input);
      setBooks((prev) =>
        [created, ...prev].sort((a, b) => b.valmistumispaiva.localeCompare(a.valmistumispaiva))
      );
    }
    closeForm();
  };

  const handleDelete = async (id: string) => {
    await db.remove(id);
    setBooks((prev) => prev.filter((b) => b.id !== id));
  };

  // Restore entries from a backup file, skipping ones already in the journal
  // (matched by title + author + finish date) so re-imports are safe.
  const handleImport = async (inputs: BookInput[]): Promise<ImportResult> => {
    const keyOf = (b: Pick<Book, 'kirjan_nimi' | 'kirjoittaja' | 'valmistumispaiva'>) =>
      `${b.kirjan_nimi}|${b.kirjoittaja}|${b.valmistumispaiva}`.toLowerCase();
    const existing = new Set(books.map(keyOf));

    let added = 0;
    let skipped = 0;
    for (const input of inputs) {
      const key = keyOf(input);
      if (existing.has(key)) {
        skipped++;
        continue;
      }
      await db.create(input);
      existing.add(key);
      added++;
    }
    if (added > 0) setBooks(await db.list());
    return { added, skipped };
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sepia-500">
            {DATA_MODE === 'supabase' ? 'Supabase-tietokanta' : 'Paikallinen tila'}
          </p>
          <h1 className="mt-1 font-serif text-5xl text-ink-900">Lukupäiväkirja</h1>
          <p className="mt-2 max-w-xl text-zinc-500">
            Henkilökohtainen muistikirja luetuista kirjoista, ajatuksista ja opeista.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={openNewForm}
            className="rounded-full bg-sepia-700 px-6 py-3 font-medium text-ivory-50 shadow-md transition hover:-translate-y-0.5 hover:bg-sepia-900 hover:shadow-lg"
          >
            + Uusi merkintä
          </button>
          {authEnabled && user && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>{user.email}</span>
              <span aria-hidden="true">·</span>
              <button
                onClick={() => void signOut()}
                className="font-medium text-sepia-700 transition hover:text-sepia-900 hover:underline"
              >
                Kirjaudu ulos
              </button>
            </div>
          )}
        </div>
      </header>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void refresh()} />
      ) : (
        <Routes>
          <Route
            path="/"
            element={
              <main className="space-y-10">
                <DashboardStats books={books} />
                <div className="space-y-6">
                  <BackupControls books={books} onImport={handleImport} />
                  <JournalGrid books={books} onNewEntry={openNewForm} />
                </div>
              </main>
            }
          />
          <Route
            path="/kirja/:id"
            element={
              <JournalDetail
                books={books}
                loading={loading}
                onEdit={openEditForm}
                onDelete={handleDelete}
              />
            }
          />
        </Routes>
      )}

      {formOpen && (
        <JournalForm book={editingBook} onSubmit={handleSubmit} onClose={closeForm} />
      )}
    </div>
  );
}
