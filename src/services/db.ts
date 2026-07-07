import type {
  Book,
  BookInput,
  FeedbackInput,
  Profile,
  Recommendation,
  Scoreboard,
  ScoreRow,
  WishlistInput,
  WishlistItem,
} from '../types';
import { MOCK_RECOMMENDATIONS, MOCK_SCOREBOARD, SEED_BOOKS } from '../data/seed';
import { getSupabaseClient } from '../lib/supabaseClient';

/**
 * Decoupled data-layer contract. The rest of the app only ever imports the
 * `db` singleton below and never knows which backend is in use.
 */
export interface DbAdapter {
  /** One-time setup (e.g. seeding demo data in local mode). */
  init(): Promise<void>;
  list(): Promise<Book[]>;
  get(id: string): Promise<Book | null>;
  create(input: BookInput): Promise<Book>;
  update(id: string, input: BookInput): Promise<Book>;
  remove(id: string): Promise<void>;
  /** Lukulista: books the user wants to read later. */
  listWishlist(): Promise<WishlistItem[]>;
  addWishlist(input: WishlistInput): Promise<WishlistItem>;
  removeWishlist(id: string): Promise<void>;
  /** Safe-field recommendations from other users (mock data in local mode). */
  listRecommendations(): Promise<Recommendation[]>;
  /** Submit a bug report or improvement idea. */
  submitFeedback(input: FeedbackInput): Promise<void>;
  /** The user's profile, or null if not created yet. */
  getProfile(): Promise<Profile | null>;
  saveProfile(input: Profile): Promise<Profile>;
  /** Monthly and all-time standings of users who opted in. */
  getScoreboard(): Promise<Scoreboard>;
}

/* ------------------------------------------------------------------ */
/* Local mode: LocalStorage with mocked network latency               */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'lukupaivakirja.books.v1';
const WISHLIST_KEY = 'lukupaivakirja.wishlist.v1';
const FEEDBACK_KEY = 'lukupaivakirja.feedback.v1';
const PROFILE_KEY = 'lukupaivakirja.profile.v1';
const MOCK_LATENCY_MS = 350;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class LocalStorageAdapter implements DbAdapter {
  private read(): Book[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as Book[];
    } catch {
      return [];
    }
  }

  private write(books: Book[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  }

  async init(): Promise<void> {
    if (localStorage.getItem(STORAGE_KEY) !== null) return;
    const seeded: Book[] = SEED_BOOKS.map((input, i) => ({
      ...input,
      id: crypto.randomUUID(),
      created_at: new Date(Date.now() - i * 1000).toISOString(),
    }));
    this.write(seeded);
  }

  async list(): Promise<Book[]> {
    await delay(MOCK_LATENCY_MS);
    return [...this.read()].sort((a, b) =>
      b.valmistumispaiva.localeCompare(a.valmistumispaiva)
    );
  }

  async get(id: string): Promise<Book | null> {
    await delay(MOCK_LATENCY_MS);
    return this.read().find((b) => b.id === id) ?? null;
  }

  async create(input: BookInput): Promise<Book> {
    await delay(MOCK_LATENCY_MS);
    const book: Book = {
      ...input,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.write([book, ...this.read()]);
    return book;
  }

  async update(id: string, input: BookInput): Promise<Book> {
    await delay(MOCK_LATENCY_MS);
    const books = this.read();
    const index = books.findIndex((b) => b.id === id);
    if (index === -1) throw new Error(`Merkintää ${id} ei löytynyt.`);
    const updated: Book = { ...books[index], ...input };
    books[index] = updated;
    this.write(books);
    return updated;
  }

  async remove(id: string): Promise<void> {
    await delay(MOCK_LATENCY_MS);
    this.write(this.read().filter((b) => b.id !== id));
  }

  private readWishlist(): WishlistItem[] {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as WishlistItem[];
    } catch {
      return [];
    }
  }

  private writeWishlist(items: WishlistItem[]): void {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  }

  async listWishlist(): Promise<WishlistItem[]> {
    await delay(MOCK_LATENCY_MS);
    return [...this.readWishlist()].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    );
  }

  async addWishlist(input: WishlistInput): Promise<WishlistItem> {
    await delay(MOCK_LATENCY_MS);
    const item: WishlistItem = {
      ...input,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.writeWishlist([item, ...this.readWishlist()]);
    return item;
  }

  async removeWishlist(id: string): Promise<void> {
    await delay(MOCK_LATENCY_MS);
    this.writeWishlist(this.readWishlist().filter((i) => i.id !== id));
  }

  async listRecommendations(): Promise<Recommendation[]> {
    await delay(MOCK_LATENCY_MS);
    return MOCK_RECOMMENDATIONS;
  }

  async submitFeedback(input: FeedbackInput): Promise<void> {
    await delay(MOCK_LATENCY_MS);
    const raw = localStorage.getItem(FEEDBACK_KEY);
    let existing: unknown[] = [];
    try {
      existing = raw ? (JSON.parse(raw) as unknown[]) : [];
    } catch {
      existing = [];
    }
    existing.push({ ...input, created_at: new Date().toISOString() });
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(existing));
  }

  async getProfile(): Promise<Profile | null> {
    await delay(MOCK_LATENCY_MS);
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Profile;
    } catch {
      return null;
    }
  }

  async saveProfile(input: Profile): Promise<Profile> {
    await delay(MOCK_LATENCY_MS);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(input));
    return input;
  }

  async getScoreboard(): Promise<Scoreboard> {
    await delay(MOCK_LATENCY_MS);
    const monthly: ScoreRow[] = MOCK_SCOREBOARD.monthly.map((r) => ({ ...r }));
    const total: ScoreRow[] = MOCK_SCOREBOARD.total.map((r) => ({ ...r }));

    // In local mode there are no other users, so merge the local reader into
    // the demo standings when they have opted in.
    const raw = localStorage.getItem(PROFILE_KEY);
    const profile = raw ? (JSON.parse(raw) as Profile) : null;
    if (profile?.public_profile) {
      const books = this.read();
      const monthKey = new Date().toISOString().slice(0, 7);
      monthly.push({
        kayttajanimi: profile.kayttajanimi,
        kirjat: books.filter((b) => b.valmistumispaiva.startsWith(monthKey)).length,
      });
      total.push({ kayttajanimi: profile.kayttajanimi, kirjat: books.length });
    }

    const top = (rows: ScoreRow[]) =>
      rows.sort((a, b) => b.kirjat - a.kirjat).slice(0, 10);
    return { monthly: top(monthly), total: top(total) };
  }
}

