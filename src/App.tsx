import { useCallback, useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import type {
  Book,
  BookInput,
  Profile,
  Recommendation,
  Scoreboard,
  WishlistInput,
  WishlistItem,
} from './types';
import { db, DATA_MODE } from './services/db';
import JournalGrid from './components/JournalGrid';
import JournalForm from './components/JournalForm';
import JournalDetail from './components/JournalDetail';
import DashboardStats from './components/DashboardStats';
import AuthPage from './components/AuthPage';
import BackupControls, { type ImportResult } from './components/BackupControls';
import CommunitiesSection from './components/CommunitiesSection';
import FeedbackDialog from './components/FeedbackDialog';
import ProfileDialog from './components/ProfileDialog';
import ScoreboardPanel from './components/ScoreboardPanel';
import WishlistSection from './components/WishlistSection';
import RecommendationsPanel, { recommendationKey } from './components/RecommendationsPanel';
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
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [formPrefill, setFormPrefill] = useState<Partial<BookInput> | null>(null);
  const [pendingWishlistId, setPendingWishlistId] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scoreboard, setScoreboard] = useState<Scoreboard>({ monthly: [], total: [] });
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await db.init();
      // Recommendations are nice-to-have: if the view is missing (e.g. an
      // older database), the journal itself must still work.
      const [bookList, wishlistItems, recs, userProfile, scores] = await Promise.all([
        db.list(),
        db.listWishlist().catch(() => [] as WishlistItem[]),
        db.listRecommendations().catch(() => [] as Recommendation[]),
        db.getProfile().catch(() => null),
        db.getScoreboard().catch(() => ({ monthly: [], total: [] }) as Scoreboard),
      ]);
      setBooks(bookList);
      setWishlist(wishlistItems);
      setRecommendations(recs);
      setProfile(userProfile);
      setScoreboard(scores);
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

  const handleSaveProfile = async (input: Profile) => {
    const saved = await db.saveProfile(input);
    setProfile(saved);
    setProfileDialogOpen(false);
    // Opting in/out or renaming changes the standings.
    setScoreboard(await db.getScoreboard().catch(() => ({ monthly: [], total: [] }) as Scoreboard));
  };

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

  // First login: the journal needs a username before anything else.
  if (authEnabled && user && !loading && !error && !profile) {
    return <ProfileDialog profile={null} firstTime onSave={handleSaveProfile} />;
  }

  const openNewForm = () => {
    setEditingBook(null);
    setFormPrefill(null);
    setPendingWishlistId(null);
    setFormOpen(true);
  };

  const openEditForm = (book: Book) => {
    setEditingBook(book);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingBook(null);
    setFormPrefill(null);
    setPendingWishlistId(null);
  };

  // "Merkitse luetuksi": start a journal entry from a wish-list item. The
  // item is removed from the list once the entry is actually saved.
  const startEntryFromWishlist = (item: WishlistItem) => {
    setEditingBook(null);
    setFormPrefill({ kirjan_nimi: item.kirjan_nimi, kirjoittaja: item.kirjoittaja });
    setPendingWishlistId(item.id);
    setFormOpen(true);
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
      if (pendingWishlistId) {
        await db.removeWishlist(pendingWishlistId);
        setWishlist((prev) => prev.filter((i) => i.id !== pendingWishlistId));
      }
    }
    closeForm();
  };

  const handleAddWishlist = async (input: WishlistInput) => {
    const created = await db.addWishlist(input);
    setWishlist((prev) => [created, ...prev]);
  };

  const handleRemoveWishlist = async (id: string) => {
    await db.removeWishlist(id);
    setWishlist((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddRecommendation = async (rec: Recommendation) => {
    await handleAddWishlist({
      kirjan_nimi: rec.kirjan_nimi,
      kirjoittaja: rec.kirjoittaja,
      huomautus: rec.suosittelu_syy ? `Suositeltu: ”${rec.suosittelu_syy}”` : '',
    });
  };

  // Books already on the wishlist or in the journal: their recommendation
  // cards show "already on your list" instead of an add button.
  const knownKeys = new Set([...wishlist.map(recommendationKey), ...books.map(recommendationKey)]);


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
            {DATA_MODE === 'local' ? 'Paikallinen tila' : 'Oma kirjahylly'}
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
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <button
              onClick={() => setProfileDialogOpen(true)}
              className="font-medium text-sepia-700 transition hover:text-sepia-900 hover:underline"
            >
              {profile ? `👤 ${profile.kayttajanimi}` : '👤 Profiili'}
            </button>
            {authEnabled && user && (
              <>
                <span aria-hidden="true">·</span>
                <span>{user.email}</span>
                <span aria-hidden="true">·</span>
                <button
                  onClick={() => void signOut()}
                  className="font-medium text-sepia-700 transition hover:text-sepia-900 hover:underline"
                >
                  Kirjaudu ulos
                </button>
              </>
            )}
          </div>
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
                <DashboardStats books={books} lukutavoite={profile?.lukutavoite ?? 0} />
                {profile?.nayta_tulostaulu && (
                  <ScoreboardPanel
                    scoreboard={scoreboard}
                    profile={profile}
                    onOpenProfile={() => setProfileDialogOpen(true)}
                  />
                )}
                {profile?.nayta_lukupiirit && <CommunitiesSection />}
                <RecommendationsPanel
                  recommendations={recommendations}
                  existingKeys={knownKeys}
                  onAddToWishlist={handleAddRecommendation}
                />
                <WishlistSection
                  items={wishlist}
                  onAdd={handleAddWishlist}
                  onRemove={handleRemoveWishlist}
                  onStartEntry={startEntryFromWishlist}
                />
                <JournalGrid books={books} onNewEntry={openNewForm} />

                <footer className="grid gap-4 border-t border-ivory-300 pt-8 sm:grid-cols-2">
                  <section
                    aria-label="Varmuuskopio"
                    className="rounded-2xl border border-ivory-300 bg-ivory-50 p-6 shadow-sm"
                  >
                    <h2 className="font-serif text-xl text-ink-900">Varmuuskopio</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      Vie koko päiväkirjasi talteen tiedostona tai palauta se varmuuskopiosta.
                    </p>
                    <div className="mt-4">
                      <BackupControls books={books} onImport={handleImport} />
                    </div>
                  </section>

                  <section
                    aria-label="Palaute"
                    className="rounded-2xl border border-ivory-300 bg-ivory-50 p-6 shadow-sm"
                  >
                    <h2 className="font-serif text-xl text-ink-900">Palaute</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      Löysitkö bugin tai onko sinulla idea uudesta ominaisuudesta?
                    </p>
                    <button
                      onClick={() => setFeedbackOpen(true)}
                      className="mt-4 rounded-full border border-sepia-300 bg-ivory-50 px-5 py-2 text-sm font-medium text-sepia-700 shadow-sm transition hover:border-sepia-500 hover:bg-sepia-100"
                    >
                      💬 Lähetä palautetta
                    </button>
                  </section>
                </footer>
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
        <JournalForm
          book={editingBook}
          initial={formPrefill}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {feedbackOpen && <FeedbackDialog onClose={() => setFeedbackOpen(false)} />}

      {profileDialogOpen && (
        <ProfileDialog
          profile={profile}
          onSave={handleSaveProfile}
          onClose={() => setProfileDialogOpen(false)}
        />
      )}
    </div>
  );
}
