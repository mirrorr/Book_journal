import type { Book } from '../types';

/* ------------------------------------------------------------------ */
/* Candy derivation                                                    */
/* ------------------------------------------------------------------ */

export const JAR_CAPACITY = 10;

export type CandyShape = 'drop' | 'jelly' | 'lolly' | 'stick';

export interface Candy {
  bookId: string;
  title: string;
  author: string;
  /** Finish date (ISO), shown when browsing a jar's contents. */
  date: string;
  /** CSS custom property name of the candy colour. */
  color: string;
  shape: CandyShape;
  /** Position in jar-local SVG units. */
  x: number;
  y: number;
  rotate: number;
}

/**
 * FNV-1a 32-bit. Small, dependency-free, and well distributed on the short
 * strings we hash (ids and titles).
 */
function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Rating 0–5 to candy colour. Index 0 is the "no rating" cream sweet. */
const CANDY_COLORS = [
  'var(--color-candy-cream)',
  'var(--color-candy-plum)',
  'var(--color-candy-blueberry)',
  'var(--color-candy-lemon)',
  'var(--color-candy-pistachio)',
  'var(--color-candy-raspberry)',
];

const SHAPES: CandyShape[] = ['drop', 'jelly', 'lolly', 'stick'];

/**
 * Slot centres for one jar, bottom-heavy so the sweets read as a pile.
 * Rows from the bottom up hold 4, 3, 2 and 1 candies (10 total).
 * Coordinates are in the jar's local SVG units (see CandyJar's viewBox).
 */
const SLOTS: { x: number; y: number }[] = [
  // bottom row of 4
  { x: 26, y: 128 },
  { x: 48, y: 130 },
  { x: 70, y: 130 },
  { x: 92, y: 128 },
  // row of 3
  { x: 37, y: 108 },
  { x: 59, y: 110 },
  { x: 81, y: 108 },
  // row of 2
  { x: 48, y: 89 },
  { x: 70, y: 89 },
  // top
  { x: 59, y: 70 },
];

/**
 * Turn finished books into candies. Sorted oldest-first so candy N is always
 * the Nth book finished — stable across reloads and unaffected by later edits.
 * Sorts a copy: the caller's array is kept in its own (newest-first) order.
 */
export function booksToCandies(books: Book[]): Candy[] {
  return [...books]
    .sort((a, b) => a.valmistumispaiva.localeCompare(b.valmistumispaiva))
    .map((book, index) => {
      const h = hash32(book.id || `${book.kirjan_nimi}|${book.kirjoittaja}`);
      const slot = SLOTS[index % JAR_CAPACITY];
      const rating = Math.max(0, Math.min(5, Math.round(book.arvio)));
      // Separate bit slices per trait, so shape and position stay uncorrelated.
      return {
        bookId: book.id,
        title: book.kirjan_nimi,
        author: book.kirjoittaja,
        date: book.valmistumispaiva,
        color: CANDY_COLORS[rating],
        shape: SHAPES[h & 3],
        x: slot.x + (((h >>> 8) & 0xff) / 255 - 0.5) * 5,
        y: slot.y + (((h >>> 24) & 0xff) / 255 - 0.5) * 3,
        rotate: (((h >>> 16) & 0xff) / 255 - 0.5) * 50,
      };
    });
}

/** How many jars have been filled and moved to the shelf. */
export const completedJars = (bookCount: number) =>
  Math.floor(bookCount / JAR_CAPACITY);

/** The candies in the jar currently being filled (0–9 of them). */
export const currentJarCandies = (candies: Candy[]) =>
  candies.slice(completedJars(candies.length) * JAR_CAPACITY);

/** The 10 candies inside a completed jar, so its contents can be browsed. */
export const jarCandies = (candies: Candy[], jarIndex: number) =>
  candies.slice(jarIndex * JAR_CAPACITY, (jarIndex + 1) * JAR_CAPACITY);

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

export type BadgeId =
  | 'first'
  | 'five'
  | 'ten'
  | 'twentyFive'
  | 'fifty'
  | 'perfect'
  | 'honest'
  | 'quotes'
  | 'thinker'
  | 'loyal'
  | 'busyMonth'
  | 'streak3';

export interface BadgeDef {
  id: BadgeId;
  /** Candy shape drawn for the badge. */
  icon: CandyShape;
  /** Colour token, so the badge shelf looks like a box of sweets. */
  color: string;
  test: (stats: BookStats) => boolean;
}