/* ------------------------------------------------------------------ */
/* Supabase mode: real CRUD against the `books` table                 */
/* ------------------------------------------------------------------ */

class SupabaseAdapter implements DbAdapter {
  private get table() {
    return getSupabaseClient().from('books');
  }

  // No seeding in Supabase mode: new users start with an empty journal.
  // (Seeding here would also race when several auth events trigger
  // concurrent init() calls right after login.)
  async init(): Promise<void> {}

  async list(): Promise<Book[]> {
    const { data, error } = await this.table
      .select('*')
      .order('valmistumispaiva', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Book[];
  }

  async get(id: string): Promise<Book | null> {
    const { data, error } = await this.table.select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Book) ?? null;
  }

  async create(input: BookInput): Promise<Book> {
    const { data, error } = await this.table.insert(input).select().single();
    if (error) throw new Error(error.message);
    return data as Book;
  }

  async update(id: string, input: BookInput): Promise<Book> {
    const { data, error } = await this.table
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Book;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.table.delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  private get wishlistTable() {
    return getSupabaseClient().from('wishlist');
  }

  async listWishlist(): Promise<WishlistItem[]> {
    const { data, error } = await this.wishlistTable
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as WishlistItem[];
  }

  async addWishlist(input: WishlistInput): Promise<WishlistItem> {
    const { data, error } = await this.wishlistTable.insert(input).select().single();
    if (error) throw new Error(error.message);
    return data as WishlistItem;
  }

  async removeWishlist(id: string): Promise<void> {
    const { error } = await this.wishlistTable.delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async listRecommendations(): Promise<Recommendation[]> {
    // The `recommendations` view exposes only safe columns of entries other
    // users marked as recommended — never their private notes.
    const { data, error } = await getSupabaseClient()
      .from('recommendations')
      .select('kirjan_nimi, kirjoittaja, arvio, suosittelu_syy, kansikuva_url')
      .order('created_at', { ascending: false })
      .limit(12);
    if (error) throw new Error(error.message);
    return (data ?? []) as Recommendation[];
  }

  async submitFeedback(input: FeedbackInput): Promise<void> {
    const { error } = await getSupabaseClient().from('feedback').insert(input);
    if (error) throw new Error(error.message);
  }

  async getProfile(): Promise<Profile | null> {
    const { data, error } = await getSupabaseClient()
      .from('profiles')
      .select('kayttajanimi, public_profile, lukutavoite')
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Profile) ?? null;
  }

  async saveProfile(input: Profile): Promise<Profile> {
    const client = getSupabaseClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new Error('Ei kirjautunutta käyttäjää.');
    const { data, error } = await client
      .from('profiles')
      .upsert({ user_id: user.id, ...input }, { onConflict: 'user_id' })
      .select('kayttajanimi, public_profile, lukutavoite')
      .single();
    if (error) {
      throw new Error(
        error.code === '23505' ? 'Käyttäjänimi on jo varattu.' : error.message
      );
    }
    return data as Profile;
  }

  async getScoreboard(): Promise<Scoreboard> {
    const client = getSupabaseClient();
    const [monthly, total] = await Promise.all([
      client
        .from('scoreboard_monthly')
        .select('kayttajanimi, kirjat')
        .order('kirjat', { ascending: false })
        .limit(10),
      client
        .from('scoreboard_total')
        .select('kayttajanimi, kirjat')
        .order('kirjat', { ascending: false })
        .limit(10),
    ]);
    if (monthly.error) throw new Error(monthly.error.message);
    if (total.error) throw new Error(total.error.message);
    return {
      monthly: (monthly.data ?? []) as ScoreRow[],
      total: (total.data ?? []) as ScoreRow[],
    };
  }
}

/* ------------------------------------------------------------------ */
/* Factory: pick the adapter once, from VITE_DATA_MODE                */
/* ------------------------------------------------------------------ */

export type DataMode = 'local' | 'supabase';

export const DATA_MODE: DataMode =
  import.meta.env.VITE_DATA_MODE === 'supabase' ? 'supabase' : 'local';

export const db: DbAdapter =
  DATA_MODE === 'supabase' ? new SupabaseAdapter() : new LocalStorageAdapter();
