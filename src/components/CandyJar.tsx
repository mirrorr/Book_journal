import { useEffect, useMemo, useRef, useState } from 'react';
import type { Book } from '../types';
import {
  booksToCandies,
  completedJars,
  currentJarCandies,
  jarCandies,
  JAR_CAPACITY,
  type Candy,
  type CandyShape,
} from '../lib/rewards';
import { formatDate } from '../lib/format';
import { playCandyDrop, playJarComplete } from '../lib/sound';
import { useI18n } from '../i18n';

const JARS_SEEN_KEY = 'lukumaku.rewards.jarsSeen.v1';
/** Beyond this the shelf turns into a "+N" chip rather than more glassware. */
const MAX_SHELF_JARS = 12;
/** Must cover the longest celebration keyframe (banner-pop, 4s). */
const CELEBRATION_MS = 4100;

/** Directions for the sweets that fly out of a completed jar. */
const BURST = [
  { x: -46, y: -54, r: -220 },
  { x: -22, y: -74, r: 160 },
  { x: 4, y: -84, r: -140 },
  { x: 30, y: -72, r: 200 },
  { x: 52, y: -50, r: -180 },
  { x: -54, y: -20, r: 240 },
  { x: 58, y: -16, r: -260 },
  { x: -8, y: -92, r: 120 },
];

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** One sweet, drawn into a ~14x14 box so every shape is interchangeable. */
function CandyGlyph({ shape, color }: { shape: CandyShape; color: string }) {
  switch (shape) {
    case 'jelly':
      return (
        <>
          <rect x={-7} y={-5} width={14} height={10} rx={4} fill={color} />
          <rect x={-4} y={-3} width={5} height={2.5} rx={1.2} fill="#fff" opacity={0.35} />
        </>
      );
    case 'lolly':
      return (
        <>
          <rect x={-0.8} y={0} width={1.6} height={8} rx={0.8} fill="var(--color-sepia-300)" />
          <circle cx={0} cy={-2} r={6} fill={color} />
          <circle cx={-2} cy={-4} r={1.6} fill="#fff" opacity={0.4} />
        </>
      );
    case 'stick':
      return (
        <>
          <rect x={-7} y={-3.5} width={14} height={7} rx={3.5} fill={color} />
          <rect x={-7} y={-1} width={14} height={1.6} fill="#fff" opacity={0.3} />
        </>
      );
    case 'drop':
    default:
      return (
        <>
          <circle cx={0} cy={0} r={6} fill={color} />
          <circle cx={-2} cy={-2.2} r={1.8} fill="#fff" opacity={0.4} />
        </>
      );
  }
}

/** Mini pile layout for the small jars on the shelf. */
const SHELF_SLOTS = [
  { x: 11, y: 41 },
  { x: 18, y: 41 },
  { x: 25, y: 41 },
  { x: 31, y: 41 },
  { x: 14, y: 34 },
  { x: 21, y: 34 },
  { x: 28, y: 34 },
  { x: 17, y: 27 },
  { x: 24, y: 27 },
  { x: 20, y: 21 },
];

/** A completed jar on the shelf: real candy colours, opens to show its books. */
function ShelfJar({
  index,
  candies,
  onOpen,
}: {
  index: number;
  candies: Candy[];
  onOpen: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onOpen}
      title={t.rewards.jarNumber(index + 1)}
      className="rounded-lg transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sepia-500"
    >
      <svg viewBox="0 0 40 52" className="h-14 w-auto" role="img" aria-label={t.rewards.openJar(index + 1)}>
        <rect x={4} y={14} width={32} height={34} rx={6} fill="var(--color-glass)" opacity={0.5} />
        {candies.map((candy, i) => (
          <circle key={candy.bookId} cx={SHELF_SLOTS[i].x} cy={SHELF_SLOTS[i].y} r={3.2} fill={candy.color} />
        ))}
        <rect
          x={4}
          y={14}
          width={32}
          height={34}
          rx={6}
          fill="none"
          stroke="var(--color-glass-rim)"
          strokeWidth={2}
        />
        <rect x={2} y={8} width={36} height={7} rx={3.5} fill="var(--color-sepia-700)" />
      </svg>
    </button>
  );
}