/** Aggregates computed in one pass so badge evaluation stays O(n). */
interface BookStats {
  books: Book[];
  count: number;
  /** Books finished per "YYYY-MM" bucket. */
  perMonth: Map<string, number>;
  /** Books per author, lowercased. */
  perAuthor: Map<string, number>;
  quoteCount: number;
  longestStreak: number;
}

/**
 * Longest run of consecutive months containing at least one finished book.
 * Uses month-index arithmetic (year*12 + month) on the "YYYY-MM" prefix —
 * valmistumispaiva is a plain ISO string and must never go through `new Date()`
 * here, which would reintroduce timezone bugs.
 */
export function longestMonthStreak(books: Book[]): number {
  const months = [
    ...new Set(
      books
        .map((b) => b.valmistumispaiva.slice(0, 7))
        .filter((key) => /^\d{4}-\d{2}$/.test(key))
    ),
  ]
    .map((key) => Number(key.slice(0, 4)) * 12 + Number(key.slice(5, 7)) - 1)
    .sort((a, b) => a - b);

  let best = 0;
  let run = 0;
  for (let i = 0; i < months.length; i++) {
    run = i > 0 && months[i] === months[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

function buildStats(books: Book[]): BookStats {
  const perMonth = new Map<string, number>();
  const perAuthor = new Map<string, number>();
  let quoteCount = 0;

  for (const book of books) {
    const month = book.valmistumispaiva.slice(0, 7);
    perMonth.set(month, (perMonth.get(month) ?? 0) + 1);

    const author = book.kirjoittaja.trim().toLocaleLowerCase('fi');
    if (author) perAuthor.set(author, (perAuthor.get(author) ?? 0) + 1);

    if (book.lempilainaus.trim()) quoteCount++;
  }

  return {
    books,
    count: books.length,
    perMonth,
    perAuthor,
    quoteCount,
    longestStreak: longestMonthStreak(books),
  };
}

const maxOf = (counts: Map<string, number>) => Math.max(0, ...counts.values());

/**
 * Badge definitions. Titles and descriptions live in the dictionaries and are
 * looked up by id, so this module stays free of user-facing text.
 */
export const BADGES: BadgeDef[] = [
  // Milestones
  { id: 'first', icon: 'drop', color: 'var(--color-candy-raspberry)', test: (s) => s.count >= 1 },
  { id: 'five', icon: 'jelly', color: 'var(--color-candy-pistachio)', test: (s) => s.count >= 5 },
  { id: 'ten', icon: 'lolly', color: 'var(--color-candy-lemon)', test: (s) => s.count >= 10 },
  { id: 'twentyFive', icon: 'stick', color: 'var(--color-candy-blueberry)', test: (s) => s.count >= 25 },
  { id: 'fifty', icon: 'lolly', color: 'var(--color-candy-plum)', test: (s) => s.count >= 50 },

  // Habits worth rewarding, not just volume
  {
    id: 'perfect',
    icon: 'drop',
    color: 'var(--color-candy-lemon)',
    test: (s) => s.books.some((b) => b.arvio >= 5),
  },
  {
    id: 'honest',
    icon: 'jelly',
    color: 'var(--color-candy-plum)',
    test: (s) => s.books.some((b) => !b.suosittelen),
  },
  {
    id: 'quotes',
    icon: 'stick',
    color: 'var(--color-candy-raspberry)',
    test: (s) => s.quoteCount >= 5,
  },
  {
    id: 'thinker',
    icon: 'drop',
    color: 'var(--color-candy-blueberry)',
    test: (s) => s.books.some((b) => b.omat_ajatukset.trim().length >= 200),
  },
  {
    id: 'loyal',
    icon: 'jelly',
    color: 'var(--color-candy-raspberry)',
    test: (s) => maxOf(s.perAuthor) >= 3,
  },
  {
    id: 'busyMonth',
    icon: 'lolly',
    color: 'var(--color-candy-pistachio)',
    test: (s) => maxOf(s.perMonth) >= 4,
  },
  {
    id: 'streak3',
    icon: 'stick',
    color: 'var(--color-candy-lemon)',
    test: (s) => s.longestStreak >= 3,
  },
];

export interface BadgeState extends BadgeDef {
  unlocked: boolean;
}

/**
 * Evaluate every badge from a single pass over the books.
 *
 * `resetAt` is an ISO timestamp: when set, only entries created after it
 * count, so the collection can be started over. Compared lexicographically,
 * which is valid for ISO strings.
 */
export function evaluateBadges(books: Book[], resetAt?: string | null): BadgeState[] {
  const scoped = resetAt ? books.filter((b) => b.created_at > resetAt) : books;
  const stats = buildStats(scoped);
  return BADGES.map((badge) => ({ ...badge, unlocked: badge.test(stats) }));
}
