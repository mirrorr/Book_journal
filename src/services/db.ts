import type { Book, BookInput } from '../types';
import { SEED_BOOKS } from '../data/seed';
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
}

/* ------------------------------------------------------------------ */
/* Local mode: LocalStorage with mocked network latency               */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'lukupaivakirja.books.v1';
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
}

/* ------------------------------------------------------------------ */
/* Factory: pick the adapter once, from VITE_DATA_MODE                */
/* ------------------------------------------------------------------ */

export type DataMode = 'local' | 'supabase';

export const DATA_MODE: DataMode =
  import.meta.env.VITE_DATA_MODE === 'supabase' ? 'supabase' : 'local';

export const db: DbAdapter =
  DATA_MODE === 'supabase' ? new SupabaseAdapter() : new LocalStorageAdapter();