/** Dialog listing the books that filled one jar. */
function JarContents({
  index,
  candies,
  onClose,
}: {
  index: number;
  candies: Candy[];
  onClose: () => void;
}) {
  const { t, locale } = useI18n();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-sepia-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t.rewards.jarNumber(index + 1)}
    >
      <div
        className="animate-rise max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-ivory-300 bg-ivory-50 p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif text-3xl text-ink-900">{t.rewards.jarNumber(index + 1)}</h2>
            <p className="mt-1 text-sm text-zinc-500">{t.rewards.jarContentsHint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="rounded-full p-2 text-zinc-500 transition hover:bg-ivory-200 hover:text-zinc-800"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <ol className="mt-6 divide-y divide-ivory-300">
          {candies.map((candy) => (
            <li key={candy.bookId} className="flex items-center gap-3 py-2.5">
              <svg viewBox="-10 -10 20 20" className="h-7 w-7 shrink-0" aria-hidden="true">
                <CandyGlyph shape={candy.shape} color={candy.color} />
              </svg>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-serif text-lg text-ink-900">{candy.title}</span>
                <span className="block truncate text-sm text-zinc-500">{candy.author}</span>
              </span>
              <span className="shrink-0 text-xs text-zinc-400">
                {formatDate(candy.date, locale)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

interface CandyJarProps {
  books: Book[];
  /** Rendered in the card header, e.g. the sound toggle. */
  headerAction?: React.ReactNode;
}

export default function CandyJar({ books, headerAction }: CandyJarProps) {
  const { t } = useI18n();
  const candies = useMemo(() => booksToCandies(books), [books]);
  const jars = completedJars(books.length);
  const inJar = currentJarCandies(candies);

  const [selected, setSelected] = useState<Candy | null>(null);
  const [openJar, setOpenJar] = useState<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  // Sweets already on screen when this mounted; only later arrivals get a
  // sound, so opening the page doesn't replay the whole cascade.
  const knownCandies = useRef<number | null>(null);

  // Fire once per newly completed jar. Keyed on the jar count (a number), not
  // on `books` — App refetches books on mount, which would replay every time.
  useEffect(() => {
    const stored = Number(localStorage.getItem(JARS_SEEN_KEY) ?? '0') || 0;
    if (jars > stored) {
      localStorage.setItem(JARS_SEEN_KEY, String(jars));
      playJarComplete();
      if (!prefersReducedMotion()) setCelebrating(true);
    } else if (jars < stored) {
      // Entries were deleted: re-arm so a future refill can celebrate again.
      localStorage.setItem(JARS_SEEN_KEY, String(jars));
    }
  }, [jars]);

  // Plink for each newly added sweet, staggered to match the drop animation.
  useEffect(() => {
    const total = candies.length;
    const previous = knownCandies.current;
    knownCandies.current = total;
    if (previous === null || total <= previous) return;
    const added = Math.min(total - previous, JAR_CAPACITY);
    const timers = Array.from({ length: added }, (_, i) =>
      window.setTimeout(() => playCandyDrop(previous + i), i * 110 + 260)
    );
    return () => timers.forEach(window.clearTimeout);
  }, [candies.length]);

  // The timer owns its own effect so its cleanup can never cancel a
  // celebration that is still running: if `celebrating` is still true after a
  // re-run (StrictMode's double mount, or `jars` changing mid-animation) a
  // fresh timer is started, instead of the sparkle sticking forever.
  useEffect(() => {
    if (!celebrating) return;
    const id = window.setTimeout(() => setCelebrating(false), CELEBRATION_MS);
    return () => window.clearTimeout(id);
  }, [celebrating]);

  const shelfJars = Math.min(jars, MAX_SHELF_JARS);
  const overflow = jars - shelfJars;

  return (
    <section
      aria-label={t.rewards.jarAriaLabel}
      className="rounded-2xl border border-ivory-300 bg-ivory-50 p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-ink-900">{t.rewards.title}</h2>
          <p className="text-sm text-zinc-500">{t.rewards.subtitle}</p>
        </div>
        {headerAction}
      </div>

      {/* Jar beside its stats, so the whole thing fits above the fold and the
          wide desktop layout isn't wasted on empty margins. */}
      <div className="mt-4 grid items-center gap-6 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center">
        <svg
          viewBox="0 0 120 160"
          preserveAspectRatio="xMidYMid meet"
          className={`h-48 w-auto sm:h-56 ${celebrating ? 'animate-jar-to-shelf' : ''}`}
          role="img"
          aria-label={t.rewards.jarProgress(inJar.length, JAR_CAPACITY)}
        >
          {/* lid */}
          <rect
            x={10}
            y={26}
            width={100}
            height={16}
            rx={8}
            fill="var(--color-sepia-700)"
            className={`jar-lid ${celebrating ? 'animate-lid-pop' : ''}`}
          />
          {/* jar glass */}
          <rect x={14} y={44} width={92} height={100} rx={14} fill="var(--color-glass)" opacity={0.5} />

          {/* Three nested groups on purpose: the outer one positions the candy
              with an SVG transform attribute, the middle one runs the CSS drop
              animation (a CSS transform would otherwise replace the attribute
              and dump every sweet at the origin), the inner one tilts it. */}
          {inJar.map((candy, index) => (
            <g key={candy.bookId} transform={`translate(${candy.x} ${candy.y})`}>
              <g
                className="candy-piece animate-candy-drop"
                style={{ animationDelay: `${Math.min(index, 9) * 90}ms` }}
              >
                <g
                  transform={`rotate(${candy.rotate})`}
                  className="cursor-pointer focus:outline-none"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelected(candy);
                    playCandyDrop(index);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(candy);
                      playCandyDrop(index);
                    }
                  }}
                >
                  <title>{t.rewards.candyLabel(candy.title, candy.author)}</title>
                  <CandyGlyph shape={candy.shape} color={candy.color} />
                </g>
              </g>
            </g>
          ))}

          {/* glass drawn over the sweets so they sit behind it */}
          <rect
            x={14}
            y={44}
            width={92}
            height={100}
            rx={14}
            fill="none"
            stroke="var(--color-glass-rim)"
            strokeWidth={2.5}
          />
          <rect x={22} y={54} width={7} height={72} rx={3.5} fill="#fff" opacity={0.45} />

          {celebrating && (
            <g aria-hidden="true">
              {/* shockwave ring from the mouth of the jar */}
              <g transform="translate(60 60)">
                <circle
                  className="pulse-ring animate-ring-pulse"
                  r={30}
                  fill="none"
                  stroke="var(--color-candy-lemon)"
                  strokeWidth={3}
                />
              </g>

              {/* sweets flying out */}
              {BURST.map((dir, i) => (
                <g key={i} transform="translate(60 58)">
                  <g
                    className="burst-piece animate-candy-burst"
                    style={
                      {
                        '--burst-x': `${dir.x}px`,
                        '--burst-y': `${dir.y}px`,
                        '--burst-r': `${dir.r}deg`,
                        animationDelay: `${i * 45}ms`,
                      } as React.CSSProperties
                    }
                  >
                    <CandyGlyph
                      shape={(['drop', 'jelly', 'lolly', 'stick'] as const)[i % 4]}
                      color={
                        [
                          'var(--color-candy-raspberry)',
                          'var(--color-candy-pistachio)',
                          'var(--color-candy-lemon)',
                          'var(--color-candy-blueberry)',
                        ][i % 4]
                      }
                    />
                  </g>
                </g>
              ))}

              {/* twinkles */}
              <g className="sparkle animate-sparkle">
                {[
                  [60, 16],
                  [26, 32],
                  [94, 32],
                  [14, 62],
                  [106, 62],
                  [38, 18],
                  [82, 18],
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r={i % 2 ? 3 : 5} fill="var(--color-candy-lemon)" />
                ))}
              </g>
            </g>
          )}
        </svg>

          {celebrating && (
            <p
              className="animate-banner-pop mt-3 rounded-full bg-sepia-700 px-6 py-2.5 text-center font-serif text-xl text-ivory-50 shadow-lg sm:text-2xl"
              role="status"
            >
              {t.rewards.celebration}
            </p>
          )}
        </div>

        {/* Progress and history */}
        <div className="min-w-0">
          <p className="font-serif text-2xl text-ink-900">
            {t.rewards.jarProgress(inJar.length, JAR_CAPACITY)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {inJar.length === 0
              ? t.rewards.jarEmpty
              : t.rewards.toGo(JAR_CAPACITY - inJar.length)}
          </p>

          {/* Caption instead of a hover tooltip, so it works on touch too. */}
          <p className="mt-2 min-h-5 text-sm" aria-live="polite">
            {selected ? (
              <span className="font-medium text-sepia-700">
                {t.rewards.candyLabel(selected.title, selected.author)}
              </span>
            ) : (
              inJar.length > 0 && <span className="text-zinc-400">{t.rewards.candyHint}</span>
            )}
          </p>

          <div className="mt-5 border-t border-ivory-300 pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-sepia-500">
              {t.rewards.shelfAriaLabel}
            </p>
            {jars === 0 ? (
              <p className="mt-2 text-sm text-zinc-400">{t.rewards.shelfEmpty}</p>
            ) : (
              <>
                <div className="mt-2 flex flex-wrap items-end gap-2 border-b-4 border-sepia-300 pb-2">
                  {Array.from({ length: shelfJars }, (_, i) => (
                    <ShelfJar
                      key={i}
                      index={i}
                      candies={jarCandies(candies, i)}
                      onOpen={() => setOpenJar(i)}
                    />
                  ))}
                  {overflow > 0 && (
                    <span className="mb-1 rounded-full bg-sepia-100 px-3 py-1 text-xs font-medium text-sepia-700">
                      {t.rewards.andMore(overflow)}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-sepia-700">{t.rewards.jarsFull(jars)}</p>
                <p className="text-xs text-zinc-400">{t.rewards.shelfHint}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {openJar !== null && (
        <JarContents
          index={openJar}
          candies={jarCandies(candies, openJar)}
          onClose={() => setOpenJar(null)}
        />
      )}
    </section>
  );
}
